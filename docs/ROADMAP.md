# Where the game stands, and what a finished product still needs

A working note for whoever (or whatever) picks this up next. The improvement
routine reads this before each run, picks from it, and updates it afterwards.

Last surveyed: 2026-09-22 (grown-ups' screen added the same day)

## What works today

- Login and registration against a small Express backend, JWT in `localStorage`.
- Grade (1-10) and difficulty (easy/medium/hard) selection, both reachable by
  keyboard and sized for small hands.
- Ten-question rounds: `+ - × ÷`, scaled by grade and difficulty, with a bonus
  for streaks and two attempts per question.
- Touch number pad on phones and tablets, so the OS keyboard never covers the
  question. Haptics on key press and on answers.
- A wrong answer shows the correct one with effort-focused encouragement.
- Money questions (whole euros): totals from grade 2, change from grade 4,
  following the usual teaching order — counting before change-making.
- English, Dutch and Spanish, chosen in the header and remembered between
  visits.
- Installs to a home screen (manifest, maskable icons, standalone display) and
  keeps working offline through a versioned service worker.
- Rounds are remembered (last 20, in `localStorage`), and the result screen
  shows a personal best — beaten, or quietly displayed when it was not.
- A question missed twice comes back two questions later in the same round,
  once, the way a flashcard goes back a few cards from the front — and is
  kept for the next round, where it returns near the start (never first).
- Progress bar through the round; result screen with up to three stars and a
  counted-up percentage.
- Sound and haptics switch in the header, remembered between sessions.
- Drifting math symbols behind every screen; everything motion-related
  respects `prefers-reduced-motion`.
- 528 unit tests, run on every PR by GitHub Actions alongside the build.

## Product direction (Yobyn, 2026-09-21)

Bigger than single roadmap items — these shape several of them, so read this
before planning work under "Keeping a child coming back".

**Play first, account later.** A child should be able to open the game and
play a full round without logging in. An account is only needed to *keep*
things: progress, levels and unlocked rewards. That inverts today's flow,
where `AuthGuard` sends everyone to a login screen before they can do
anything. A guest's progress should be held locally and, when they sign up,
carried into the account rather than thrown away.

**Levels, not just scores.** Rounds earn progress toward levels. Every level
unlocks a reward, so there is always a next thing close enough to want.

**An avatar you dress up.** The reward at each level is clothing or an item
for a character the child owns. That is the spine of the reward system: the
avatar is where a child sees their own history.

**Special events unlock special items.** Seasonal or one-off events grant
clothes and items obtainable no other way, which is what makes them worth
coming back for.

Sequencing note: guest play comes first — it is the gate everything else sits
behind, and it is the one that decides whether a child ever reaches the
rewards at all. Levels next, since the avatar is meaningless without them.
Events last, as they need levels, an avatar wardrobe and a notion of time.

Two cautions worth carrying into the design. Rewards are motivating when they
are earned and specific, and become noise when they are constant — a reward
at every level only works if the levels themselves take real practice. And an
avatar means per-child data: guest state in `localStorage`, account state on
a backend that currently keeps its users in memory (see Code health).

## Outstanding — roughly in the order a real product would need them

### Content and teaching
- **Money mode is a first pass only.** Whole euros, one shape of question per
  band, no coins to count and no decimal amounts — worth extending once the
  rest of the teaching gaps are closed.
- **Difficulty advises, and stops short of adapting.** Rounds now record the
  setting they were played at, and the difficulty screen marks a card when
  recent play says the child is on the wrong rung: two rounds at 85% or better
  suggests a step up, two at 50% or worse a step down, one step only, and
  nothing at all for the wide middle in between. The child still chooses —
  every card stays exactly as choosable, because a system that overrules what
  a child picked produces the frustration adapting was meant to prevent.
  The rules are in `src/app/levels/difficulty-tuner.ts`, DOM-free and tested.
  What is missing is within a round: it still asks ten questions at one fixed
  setting whatever happens, so a child who is drowning on question three
  drowns for another seven. Grade is never revisited either, and the
  suggestion only reads rounds at the current grade, so a child who has
  outgrown their grade entirely is never told.
- **Spacing is one session deep.** Missed facts carry to the *next* round, but
  the interval is "next time you play", whether that is a minute or a month.
  Expanding intervals (a day, then three, then a week) would need timestamps
  on each fact and a scheduler to match.
- **Division can produce awkward questions** — it guarantees whole answers but
  not sensible ones for the grade.
- **A missed fact is now shown worked out, not just answered.** After two
  honest attempts the game gives the answer as before, and under it one line
  of method: 8 + 7 as `8 + 2 = 10 → 10 + 5 = 15`, subtraction bridging back
  down, multiplication leaning on the five times table, division read back as
  the multiplication behind it. Arithmetic and an arrow, so it needs no
  translating.
  It is deliberately never available on demand and never shown before a child
  has tried: worked examples cut cognitive load and teach more than an answer
  alone, but they also invite overreliance and stop being read when they are
  always there. This appears only at the moment the answer was going to be
  given away regardless. `src/app/teaching/worked-step.ts` is DOM-free, and
  the tests read every printed step back as arithmetic rather than checking
  its wording.
  What is missing: facts whose method is just the answer again get no line,
  which is right, but it means the youngest players (whose sums never cross
  ten) rarely see one. Money questions get none at all — they are worded
  problems and would need a different kind of explanation.

### Keeping a child coming back
- **Guest play is done end to end.** A child takes "Play without an account"
  on the login screen, plays full rounds, and after three of them the result
  screen offers an account below the celebration — once, and not again if it
  is waved away. Signing up moves their rounds and missed facts into the
  account and empties the guest slot. Progress is now filed per player
  (`roundHistory:guest`, `roundHistory:user:<name>`), so two children on one
  tablet no longer share a history. What remains is server-side: the account
  keeps its progress in `localStorage` like a guest's, so it still does not
  follow a child to another device — the thing the offer implies. That needs
  a progress API and a backend that survives a restart (see Code health).
- **Levels exist; nothing hangs off them yet.** Rounds earn experience and
  experience earns levels, shown on the result screen as a badge, a bar and a
  "Level up!" on the round that crosses. A round always pays — ten for
  finishing plus two per correct answer — so a child who scores nothing still
  climbs, at a third of the pace of a perfect round. Levels cost one round's
  worth more each time, capped at eight rounds' worth so the ladder never
  becomes a grind. Experience is stored per player (`xp:<owner>`), not derived
  from history, which is capped at twenty rounds. The curve lives in
  `src/app/levels/level-curve.ts`, DOM-free and tested directly.
  What is missing is the reward: a level up says "Level up!" and nothing else
  happens. Until the avatar and wardrobe exist there is nothing to unlock, and
  the product direction is explicit that a reward at every level only works if
  the levels take real practice — worth re-checking the curve against real
  play once there is something to win. Level is also not shown anywhere
  outside the result screen; the header is the obvious home for it.
- **The avatar and its wardrobe exist; events do not.** A child has a
  character they can make theirs from the first visit — skin tone, hair style,
  hair colour and eye colour — reached by tapping the character in the header,
  and it is drawn from SVG primitives with no image assets, so it stays sharp
  at any size. It is filed per player (`avatar:<owner>`) and carried into an
  account on signup like the rest of their progress.
  None of it is earned, and that is deliberate: research on children's avatars
  finds the act of customising is what builds identification with the
  character, and skin tone and hair are what children reach for to make one
  theirs. Nobody should have to climb a ladder to be allowed to look like
  themselves.
  Items are earned, and now exist: four hats and three pairs of glasses,
  unlocked at levels 2, 3, 4, 6, 8, 10 and 12 — something almost immediately,
  then further apart, because a reward at every turn stops reading as a
  reward. Locked ones are shown rather than hidden, dimmed with a padlock and
  the level they cost, and the chooser names the next one to climb for. A
  level up now says what it handed over. An item above the child's level comes
  off when the character is read, so a hand-edited store cannot wear a crown.
  The parts live in `src/app/avatar/avatar-model.ts`, DOM-free and tested,
  including that every hair style actually covers the crown.
  The character now has shoulders and wears clothes: three shirts at levels 5,
  7 and 9, plus a plain one nobody has to earn — a bare chest is not a
  sensible default. It is drawn in two framings from one model rather than one
  stretched to cover both: the header draws a 44px portrait inside a circular
  clip, where a torso would be cropped away and would shrink the face to pay
  for itself, so clothes get a taller framing used on the chooser and its
  shirt swatches. A test holds the head to the same size in both.
  Seasonal events exist too, in `src/app/events/seasonal-events.ts`: three a
  year — winter, spring and autumn — each granting one item, in a different
  slot, to any child who finishes a round while it is on. Score does not come
  into it; being there is the whole requirement. Locked event items are shown
  with the month they return, never a countdown, and the chooser says plainly
  that nothing is ever gone for good.
  A DELIBERATE DEPARTURE from the product direction, which asks for items
  "obtainable no other way": research on children and time-limited rewards is
  consistent that a window closing forever is the FOMO pattern, tied to
  anxiety and urgency, and now treated by regulators as a consumer-protection
  problem rather than a design choice. The distinction that matters is the
  exit — a thing you can walk away from is entertainment, a thing that
  punishes you for walking away is not. So these events RECUR every year.
  An item is still only earned by being there while its event is on, which is
  what makes it special and a record of when a child played; but a child who
  was ill, on holiday, or not yet playing has lost nothing permanent. If the
  intent really is one-shot exclusivity, this is the decision to revisit.
  What remains: nothing yet shows a child their character outside the chooser
  and the header — the result screen would be the natural place to see who
  they just earned something for. There is also no way to see which events a
  child has been present for as a set, which is the closest thing the game
  would have to a scrapbook.
- **A child can see how far they have come.** "How far you have come", from
  the result screen, shows their character, the level they have climbed to,
  and four numbers: rounds finished, questions answered, answers right, and
  their best round. Plus the things they have earned, counted against
  everything there is to earn.
  Every one of those only ever goes up, and that is the design rather than an
  accident. Research on children and progress feedback is clear that recent
  poor results pile up into a performance loop — a discouraging place with
  lasting effects — where a child stops being able to see that their learning
  is building at all. A line of scores over time is exactly that pile, and on
  a bad week it would tell a child they are getting worse at something they
  are in fact practising more of. So a child sees effort, never a trend, and
  a test asserts no chart is drawn.
  The counts are stored rather than derived (`totals:<owner>`), because
  history keeps only twenty rounds and a child who played fifty should not be
  told they played twenty.
- **No badges or milestones** beyond the three stars of a single round and
  the wardrobe.
- **There is a grown-ups' screen now.** "For grown-ups", reached from a plain
  text link below the ten grade cards, holds everything the child's own
  progress screen deliberately leaves out: the honest round-by-round line with
  the dips in it and a labelled scale, overall accuracy, and the facts being
  missed.

  THE DOOR IS NOT ARITHMETIC. Every parental-gate convention reaches for a
  small multiplication, and in a maths game that turns a locked door into a
  test a child can fail at the exact skill the product exists to make feel
  survivable. The gate asks the adult to read a four-digit number written out
  in words and type it in digits — reading fluency and place value, not
  calculation — and it fails soft: a wrong answer never says "wrong", it
  quietly hands over a different number. `src/app/adults/number-words.ts`
  writes every number from 0 to 9999 in English, Dutch and Spanish (the Dutch
  trema on the "en" seam included), swept in the tests for uniqueness and for
  never printing a digit.

  WHAT IS BEHIND THE DOOR IS A PLAN, NOT A REPORT CARD, and that is the
  research rather than a preference. Maloney et al. (Psychological Science,
  2015) followed first and second graders for a school year: children of
  maths-anxious parents learned significantly less maths and ended the year
  more anxious — but only where those parents reported helping with maths
  homework often. Where anxious parents helped less, there was no effect at
  all, and the parents' own maths knowledge never mattered. Wu et al. (Child
  Development, 2022) adds that parents are least constructively involved
  exactly when a child is struggling. So the harm travels through anxious,
  improvised helping, and a dashboard that hands an adult a list of
  weaknesses and an implied "go and help" recruits precisely the wrong
  parents into precisely the damaging activity. The protective factor in the
  follow-up work is structure.
  Hence: at most three facts, so the ask ends; each one already worked out
  using the game's own `workedStep`, so nobody has to invent an explanation
  on the spot in front of their child; and a short note saying to keep it
  short, stop while it is going well, and that sounding relaxed about maths
  matters more than being good at it. `src/app/adults/practice-plan.ts` is
  DOM-free and tested, including that it never hands back more than three.

  What remains: the way in is a plain link, which is discreet (2400px down a
  390px phone) but not private — a determined older sibling passes the gate.
  There is no per-fact history, so an adult cannot see whether last week's
  three facts stuck. And there is no teacher shape at all: one child per
  device, no class, no export.

