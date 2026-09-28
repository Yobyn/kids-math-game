const test = require('node:test');
const assert = require('node:assert');
const { FILES_PLACEHOLDER, PLACEHOLDER, builtFiles, stamp, stampFiles, versionOf } = require('./stamp-service-worker.js');

test('the version changes when the app does', () => {
  const before = versionOf('<script src="main.aaa.js">');
  const after = versionOf('<script src="main.bbb.js">');

  assert.notStrictEqual(before, after);
});

test('the version does NOT change when the app has not', () => {
  // A worker whose bytes change on every deploy would prompt a child to
  // update to the build they are already running
  const html = '<script src="main.aaa.js"></script>';

  assert.strictEqual(versionOf(html), versionOf(html));
});

test('the version is short enough to read and long enough not to collide', () => {
  const version = versionOf('anything');

  assert.strictEqual(version.length, 12);
  assert.match(version, /^[0-9a-f]+$/);
});

test('every placeholder is filled, not just the first', () => {
  const stamped = stamp(`a ${PLACEHOLDER} b ${PLACEHOLDER}`, 'v9');

  assert.strictEqual(stamped, 'a v9 b v9');
  assert.ok(!stamped.includes(PLACEHOLDER));
});

test('a worker with no placeholder is reported rather than silently kept', () => {
  // A silent no-op here means no update is ever detected, which is the exact
  // bug this script exists to fix
  assert.strictEqual(stamp('const CACHE = "fixed";', 'v9'), null);
  assert.strictEqual(stamp('', 'v9'), null);
  assert.strictEqual(stamp(null, 'v9'), null);
});

test('the real service worker still carries the placeholder', () => {
  const fs = require('fs');
  const path = require('path');
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'service-worker.js'), 'utf8');

  assert.ok(source.includes(PLACEHOLDER),
    'src/service-worker.js lost its placeholder, so no build can be stamped');
});

test('finds the build output where angular.json actually puts it', () => {
  const path = require('path');
  const fs = require('fs');
  const { outputPath } = require('./stamp-service-worker.js');
  const root = path.join(__dirname, '..');

  const dist = outputPath(root);

  // A hard-coded guess here stamped nothing at all the first time
  assert.ok(dist.startsWith(root), dist);
  const configured = JSON.parse(fs.readFileSync(path.join(root, 'angular.json'), 'utf8'));
  const name = Object.keys(configured.projects)[0];
  assert.strictEqual(
    dist,
    path.join(root, configured.projects[name].architect.build.options.outputPath));
});

test('precaches every bundle, the lazy chunks too, and nothing that is not the app', () => {
  const files = builtFiles([
    'main.72da.js', 'runtime.fd88.js', 'polyfills.e194.js', '963.f2e2.js', 'common.6704.js',
    'styles.934e.css', 'index.html', 'service-worker.js', '3rdpartylicenses.txt',
    'favicon.ico', 'manifest.webmanifest', 'assets'
  ]);

  assert.deepStrictEqual(files, [
    './963.f2e2.js', './common.6704.js', './favicon.ico', './main.72da.js',
    './manifest.webmanifest', './polyfills.e194.js', './runtime.fd88.js', './styles.934e.css'
  ]);
});

test('the same build always lists its files in the same order', () => {
  // Otherwise the worker's bytes, and so its update prompt, would change
  // on a rebuild of the same app
  assert.deepStrictEqual(builtFiles(['b.js', 'a.js', 'c.css']), builtFiles(['c.css', 'a.js', 'b.js']));
});

test('the list of built files is filled in, and a missing marker is reported', () => {
  const stamped = stampFiles(`const BUILT = [${FILES_PLACEHOLDER}];`, ['./a.js', './b.css']);

  assert.strictEqual(stamped, 'const BUILT = ["./a.js", "./b.css"];');
  assert.strictEqual(stampFiles('const BUILT = [];', ['./a.js']), null);
  assert.strictEqual(stampFiles('', ['./a.js']), null);
});

test('the real worker carries the files marker, and parses both before and after stamping', () => {
  const fs = require('fs');
  const path = require('path');
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'service-worker.js'), 'utf8');

  assert.ok(source.includes(FILES_PLACEHOLDER),
    'src/service-worker.js lost its list of built files, so nothing built is precached');
  // Compiled, not run: a syntax error here would stop the worker installing at all
  assert.doesNotThrow(() => new Function(source));
  const built = stampFiles(stamp(source, 'abc123'), ['./main.1.js', './963.2.js', './styles.3.css']);
  assert.doesNotThrow(() => new Function(built));
  assert.match(built, /const BUILT = \["\.\/main\.1\.js", "\.\/963\.2\.js", "\.\/styles\.3\.css"\];/);
  assert.match(built, /\.\.\.BUILT\]/);
});
