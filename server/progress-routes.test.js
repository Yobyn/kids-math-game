const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Set before the server is required: it reads all three at load time, and a
// test must never be able to touch a real accounts or progress file.
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'progress-routes-'));
process.env.JWT_SECRET = 'test-secret-not-a-real-one';
process.env.ACCOUNTS_FILE = path.join(directory, 'accounts.json');
process.env.PROGRESS_FILE = path.join(directory, 'progress.json');

const { app } = require('./server');
const { signToken, verifyToken } = require('./token');

/** Starts the app on a port the operating system picks, for one test. */
async function serving(run) {
  const server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await run(base);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

/** Makes an account the way registering does, and returns its token. */
async function accountToken(base, username) {
  const response = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'a-long-enough-password' })
  });
  assert.strictEqual(response.status, 201, `could not register ${username}`);
  return (await response.json()).token;
}

/** Pushes progress as this account. */
function put(base, token, progress) {
  return fetch(`${base}/api/progress`, asUser(token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ progress })
  }));
}

function asUser(token, extra = {}) {
  return { ...extra, headers: { Authorization: `Bearer ${token}`, ...(extra.headers || {}) } };
}

test('an account keeps its progress across devices', async () => {
  await serving(async base => {
    const token = await accountToken(base, 'ada');

    // The first device pushes
    const pushed = await fetch(`${base}/api/progress`, asUser(token, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progress: { xp: 240, keepsakes: [{ id: 'acorn' }] } })
    }));
    assert.strictEqual(pushed.status, 200);

    // The second device, which has never seen any of it, pulls
    const pulled = await fetch(`${base}/api/progress`, asUser(token));
    const body = await pulled.json();
    assert.strictEqual(body.progress.xp, 240);
    assert.deepStrictEqual(body.progress.keepsakes, [{ id: 'acorn' }]);
    assert.ok(body.updatedAt, 'says when it was written');
  });
});

test('a new account has nothing, and says so plainly', async () => {
  await serving(async base => {
    const token = await accountToken(base, 'grace');

    const response = await fetch(`${base}/api/progress`, asUser(token));
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(await response.json(), { progress: null, updatedAt: null });
  });
});

test('no token reads, writes or deletes anything', async () => {
  await serving(async base => {
    for (const method of ['GET', 'PUT', 'DELETE']) {
      const response = await fetch(`${base}/api/progress`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method === 'PUT' ? JSON.stringify({ progress: { xp: 1 } }) : undefined
      });
      assert.strictEqual(response.status, 401, `${method} without a token`);
    }
  });
});

test('a forged token reads nothing', async () => {
  await serving(async base => {
    const forged = await signToken({ userId: 1 }, 'a-different-secret');

    const response = await fetch(`${base}/api/progress`, asUser(forged));
    assert.strictEqual(response.status, 403);
  });
});

test('one child never reads another child, which is the whole risk here', async () => {
  await serving(async base => {
    const mine = await accountToken(base, 'rosalind');
    const theirs = await accountToken(base, 'dorothy');

    await fetch(`${base}/api/progress`, asUser(mine, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progress: { xp: 240 } })
    }));

    const pulled = await fetch(`${base}/api/progress`, asUser(theirs));
    assert.strictEqual((await pulled.json()).progress, null);
  });
});

test('asking for somebody else is not a thing the API can express', async () => {
  // The id comes from the token, so naming one anywhere else must do nothing.
  // This is the test that matters: a child's real account id is a small
  // number, so guessing somebody else's is trivial if the server will listen.
  await serving(async base => {
    const mine = await accountToken(base, 'katherine');
    const theirs = await accountToken(base, 'mary');
    const theirId = (await verifyToken(theirs, process.env.JWT_SECRET)).userId;

    await put(base, theirs, { xp: 5 });

    // Naming their id in the body must not write over their progress
    await fetch(`${base}/api/progress`, asUser(mine, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: theirId, progress: { xp: 240 } })
    }));
    const afterWrite = await fetch(`${base}/api/progress`, asUser(theirs));
    assert.strictEqual((await afterWrite.json()).progress.xp, 5, 'untouched');

    // Naming their id in the query string must not read their progress
    for (const query of [`?userId=${theirId}`, `?id=${theirId}`]) {
      const pulled = await fetch(`${base}/api/progress${query}`, asUser(mine));
      const body = await pulled.json();
      assert.notStrictEqual(body.progress && body.progress.xp, 5, `read via ${query}`);
    }

    // Nor delete it
    await fetch(`${base}/api/progress?userId=${theirId}`, asUser(mine, { method: 'DELETE' }));
    const afterDelete = await fetch(`${base}/api/progress`, asUser(theirs));
    assert.strictEqual((await afterDelete.json()).progress.xp, 5, 'still there');
  });
});

test('a payload the server cannot use is a 400, not a 500', async () => {
  await serving(async base => {
    const token = await accountToken(base, 'hedy');

    for (const progress of ['xp=240', 42, [1, 2], null]) {
      const response = await fetch(`${base}/api/progress`, asUser(token, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress })
      }));
      assert.strictEqual(response.status, 400, `progress: ${JSON.stringify(progress)}`);
    }

    const after = await fetch(`${base}/api/progress`, asUser(token));
    assert.strictEqual((await after.json()).progress, null, 'nothing was written');
  });
});

test('an adult can delete the server copy, and it stays deleted', async () => {
  await serving(async base => {
    const token = await accountToken(base, 'lise');
    await fetch(`${base}/api/progress`, asUser(token, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progress: { xp: 240 } })
    }));

    const first = await fetch(`${base}/api/progress`, asUser(token, { method: 'DELETE' }));
    assert.deepStrictEqual(await first.json(), { deleted: true });

    const pulled = await fetch(`${base}/api/progress`, asUser(token));
    assert.strictEqual((await pulled.json()).progress, null);

    const again = await fetch(`${base}/api/progress`, asUser(token, { method: 'DELETE' }));
    assert.deepStrictEqual(await again.json(), { deleted: false });
  });
});

test('deleting one account does not delete anybody else', async () => {
  await serving(async base => {
    const mine = await accountToken(base, 'chien');
    const theirs = await accountToken(base, 'barbara');
    for (const token of [mine, theirs]) {
      await fetch(`${base}/api/progress`, asUser(token, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress: { xp: 7 } })
      }));
    }

    await fetch(`${base}/api/progress`, asUser(mine, { method: 'DELETE' }));

    const theirsAfter = await fetch(`${base}/api/progress`, asUser(theirs));
    assert.strictEqual((await theirsAfter.json()).progress.xp, 7);
  });
});
