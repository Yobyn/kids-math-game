#!/usr/bin/env node
/**
 * Runs the game on this computer and keeps it on the latest code: every few
 * minutes it asks GitHub whether `main` has moved, and when it has (a run
 * merged new work) it pulls it, reinstalls if the packages changed, and
 * restarts the game. An open browser tab reloads by itself once it is back.
 *
 *   npm run play                        http://localhost:4200/, this computer only
 *   npm run play:network                also from phones and tablets on the same Wi-Fi
 *   PLAY_CHECK_MINUTES=2 npm run play   look more often
 *
 * Works on Windows, macOS and Linux: the game is started with node itself,
 * not through a shell, so `NODE_OPTIONS` is set the same way everywhere.
 *
 * It never overwrites work: with changes of your own in the checkout, or on
 * a branch other than main, it says so and leaves the code as it is.
 */
const { execFileSync, spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BRANCH = process.env.PLAY_BRANCH || 'main';
const PORT = process.env.PLAY_PORT || '4200';
const CHECK_MS = Math.max(1, Number(process.env.PLAY_CHECK_MINUTES) || 5) * 60 * 1000;
const NETWORK = process.argv.includes('--network');

/**
 * The addresses another device on the same network can open the game at:
 * every IPv4 address of this computer that is not its own loopback.
 */
function networkAddresses(interfaces = os.networkInterfaces()) {
  return Object.values(interfaces).flat()
    .filter(address => address && (address.family === 'IPv4' || address.family === 4) && !address.internal)
    .map(address => address.address);
}

/**
 * What ng serve is started with. On the network it listens on every address,
 * and lets a phone in by this computer's name (mypc.local) as well as by number.
 */
function serveArgs(port, network) {
  return ['serve', '--port', port, ...(network ? ['--host', '0.0.0.0', '--disable-host-check'] : [])];
}

/** Files whose change means `npm ci` before the game can start again. */
function needsInstall(changedFiles) {
  return changedFiles.some(file => file === 'package.json' || file === 'package-lock.json');
}

function git(root, ...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

/** The tracked files that differ from the last commit, as git names them. */
function changedFiles(root) {
  return git(root, 'diff', '--name-only', 'HEAD').split('\n').filter(Boolean);
}

/**
 * A change nobody made on purpose, which an update may undo: package-lock.json
 * (npm install rewrites it; npm ci puts it back exactly), or a file that only
 * differs in its line endings (Windows writing \r\n). Anything else is
 * someone's work and is never touched.
 */
function isNoise(root, file) {
  if (file === 'package-lock.json') {
    return true;
  }
  try {
    git(root, 'diff', '--quiet', '--ignore-cr-at-eol', '--', file);
    return true;
  } catch {
    return false;
  }
}

/**
 * Brings the checkout up to `origin/<branch>` if it can do so safely.
 * Returns what happened: 'updated' (with the files that changed), 'current',
 * or 'skipped' with the reason.
 */
function update(root = ROOT, branch = BRANCH) {
  const on = git(root, 'rev-parse', '--abbrev-ref', 'HEAD');
  if (on !== branch) {
    return { status: 'skipped', reason: `the checkout is on ${on}, not ${branch}` };
  }
  const changed = changedFiles(root);
  const work = changed.filter(file => !isNoise(root, file));
  if (work.length) {
    const named = work.slice(0, 5).join(', ') + (work.length > 5 ? ` and ${work.length - 5} more` : '');
    return {
      status: 'skipped',
      reason: `these files were changed on this computer: ${named}. To get updates, keep a copy with \`git stash\` (or undo them with \`git restore <file>\`)`
    };
  }
  if (changed.length) {
    // Only noise: put it back as committed, so the update can go ahead
    git(root, 'checkout', '--', ...changed);
  }
  git(root, 'fetch', '--quiet', 'origin', branch);
  const before = git(root, 'rev-parse', 'HEAD');
  const latest = git(root, 'rev-parse', `origin/${branch}`);
  if (before === latest) {
    return { status: 'current' };
  }
  if (git(root, 'merge-base', before, latest) !== before) {
    return { status: 'skipped', reason: `local ${branch} has commits GitHub does not; leaving it alone` };
  }
  const updated = git(root, 'diff', '--name-only', before, latest).split('\n').filter(Boolean);
  git(root, 'merge', '--ff-only', '--quiet', latest);
  return { status: 'updated', changed: updated, from: before.slice(0, 7), to: latest.slice(0, 7) };
}

function log(message) {
  console.log(`[play ${new Date().toLocaleTimeString()}] ${message}`);
}

function install() {
  log('packages changed: npm ci');
  const result = spawnSync('npm', ['ci'], { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    throw new Error('npm ci failed');
  }
}

let game = null;

function start() {
  const ng = path.join(ROOT, 'node_modules', '@angular', 'cli', 'bin', 'ng');
  log(`starting the game on http://localhost:${PORT}/`);
  if (NETWORK) {
    const addresses = networkAddresses();
    log(addresses.length
      ? `on phones and tablets on the same Wi-Fi: ${addresses.map(address => `http://${address}:${PORT}/`).join('  ')}`
      : 'no network found: only this computer can open the game');
  }
  game = spawn(process.execPath, [ng, ...serveArgs(PORT, NETWORK)], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, NODE_OPTIONS: '--openssl-legacy-provider', NG_CLI_ANALYTICS: 'false' }
  });
}

function stop() {
  return new Promise(resolve => {
    if (!game || game.exitCode !== null || game.signalCode !== null) {
      resolve();
      return;
    }
    game.once('exit', () => resolve());
    game.kill();
  });
}

let checking = false;

async function check() {
  // A slow npm ci must not overlap the next check
  if (checking) {
    return;
  }
  checking = true;
  try {
    const result = update();
    if (result.status === 'skipped') {
      log(`not updating: ${result.reason}`);
    } else if (result.status === 'updated') {
      log(`new code on ${BRANCH} (${result.from} → ${result.to}): restarting`);
      if (result.changed.includes('scripts/play-latest.js')) {
        log('this updater changed too: stop it with Ctrl+C and start it again to use the new version');
      }
      await stop();
      if (needsInstall(result.changed)) {
        install();
      }
      start();
    }
  } catch (error) {
    // No network for a moment is no reason to stop the game that is running
    log(`could not check for updates: ${error.message.split('\n')[0]}`);
  } finally {
    checking = false;
  }
}

async function main() {
  const first = (() => {
    try {
      return update();
    } catch (error) {
      log(`could not check for updates: ${error.message.split('\n')[0]}`);
      return { status: 'current', changed: [] };
    }
  })();
  if (first.status === 'skipped') {
    log(`not updating: ${first.reason}`);
  } else if (first.status === 'updated') {
    log(`pulled ${first.from} → ${first.to}`);
  }
  if (!fs.existsSync(path.join(ROOT, 'node_modules', '@angular', 'cli')) || (first.changed && needsInstall(first.changed))) {
    install();
  }
  start();
  log(`checking GitHub for new code every ${CHECK_MS / 60000} minutes (Ctrl+C to stop)`);
  setInterval(check, CHECK_MS);
  const quit = async () => {
    await stop();
    process.exit(0);
  };
  process.on('SIGINT', quit);
  process.on('SIGTERM', quit);
}

if (require.main === module) {
  main();
}

module.exports = { needsInstall, networkAddresses, serveArgs, update };
