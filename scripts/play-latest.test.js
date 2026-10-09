const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { needsInstall, networkAddresses, serveArgs, update } = require('./play-latest.js');

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

/** A GitHub stand-in and a computer's checkout of it, both on main. */
function repos() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'play-latest-'));
  const origin = path.join(dir, 'origin.git');
  const author = path.join(dir, 'author');
  const pc = path.join(dir, 'pc');
  git(dir, 'init', '--quiet', '--bare', '--initial-branch=main', origin);
  git(dir, 'clone', '--quiet', origin, author);
  for (const [key, value] of [['user.email', 'run@example.com'], ['user.name', 'run']]) {
    git(author, 'config', key, value);
  }
  git(author, 'checkout', '--quiet', '-b', 'main');
  commit(author, 'game.js', 'v1');
  git(author, 'push', '--quiet', 'origin', 'main');
  git(dir, 'clone', '--quiet', origin, pc);
  for (const [key, value] of [['user.email', 'pc@example.com'], ['user.name', 'pc']]) {
    git(pc, 'config', key, value);
  }
  return { author, pc };
}

function commit(repo, file, content) {
  fs.writeFileSync(path.join(repo, file), content);
  git(repo, 'add', file);
  git(repo, 'commit', '--quiet', '-m', `${file} ${content}`);
}

test('installs again only when the packages changed', () => {
  assert.strictEqual(needsInstall(['src/app/teaching/school/groep.ts']), false);
  assert.strictEqual(needsInstall(['package-lock.json']), true);
  assert.strictEqual(needsInstall(['docs/ROADMAP.md', 'package.json']), true);
  // the server has packages of its own; the game does not need them
  assert.strictEqual(needsInstall(['server/package.json']), false);
});

test('pulls what a run merged, and says which files changed', () => {
  const { author, pc } = repos();
  commit(author, 'groep.ts', 'groep 8');
  git(author, 'push', '--quiet', 'origin', 'main');

  const result = update(pc, 'main');

  assert.strictEqual(result.status, 'updated');
  assert.deepStrictEqual(result.changed, ['groep.ts']);
  assert.strictEqual(fs.readFileSync(path.join(pc, 'groep.ts'), 'utf8'), 'groep 8');
  // and the next check finds nothing new, so the game is not restarted for nothing
  assert.strictEqual(update(pc, 'main').status, 'current');
});

test('never overwrites changes made on the computer', () => {
  const { author, pc } = repos();
  commit(author, 'game.js', 'v2');
  git(author, 'push', '--quiet', 'origin', 'main');
  fs.writeFileSync(path.join(pc, 'game.js'), 'my own edit');

  const result = update(pc, 'main');

  assert.strictEqual(result.status, 'skipped');
  assert.strictEqual(fs.readFileSync(path.join(pc, 'game.js'), 'utf8'), 'my own edit');
});

test('leaves a checkout alone that has commits of its own, or is on another branch', () => {
  const { author, pc } = repos();
  commit(author, 'game.js', 'v2');
  git(author, 'push', '--quiet', 'origin', 'main');
  commit(pc, 'notes.txt', 'mine');

  assert.strictEqual(update(pc, 'main').status, 'skipped');
  assert.strictEqual(fs.readFileSync(path.join(pc, 'game.js'), 'utf8'), 'v1');

  git(pc, 'checkout', '--quiet', '-b', 'trying-something');
  assert.match(update(pc, 'main').reason, /trying-something/);
});

test('stays on this computer unless asked to serve the network', () => {
  assert.deepStrictEqual(serveArgs('4200', false), ['serve', '--port', '4200']);
  const shared = serveArgs('4200', true);
  // every address, so a phone on the Wi-Fi reaches it, and by the computer's name too
  assert.strictEqual(shared[shared.indexOf('--host') + 1], '0.0.0.0');
  assert.ok(shared.includes('--disable-host-check'));
});

test('tells a phone the addresses to open: this computer on the network, never its loopback', () => {
  const addresses = networkAddresses({
    lo: [{ address: '127.0.0.1', family: 'IPv4', internal: true }],
    'Wi-Fi': [{ address: 'fe80::1', family: 'IPv6', internal: false }, { address: '192.168.1.23', family: 'IPv4', internal: false }],
    Ethernet: [{ address: '10.0.0.5', family: 4, internal: false }]
  });

  assert.deepStrictEqual(addresses, ['192.168.1.23', '10.0.0.5']);
});
