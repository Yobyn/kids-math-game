# Kids Math Game

A maths game for children, built to be played on a phone or a tablet. Ten
question rounds scaled to a school year, a money strand that follows the
curriculum's own progression, a character the child makes theirs and dresses
from what they earn, and a book of what they have done.

It installs to a home screen and keeps working offline.

## Running it

Node 20 is what CI uses; Node 17 and up all work.

```bash
npm ci
npm start          # http://localhost:4200/
```

`npm start` carries `NODE_OPTIONS=--openssl-legacy-provider`, and so do the
build and test scripts. Angular 12 ships webpack 4, whose hashing calls an
OpenSSL 3 routine that Node 17 removed; without the flag every one of these
commands dies with `ERR_OSSL_EVP_UNSUPPORTED`. Running `ng` directly means
setting it yourself.

**The game runs without the server.** A child can play a full round as a
guest, and everything they do is kept in their own browser. The server is only
needed to register an account and sign in — take "Play without an account" on
the login screen and none of the rest of this matters.

To run it anyway:

```bash
cd server
JWT_SECRET=<a long random string> npm start    # http://localhost:3000/
```

There is no database to install. Accounts live in `server/data/accounts.json`;
see [the server's own README](./server/README.md), which is the accurate one
for anything server-side.

## What it does

- **Rounds.** Ten questions, `+ − × ÷`, scaled by school year (1-10) and by
  difficulty. Two attempts each, a streak bonus, and stars at the end.
- **Money as a taught strand**, not a themed sum: coins on the table to count
  from year 1, making an amount, totals and change, and the decimal €.p form
  from year 4 — with a decimal point on the number pad to type it.
- **A number pad**, so the OS keyboard never covers the question.
- **A missed fact is shown worked out**, one line of method, only after two
  honest attempts — and comes back on a LATER DAY, not the same afternoon.
- **A character**: skin tone, face, eyes, mouth, nine hair styles, hair
  texture and colour, all free from the first visit; hats, glasses and shirts
  earned by levelling up; a few items that only a seasonal event grants.
- **A scrapbook** of what actually happened — events the child was here for,
  the day each item arrived, their best round.
- **A screen for grown-ups**, behind a gate that is deliberately not
  arithmetic, holding the honest round-by-round line and three facts to
  practise, each already worked out.
- **English, Dutch and Spanish.**
- **Rounds survive interruption** — a locked screen or a phone call — and are
  offered back, never restored silently.
- **A new version waits to be let in** rather than taking over mid-round.

`docs/ROADMAP.md` is the long version: what works, what does not, and why each
decision was made. Read it before changing anything.

## Technology

- **Frontend**: Angular 12, no UI framework. The character and the coins are
  drawn from SVG primitives, so there are no image assets to scale.
- **Backend**: Node and Express, accounts in a JSON file written atomically.
  No database.
- **Authentication**: JWT (via `jose`) and bcrypt password hashing.
- **Email**: Nodemailer with Gmail, for password reset only.
- **Offline**: a hand-written service worker, versioned at build time by
  `scripts/stamp-service-worker.js`.

## Tests

```bash
npm run test:ci        # the app: 990 specs in headless Chrome
npm run test:future    # the same suite with the clock moved forward a year
npm run test:scripts   # the build scripts, and what index.html must say
cd server && npm test  # the server
```

All four run in CI on every pull request, alongside the production build.

`test:future` is not a duplicate. A test that hard-codes today's date passes
on the day it is written and fails weeks later on a branch nobody has touched;
running the suite again with `Date` moved on more than a year is what tells a
test that reads the clock apart from one that assumes what it says. See
`src/testing/shift-clock.ts`.

For a headless Chrome that is not on the default path, set `CHROME_BIN`.

## Building

```bash
npm run build          # dist/, then stamps the service worker's version
```

The stamp is what makes an update detectable at all: the browser decides
whether a service worker changed by comparing its bytes, and the source file
is copied verbatim, so without it every deploy ships a byte-identical worker
and no child is ever told there is something new.
