const fs = require('fs');
const path = require('path');

/**
 * A child's progress, so it follows them to another device.
 *
 * WHAT IS IN HERE IS A DELIBERATELY SHORT LIST, and the list is the design.
 * The ICO's Age Appropriate Design Code (regulatory guidance, standard 8)
 * words it exactly: "Collect and retain only the minimum amount of personal
 * data you need to provide the elements of your service in which a child is
 * actively and knowingly engaged." The element a child knowingly engages in
 * when they make an account here is "keep what I have earned" — so this
 * holds what they would notice missing on a new phone: the rounds they have
 * played, their experience and totals, the events they were here for, the
 * things they won, and their character.
 *
 * WHAT IS NOT IN HERE MATTERS MORE. The facts a child keeps getting wrong
 * (`missedFacts`) and the ones that have stuck (`learned`) never leave the
 * device. A child is not knowingly engaging a server when they get 8 + 7
 * wrong; that queue is working state which rebuilds itself from play within
 * days, and "what this child is bad at" is the single most sensitive thing
 * this game knows. The same goes for the round in play and the last result,
 * which are about one device in one moment and mean nothing anywhere else.
 * The code is explicit that elements of a service are to be considered
 * separately rather than bundled, and this is that line drawn.
 *
 * A GUEST SYNCS NOTHING AT ALL. There is no account, so there is nothing to
 * put a row under and nobody to give it back to — which is also the code's
 * "high privacy by default".
 *
 * Deletion is a first-class operation rather than a support request: an
 * adult can wipe the server's copy from the grown-ups' screen, and deleting
 * it does not touch what is on the device. Retention is the account's
 * lifetime and no longer.
 *
 * The storage shape is `store.js`'s, for the same reasons written there: one
 * JSON file, written to a temporary file, fsynced, then renamed over the
 * real one so a crash can never leave it half written. Kept free of Express
 * so it can be tested directly.
 */

const DEFAULT_PATH = path.join(__dirname, 'data', 'progress.json');

/**
 * A ceiling on what one account may store. The history is capped at twenty
 * rounds and the rest is small, so anything near this is a client that has
 * gone wrong or one that is not ours.
 */
const MAX_BYTES = 64 * 1024;

class ProgressStore {
  constructor(file = DEFAULT_PATH) {
    this.file = file;
    this.byUser = {};
    this.load();
  }

  /**
   * A missing file is a new install. A corrupt one starts empty HERE, unlike
   * accounts: progress is a copy of what is on a device, so the worst case
   * is a child's next round pushing it all back. Refusing to start would
   * take the whole server down for a file that is, by design, replaceable.
   */
  load() {
    let raw;
    try {
      raw = fs.readFileSync(this.file, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        return;
      }
      throw error;
    }

    try {
      const parsed = JSON.parse(raw);
      this.byUser = parsed && typeof parsed === 'object' && parsed.byUser ? parsed.byUser : {};
    } catch {
      this.byUser = {};
    }
  }

  /** Writes the whole file atomically. See store.js for why it is this shape. */
  save() {
    const directory = path.dirname(this.file);
    fs.mkdirSync(directory, { recursive: true });

    const temporary = `${this.file}.${process.pid}.tmp`;
    const contents = JSON.stringify({ byUser: this.byUser }, null, 2);

    const handle = fs.openSync(temporary, 'w');
    try {
      fs.writeFileSync(handle, contents);
      fs.fsyncSync(handle);
    } finally {
      fs.closeSync(handle);
    }

    fs.renameSync(temporary, this.file);
  }

  /** What this account has stored, or null when it has never pushed. */
  get(userId) {
    const row = this.byUser[String(userId)];
    return row ? row.progress : null;
  }

  /** When it was last written, or null. For saying so rather than guessing. */
  updatedAt(userId) {
    const row = this.byUser[String(userId)];
    return row ? row.updatedAt : null;
  }

  /**
   * Replaces this account's progress. The client sends state it has already
   * merged, so this is a put rather than a patch: the server is a copy, not
   * the authority, and merging in two places would make neither of them the
   * truth.
   *
   * Throws when the payload is not a plain object or is over the ceiling,
   * so the route can answer 400 rather than writing something it cannot use.
   */
  put(userId, progress, now = new Date()) {
    if (!progress || typeof progress !== 'object' || Array.isArray(progress)) {
      throw new Error('progress must be an object');
    }

    const encoded = JSON.stringify(progress);
    if (Buffer.byteLength(encoded, 'utf8') > MAX_BYTES) {
      throw new Error('progress is too large');
    }

    this.byUser[String(userId)] = {
      updatedAt: now.toISOString(),
      progress: JSON.parse(encoded)
    };
    this.save();
  }

  /** Forgets it entirely. True when there was something to forget. */
  remove(userId) {
    const key = String(userId);
    if (!(key in this.byUser)) {
      return false;
    }
    delete this.byUser[key];
    this.save();
    return true;
  }

  get count() {
    return Object.keys(this.byUser).length;
  }
}

module.exports = { ProgressStore, MAX_BYTES, DEFAULT_PATH };
