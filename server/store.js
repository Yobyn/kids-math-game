const fs = require('fs');
const path = require('path');

/**
 * Where accounts live between restarts.
 *
 * The obvious fix for "the server forgets every account when it restarts" is
 * to wire up the Mongoose model that has been sitting in models/User.js
 * unused. That is the wrong shape for this app. The server holds a username,
 * a password hash and an optional email, and nothing else — every scrap of a
 * child's actual progress is in their own browser. Standing up a database
 * server to keep three fields per account means nobody can run the game
 * without also running Mongo, which is a large part of why the README could
 * never say how to start it.
 *
 * So: one JSON file. The known failure of that design is not size, it is
 * durability — a process that dies part way through rewriting the file leaves
 * it truncated, and truncated here means every account is gone, which is the
 * exact problem this is meant to fix. So a save writes a temporary file,
 * flushes it, and renames it over the real one. Rename is atomic on POSIX:
 * a reader sees either the whole old file or the whole new one, never half
 * of either.
 *
 * Kept free of Express so it can be tested directly.
 */

/** Where the file lives unless a caller says otherwise. */
const DEFAULT_PATH = path.join(__dirname, 'data', 'accounts.json');

class AccountStore {
  constructor(file = DEFAULT_PATH) {
    this.file = file;
    this.users = [];
    this.nextId = 1;
    this.load();
  }

  /**
   * Reads what is on disk. A missing file is a new install, not an error.
   * A corrupt one is loud: silently starting empty would hand the next child
   * to register somebody else's username and quietly drop the rest.
   */
  load() {
    let raw;
    try {
      raw = fs.readFileSync(this.file, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.users = [];
        this.nextId = 1;
        return;
      }
      throw error;
    }

    const parsed = JSON.parse(raw);
    this.users = Array.isArray(parsed.users) ? parsed.users : [];
    // Never reuse an id, even if accounts are removed by hand: a stale token
    // carrying userId 4 must not start pointing at a different person.
    const highest = this.users.reduce((top, user) => Math.max(top, user.id || 0), 0);
    this.nextId = Math.max(Number(parsed.nextId) || 1, highest + 1);
  }

  /** Writes the whole file atomically. See the note above on why. */
  save() {
    const directory = path.dirname(this.file);
    fs.mkdirSync(directory, { recursive: true });

    const temporary = `${this.file}.${process.pid}.tmp`;
    const contents = JSON.stringify({ nextId: this.nextId, users: this.users }, null, 2);

    const handle = fs.openSync(temporary, 'w');
    try {
      fs.writeFileSync(handle, contents);
      // Without this the rename can land before the bytes do, and a power cut
      // between the two leaves an empty file where the accounts were.
      fs.fsyncSync(handle);
    } finally {
      fs.closeSync(handle);
    }

    fs.renameSync(temporary, this.file);
  }

  findByUsername(username) {
    return this.users.find(user => user.username === username);
  }

  findByEmail(email) {
    return email ? this.users.find(user => user.email === email) : undefined;
  }

  findById(id) {
    return this.users.find(user => user.id === id);
  }

  /** Adds an account and writes it down before saying it exists. */
  add({ username, password, email }) {
    const user = { id: this.nextId++, username, password, email };
    this.users.push(user);
    this.save();
    return user;
  }

  /** Changes a password and writes it down; returns false if nobody matched. */
  updatePassword(id, password) {
    const user = this.findById(id);
    if (!user) {
      return false;
    }
    user.password = password;
    this.save();
    return true;
  }

  get count() {
    return this.users.length;
  }
}

module.exports = { AccountStore, DEFAULT_PATH };
