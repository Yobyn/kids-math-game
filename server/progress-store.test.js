const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { ProgressStore, MAX_BYTES } = require('./progress-store');

/** A store in a directory of its own, so tests never see each other's data. */
function freshStore() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'progress-'));
  return path.join(directory, 'nested', 'progress.json');
}

/** Roughly what a client actually pushes. */
function someProgress() {
  return {
    roundHistory: [{ on: '2026-09-22', score: 8, asked: 10 }],
    xp: 240,
    totals: { correct: 41, asked: 50 },
    events: ['harvest-2026'],
    keepsakes: [{ id: 'acorn' }],
    avatar: { face: 'fox', hat: 'none' }
  };
}

test('an account with nothing stored reads as nothing, not as an error', () => {
  const store = new ProgressStore(freshStore());

  assert.strictEqual(store.get(7), null);
  assert.strictEqual(store.updatedAt(7), null);
  assert.strictEqual(store.count, 0);
});

test('progress survives a restart, which is the whole point', () => {
  const file = freshStore();

  new ProgressStore(file).put(7, someProgress());

  const second = new ProgressStore(file);
  assert.strictEqual(second.get(7).xp, 240);
  assert.deepStrictEqual(second.get(7).keepsakes, [{ id: 'acorn' }]);
});

test('creates the directory it needs rather than failing on a fresh install', () => {
  const file = freshStore();
  new ProgressStore(file).put(7, someProgress());

  assert.ok(fs.existsSync(file));
});

test('one account never reads another account, even by an id that looks alike', () => {
  const store = new ProgressStore(freshStore());
  store.put(7, { xp: 240 });

  assert.strictEqual(store.get(8), null);
  // '7' and 7 are the same child; 70 is a different one
  assert.strictEqual(store.get('7').xp, 240);
  assert.strictEqual(store.get(70), null);
});

test('a push replaces rather than merges, because the client is the authority', () => {
  const store = new ProgressStore(freshStore());
  store.put(7, { xp: 240, events: ['harvest-2026'] });
  store.put(7, { xp: 260 });

  assert.deepStrictEqual(store.get(7), { xp: 260 });
});

test('stores a copy, so a caller holding the object cannot edit the store', () => {
  const store = new ProgressStore(freshStore());
  const mine = someProgress();
  store.put(7, mine);

  mine.xp = 999999;
  mine.keepsakes.push({ id: 'stolen' });

  assert.strictEqual(store.get(7).xp, 240);
  assert.strictEqual(store.get(7).keepsakes.length, 1);
});

test('records when it was written, so the client need not guess', () => {
  const store = new ProgressStore(freshStore());
  store.put(7, { xp: 1 }, new Date('2026-09-23T06:30:00Z'));

  assert.strictEqual(store.updatedAt(7), '2026-09-23T06:30:00.000Z');
});

test('refuses anything that is not a plain object', () => {
  const store = new ProgressStore(freshStore());

  for (const bad of [null, undefined, 'xp=240', 42, [1, 2, 3]]) {
    assert.throws(() => store.put(7, bad), /must be an object/);
  }
  // Nothing was written by any of those
  assert.strictEqual(store.count, 0);
});

test('refuses a payload over the ceiling instead of storing it', () => {
  const store = new ProgressStore(freshStore());
  const huge = { note: 'x'.repeat(MAX_BYTES) };

  assert.throws(() => store.put(7, huge), /too large/);
  assert.strictEqual(store.get(7), null);
});

test('deleting forgets it entirely and says whether there was anything', () => {
  const file = freshStore();
  const store = new ProgressStore(file);
  store.put(7, someProgress());

  assert.strictEqual(store.remove(7), true);
  assert.strictEqual(store.get(7), null);
  assert.strictEqual(store.remove(7), false);
  // and it stays gone across a restart, rather than coming back off disk
  assert.strictEqual(new ProgressStore(file).get(7), null);
});

test('deleting one account leaves every other account alone', () => {
  const store = new ProgressStore(freshStore());
  store.put(7, { xp: 240 });
  store.put(8, { xp: 10 });

  store.remove(7);

  assert.strictEqual(store.get(8).xp, 10);
  assert.strictEqual(store.count, 1);
});

test('a corrupt file starts empty rather than taking the server down', () => {
  // Unlike accounts: this is a copy of what is on a device, so the cost of
  // starting empty is one push, and the cost of refusing to start is everyone
  const file = freshStore();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, '{ this is not json');

  const store = new ProgressStore(file);

  assert.strictEqual(store.count, 0);
  assert.strictEqual(store.get(7), null);
});

test('a file that reads but has the wrong shape also starts empty', () => {
  const file = freshStore();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, '[]');

  assert.strictEqual(new ProgressStore(file).count, 0);
});

test('never leaves a half written file behind', () => {
  const file = freshStore();
  const store = new ProgressStore(file);
  store.put(7, someProgress());

  const leftovers = fs.readdirSync(path.dirname(file)).filter(name => name.endsWith('.tmp'));
  assert.deepStrictEqual(leftovers, []);
  assert.doesNotThrow(() => JSON.parse(fs.readFileSync(file, 'utf8')));
});
