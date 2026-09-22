const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { AccountStore } = require('./store');

/** A store in a directory of its own, so tests never see each other's data. */
function freshStore() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'accounts-'));
  return {
    file: path.join(directory, 'nested', 'accounts.json'),
    directory
  };
}

test('starts empty when there is nothing on disk', () => {
  const { file } = freshStore();
  const store = new AccountStore(file);

  assert.strictEqual(store.count, 0);
  assert.strictEqual(store.findByUsername('nobody'), undefined);
});

test('an account survives a restart, which is the whole point', () => {
  const { file } = freshStore();

  const first = new AccountStore(file);
  first.add({ username: 'sam', password: 'hashed', email: 'sam@example.com' });

  const second = new AccountStore(file);
  assert.strictEqual(second.count, 1);
  assert.strictEqual(second.findByUsername('sam').password, 'hashed');
});

test('creates the directory it needs rather than failing on a fresh install', () => {
  const { file } = freshStore();
  const store = new AccountStore(file);

  store.add({ username: 'sam', password: 'hashed' });

  assert.ok(fs.existsSync(file));
});

test('finds an account by username, email or id', () => {
  const { file } = freshStore();
  const store = new AccountStore(file);
  const user = store.add({ username: 'sam', password: 'hashed', email: 'sam@example.com' });

  assert.strictEqual(store.findByUsername('sam').id, user.id);
  assert.strictEqual(store.findByEmail('sam@example.com').id, user.id);
  assert.strictEqual(store.findById(user.id).id, user.id);
});

test('does not match an account with no email when none is asked for', () => {
  // Otherwise a reset request with a missing email would match the first
  // account that never gave one
  const { file } = freshStore();
  const store = new AccountStore(file);
  store.add({ username: 'sam', password: 'hashed' });

  assert.strictEqual(store.findByEmail(undefined), undefined);
  assert.strictEqual(store.findByEmail(''), undefined);
});

test('gives every account an id of its own, over a sweep', () => {
  const { file } = freshStore();
  const store = new AccountStore(file);
  const ids = new Set();

  for (let i = 0; i < 200; i++) {
    ids.add(store.add({ username: `child${i}`, password: 'hashed' }).id);
  }

  assert.strictEqual(ids.size, 200);
});

test('keeps handing out fresh ids across restarts', () => {
  const { file } = freshStore();
  const first = new AccountStore(file);
  const a = first.add({ username: 'a', password: 'x' });

  const second = new AccountStore(file);
  const b = second.add({ username: 'b', password: 'x' });

  assert.ok(b.id > a.id);
});

test('never reuses an id, even after an account is removed by hand', () => {
  // A stale token carrying userId 1 must not start pointing at someone else
  const { file } = freshStore();
  const first = new AccountStore(file);
  first.add({ username: 'a', password: 'x' });
  first.add({ username: 'b', password: 'x' });

  const stored = JSON.parse(fs.readFileSync(file, 'utf8'));
  stored.users = stored.users.filter(user => user.username === 'b');
  fs.writeFileSync(file, JSON.stringify(stored));

  const second = new AccountStore(file);
  assert.ok(second.add({ username: 'c', password: 'x' }).id > 2);
});

test('changes a password and writes it down', () => {
  const { file } = freshStore();
  const first = new AccountStore(file);
  const user = first.add({ username: 'sam', password: 'old' });

  assert.strictEqual(first.updatePassword(user.id, 'new'), true);
  assert.strictEqual(new AccountStore(file).findByUsername('sam').password, 'new');
});

test('says so rather than throwing when the account is not there', () => {
  const { file } = freshStore();
  const store = new AccountStore(file);

  assert.strictEqual(store.updatePassword(999, 'new'), false);
});

test('leaves the file whole when a save is interrupted', () => {
  // The failure this design exists to prevent: a half-written file here means
  // every account is gone, which is the very problem it is meant to fix
  const { file } = freshStore();
  const store = new AccountStore(file);
  store.add({ username: 'sam', password: 'hashed' });
  const before = fs.readFileSync(file, 'utf8');

  const realRename = fs.renameSync;
  fs.renameSync = () => { throw new Error('crashed mid-save'); };
  try {
    assert.throws(() => store.add({ username: 'alex', password: 'hashed' }));
  } finally {
    fs.renameSync = realRename;
  }

  assert.strictEqual(fs.readFileSync(file, 'utf8'), before);
  assert.strictEqual(new AccountStore(file).count, 1);
});

test('refuses to start on a corrupt file rather than losing everyone quietly', () => {
  // Starting empty would hand the next child to register somebody else's
  // username, and silently drop the rest
  const { file } = freshStore();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, '{ this is not json');

  assert.throws(() => new AccountStore(file));
});

test('reads a file written before ids were counted separately', () => {
  const { file } = freshStore();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({
    users: [{ id: 7, username: 'sam', password: 'hashed' }]
  }));

  const store = new AccountStore(file);
  assert.strictEqual(store.count, 1);
  assert.ok(store.add({ username: 'alex', password: 'x' }).id > 7);
});

test('survives a file whose users are not a list', () => {
  const { file } = freshStore();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ users: 'nonsense' }));

  const store = new AccountStore(file);
  assert.strictEqual(store.count, 0);
});

test('stores the password it is handed and never the one it was given', () => {
  // The store hashes nothing; that is the route's job, and this test is here
  // so nobody later assumes otherwise
  const { file } = freshStore();
  const store = new AccountStore(file);
  store.add({ username: 'sam', password: 'already-hashed' });

  const raw = fs.readFileSync(file, 'utf8');
  assert.ok(raw.includes('already-hashed'));
  assert.ok(!raw.includes('plaintext'));
});

test('leaves no temporary files behind', () => {
  const { file } = freshStore();
  const store = new AccountStore(file);
  store.add({ username: 'sam', password: 'hashed' });
  store.add({ username: 'alex', password: 'hashed' });

  const left = fs.readdirSync(path.dirname(file)).filter(name => name.endsWith('.tmp'));
  assert.deepStrictEqual(left, []);
});
