# Math Game Server

Holds accounts, and nothing else. Every scrap of a child's actual progress —
rounds, levels, missed facts, their character — lives in their own browser,
and none of it is sent here.

## Running it

```bash
npm ci
JWT_SECRET=<a long random string> npm start
```

The game itself works without this server: a child can play as a guest. The
server is only needed for registering and signing in.

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
