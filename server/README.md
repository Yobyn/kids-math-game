# Math Game Server

Holds accounts, and a deliberately short copy of what a signed-in child has
earned, so it is there when they play on another phone or tablet. Nothing
else. A child playing as a guest sends nothing here at all.

## Running it

```bash
npm ci
JWT_SECRET=<a long random string> npm start
```

The game itself works without this server: a child can play as a guest. The
server is only needed for registering and signing in.

## What a signed-in child's copy contains, and what it never contains

**Kept:** the last twenty rounds, experience, lifetime totals, the events they
were here for, the things they won, and their character. That is the list of
what a child would notice missing on a new phone.

**Never kept:** the sums they keep getting wrong (`missedFacts`), the ones
that have stuck (`learned`), the round in play and the last result. The
practice queue is working state that rebuilds itself from a few days' play,
and "what this child is bad at" is the most sensitive thing this game knows —
it does not leave the device. The reasoning, and the ICO Age Appropriate
Design Code wording it follows, is written out in `progress-store.js`.

`data/progress.json`, alongside the accounts and written the same way. Set
`PROGRESS_FILE` to move it. Like the accounts file it is gitignored and must
stay that way.

Three routes, all behind the token, all scoped to the account the token names:

| | |
|---|---|
| `GET /api/progress` | what this account has, or `null` |
| `PUT /api/progress` | replace it; 400 if the body is not a usable object or is over 64 kB |
| `DELETE /api/progress` | forget it |

The account id comes from the token and never from the request, so asking for
another child's progress is not something the API can express — there is a
test for each of those, because that is the part worth being sure about.

The device is the authority: the client merges and then puts the result, so a
pull can never take away something a child earned somewhere else. The merge
rule lives in `src/app/services/synced-progress.ts`.

Deleting is a first-class operation, not a support request — an adult can do
it from the grown-ups' screen in the game. It removes this server's copy only;
what is on the device stays. Retention is the account's lifetime and no more.

## Where accounts are kept

`data/accounts.json`, written atomically — a temporary file, flushed, then
renamed over the real one — so a crash part way through a save cannot leave a
truncated file and lose every account. Set `ACCOUNTS_FILE` to put it
somewhere else. The file is gitignored and must stay that way: it holds
usernames, password hashes and any email given.

There is a Mongoose model in `models/User.js` that nothing uses. A database
server is a large dependency for three fields per account, and requiring one
would mean nobody can run the game without also running Mongo. If this ever
needs to scale past one process, that is the moment to reach for it.

## Tests

```bash
npm test
```

Run by CI on every pull request, alongside the app's own.

## Environment Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update the `.env` file with your credentials:

- `PORT`: Server port (default: 3000)
- `JWT_SECRET`: Secret key for JWT token generation (use a strong random string)
- `GMAIL_USER`: Your Gmail address
- `GMAIL_APP_PASSWORD`: Your Gmail App Password

### Setting up Gmail App Password

1. Go to your Google Account settings
2. Enable 2-Step Verification if not already enabled
3. Go to Security → App passwords
4. Generate a new app password:
   - Select app: Other (Custom name)
   - Name it "Math Game"
   - Copy the 16-digit password
5. Paste the password in your `.env` file as `GMAIL_APP_PASSWORD`

## Security Notes

- Never commit the `.env` file to version control
- Keep your app password secure
- Rotate the JWT secret and app password periodically
- The example values in `.env.example` are for illustration only