### Platform
- **The header fits a phone now.** It used to be 598px across at 390px wide,
  so every screen scrolled sideways. On phones the language buttons show the
  flag alone with the name moved to the accessible label, the controls row
  wraps, and the strapline is dropped: 154px of header at 360, 375 and 390px,
  no overflow from 360px to 1112px, and every control still at least 44px in
  both directions — the label shrinks, the target does not.
  The question screen has now been measured too, and it was spilling 17px off
  each side of a 390px phone: the card was 100% wide with 2rem of padding
  added on top of that. It is border-box now and fits.
  Still outstanding on small screens: the grade cards are around 360px tall
  each, so choosing a grade on a phone is most of a screen per option.
- **Installable, but the update prompt is missing.** The service worker takes
  over immediately on activation (`skipWaiting` + `clients.claim`); a child
  mid-round when a deploy lands gets the new shell on their next navigation
  with no warning. A "refresh for the new version" prompt is the usual fix.
- **Offline is shell-only.** The app works offline because everything it needs
  is static, but login needs the backend, so an offline child cannot sign in.
- **No landscape or large-tablet layout.** Portrait-tuned only.
- **No safe-area padding** for notched devices on the login and result screens.

### Reach
- **Three languages, all reachable and remembered** (English, Dutch, Spanish).
- **Only the UI is translated.** Names, encouragement and money wording are
  translated; nothing adapts currency or number formatting per locale, and
  there is no right-to-left support if a language ever needs it.

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
