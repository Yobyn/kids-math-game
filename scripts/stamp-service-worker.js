/**
 * Gives the built service worker a name that changes when the app does.
 *
 * WITHOUT THIS THE UPDATE PROMPT IS DEAD CODE. A browser decides whether a
 * service worker has changed by comparing the bytes of the script, and
 * src/service-worker.js is copied into the build verbatim — identical on
 * every deploy. So `registration.waiting` never appeared, no `updatefound`
 * ever fired, and the whole documented update path had nothing to detect.
 * The app still got new code, but only because navigations are network-first,
 * which is exactly the silent swap this is meant to replace.
 *
 * The version is a hash of the built index.html, which is the one file that
 * names every hashed bundle — so it changes when and only when the app does.
 * It also fixes a second thing: CACHE_VERSION was the literal 'math-game-v1'
 * forever, so `activate` never had an old cache to clear.
 *
 * Run from the build script, after ng build.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/** The marker in src/service-worker.js that this replaces. */
const PLACEHOLDER = '__BUILD_VERSION__';

/** Short enough to read in devtools, long enough not to collide. */
const LENGTH = 12;

/** What the built app hashes to. */
function versionOf(indexHtml) {
  return crypto.createHash('sha256').update(indexHtml).digest('hex').slice(0, LENGTH);
}

/**
 * The worker with its version filled in. Returns null when there is no
 * placeholder to fill, so a silent no-op can be reported as the failure it is.
 */
function stamp(source, version) {
  if (!source || source.indexOf(PLACEHOLDER) < 0) {
    return null;
  }
  return source.split(PLACEHOLDER).join(version);
}

/**
 * Where ng build puts things, read from angular.json rather than written
 * down here — a hard-coded path silently stamped nothing when the two
 * disagreed, which is the failure mode this whole script exists to prevent.
 */
function outputPath(root) {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'angular.json'), 'utf8'));
  const projects = config.projects || {};
  const name = config.defaultProject || Object.keys(projects)[0];
  const build = ((projects[name] || {}).architect || {}).build || {};
  return path.join(root, (build.options || {}).outputPath || 'dist');
}

function main() {
  const root = path.join(__dirname, '..');
  const dist = outputPath(root);
  const workerPath = path.join(dist, 'service-worker.js');
  const indexPath = path.join(dist, 'index.html');

  if (!fs.existsSync(workerPath) || !fs.existsSync(indexPath)) {
    console.error('stamp-service-worker: no build to stamp at ' + dist);
    process.exit(1);
  }

  const version = versionOf(fs.readFileSync(indexPath, 'utf8'));
  const stamped = stamp(fs.readFileSync(workerPath, 'utf8'), version);
  if (!stamped) {
    console.error('stamp-service-worker: no ' + PLACEHOLDER + ' in the built worker');
    process.exit(1);
  }

  fs.writeFileSync(workerPath, stamped);
  console.log('stamp-service-worker: math-game-' + version);
}

module.exports = { PLACEHOLDER, outputPath, stamp, versionOf };

if (require.main === module) {
  main();
}
