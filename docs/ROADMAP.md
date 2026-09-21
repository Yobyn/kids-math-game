# Where the game stands, and what a finished product still needs

A working note for whoever (or whatever) picks this up next. The improvement
routine reads this before each run, picks from it, and updates it afterwards.

Last surveyed: 2026-09-21

## What works today

- Login and registration against a small Express backend, JWT in `localStorage`.
- Grade (1-10) and difficulty (easy/medium/hard) selection, both reachable by
  keyboard and sized for small hands.
- Ten-question rounds: `+ - × ÷`, scaled by grade and difficulty, with a bonus
  for streaks and two attempts per question.
- Touch number pad on phones and tablets, so the OS keyboard never covers the
  question. Haptics on key press and on answers.
- A wrong answer shows the correct one with effort-focused encouragement.
- Progress bar through the round; result screen with up to three stars and a
  counted-up percentage.
- Sound and haptics switch in the header, remembered between sessions.
- Drifting math symbols behind every screen; everything motion-related
  respects `prefers-reduced-motion`.
- 52 unit tests, run on every PR by GitHub Actions alongside the build.

## Outstanding — roughly in the order a real product would need them

### Content and teaching
- **Money mode** (counting change, adding prices). Asked for by the owner;
  euros fit the existing nl/es wording.
- **No adaptive difficulty.** Grade and difficulty are picked once and never
  respond to how the child is actually doing.
- **No practice of what was missed.** A wrong answer is shown once and never
  comes back; spaced repetition of missed facts is what makes practice stick.
- **Division can produce awkward questions** — it guarantees whole answers but
  not sensible ones for the grade.

### Keeping a child coming back
- **Nothing persists between rounds.** `ScoreService` is in memory only: no
  history, no best score, no streak across days, no sense of getting better.
- **No badges or milestones** beyond the three stars of a single round.
- **No parent or teacher view** — no way to see what a child struggles with.

### Platform
- **Not installable.** No `manifest.webmanifest`, no service worker, so it
  cannot go on a home screen or work on a bad connection.
- **No landscape or large-tablet layout.** Portrait-tuned only.
- **No safe-area padding** for notched devices on the login and result screens.

### Reach
- **Spanish is written but unreachable.** A full `es` translation set exists in
  `language.service.ts`, while the selector only offers English and Dutch.
- **No language persistence** — the choice resets to English on reload.

### Code health
- **Backend stores users in memory** (`server/server.js`) — every restart drops
  all accounts. The Mongoose `User` model exists but is not wired up.
- **No lint setup.** Angular 12 dropped the default; nothing enforces style.
- **Dead code**: `src/app/app/` (a leftover scaffold, not in any module),
  `src/app/types/translation-keys.ts` (a second, unused `TranslationKeys`
  union), and `profile-creation` + `pokemon.service`, which no route reaches.
- **Coverage is ~50% of statements.** Login, register and the language
  selector have only smoke tests.
- **README has no run instructions** — notably that Node 17+ needs
  `NODE_OPTIONS=--openssl-legacy-provider`, and that the backend must be
  running before login will work.
