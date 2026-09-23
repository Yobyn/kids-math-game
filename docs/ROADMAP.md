# Where the game stands, and what a finished product still needs

A working note for whoever (or whatever) picks this up next. The improvement
routine reads this before each run, picks from it, and updates it afterwards.

Last surveyed: 2026-09-23. Four things landed that day: an audit of this
whole file, the coin-picking question, the result screen's own memory, and
the first load being cut by 85 kB.
Every claim here was checked against the code that day and every number in it
re-measured — sixteen runs had written into this file and none had ever gone
back. What that cost is recorded under "What the audit found", at the end.

## What works today

- Login and registration against a small Express backend, JWT in `localStorage`.
- Grade (1-10) and difficulty (easy/medium/hard) selection, both reachable by
  keyboard and sized for small hands.
- Ten-question rounds: `+ - × ÷`, scaled by grade and difficulty, with a bonus
  for streaks and two attempts per question.
- Touch number pad on phones and tablets, so the OS keyboard never covers the
  question. Haptics on key press and on answers.
- A wrong answer shows the correct one with effort-focused encouragement.
- Money is a taught strand, not a themed sum: coins and notes on the table to
  count from grade 1, combining coins into an amount, totals and change, and
  the decimal €.p form from grade 4 — with a decimal point on the keypad to
  type it. Money questions carry their own worked line. From grade 2 a child
  is also asked to PUT COINS DOWN to make an amount, tapping them from a
  tray, where any combination that comes to the amount is right.
- English, Dutch and Spanish, chosen in the header and remembered between
  visits.
- Installs to a home screen (manifest, maskable icons, standalone display) and
  keeps working offline through a versioned service worker.
- Rounds are remembered (last 20, in `localStorage`), and the result screen
  shows a personal best — beaten, or quietly displayed when it was not.
- A question missed twice comes back two questions later in the same round,
  once, the way a flashcard goes back a few cards from the front — and is
  kept for a LATER DAY, where it returns near the start of a round (never
  first). Never the same day it was missed: see spacing, below.
- Progress bar through the round; result screen with up to three stars and a
  counted-up percentage.
- Sound and haptics switch in the header, remembered between sessions.
- Drifting math symbols behind every screen; everything motion-related
  respects `prefers-reduced-motion` — in CSS now, with no animation
  framework in the bundle at all.
- The screens that are not the game — the character, progress, the
  scrapbook, the grown-ups' screen and registration — are fetched when a
  child opens them. The game itself is in the first load, so nothing is ever
  waited for between one question and the next.
- A round survives being interrupted: it is written down after every
  question and whenever the page goes away, and offered back — never
  restored silently — for four hours. So does the END of a round: a result
  the child never got to see is shown again, and offered from the grade
  screen, without paying for the round twice.
- Fits a phone on its side, a large tablet, and a device with a notch;
  pinch zoom works.
- A new version never takes over unannounced: it waits, the child is told
  between rounds, and nothing changes until they say yes.
- A book of what actually happened, at `/scrapbook`: the events a child was
  here for, the things they won and the day each arrived, their best round
  and the earliest one still remembered — newest first, with nothing to
  complete and no count of what is left.
- The character has a face of its own: six skin tones, four face shapes, four
  eye shapes, four mouths, nine hair styles and three hair textures that
  compose with all of them, plus hair and eye colour. The page is three
  sections a child moves between rather than one long scroll.
- 1,214 unit tests, 23 build-script tests and 39 server tests, run on every
  PR by GitHub Actions alongside the build.
- THE UNIT SUITE RUNS TWICE: once on the machine's own clock and once with
  `Date` moved on more than a year (`npm run test:future`). A test that writes
  today's date down passes on the day it is written and fails weeks later on a
  branch nobody has touched — which is not hypothetical, see the audit.
- 91.8% of statements covered (85.5% of branches).

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

## Art direction (Yobyn, 2026-09-23)

Every item under "Product direction" has shipped. Seventeen runs built
behaviour and proved it with tests, and nobody once asked whether the result
looked good. It does not. **Look and feel is the priority now**, and this
section is the brief.

Yobyn's words, with two screenshots: the character should "look more like an
indie game, a lot more graphics", and "the hair does not sit great". And:
"I love the background, the particles — if we can incorporate throughout the
game as a theme and also make it interactive when clicking buttons."

**THE PARTICLE FIELD IS THE THEME.** It is the one piece of art in this game
anyone has praised, so it is what the rest of the look should be built out
from. Most of the machinery already exists and a run should read it before
designing anything: `particles/particle-field.ts` is DOM-free maths (a ring
of points, blue `#3880ff` through magenta `#d633eb` by angle, a pulse spent
within ~450ms), `particles.component.ts` draws it on a canvas outside
Angular's zone with `mix-blend-mode: screen`, and `<app-particles>` is
rendered once at the root — so the field is ALREADY behind every screen.
`FieldPulseService` is already the decoupled hook: anything can call
`pulse(0..1)` without knowing particles exist.

So "throughout the game as a theme" is **not about the backdrop**, which is
everywhere already. It is about everything drawn ON TOP of it.

**DONE (2026-09-23): THE THEME REACHES EVERY SCREEN, AND A TEST KEEPS IT
THERE.** Measuring first changed the job. The brief above said to *derive* a
palette from the field — but one already existed. `src/styles.css` had dark
surface tokens whose accents were the field's exact blue and magenta. The
theme had been DESIGNED and then only half ADOPTED: six stylesheets used the
tokens, fourteen ignored them, and between them they hard-coded 73 light
fills. That is why a phone showed white forms on a starfield. Building a new
palette would have duplicated one that was right all along.

So the work was to finish the migration, and then make it impossible to
un-finish. `scripts/theme-tokens.test.js` reads the REAL stylesheets and
fails if any component hard-codes a light background or dark text — the only
way the next run cannot quietly reintroduce a white card. It also holds every
text/surface pair the tokens define to WCAG AA, so "prettier must never mean
harder to read" is now a test rather than a promise.

**Two surface families, named so the choice is not re-argued every run.**
CHROME — headers, selection cards, panels, the score bar, the result screen —
is dark (`--surface`, `--surface-raised`). READING FACES — the question card,
the answer box, the keypad, where a child SOLVES something — stay light,
because dark text on a light face is the most legible thing there is and the
sum outranks the theme. But light no longer means the raw `#ffffff` they all
used: `--surface-read` is tinted toward the field's violet, so it belongs to
the field instead of glaring against it. The grade cards used to be kept
light too, on the reasoning that "they carry the words a child reads". That
reasoning is about legibility, which the test now proves directly, and what a
grade card carries is a label to tap, not a sum to solve.

The header was a 92%-opaque blue-to-purple slab from an earlier design that
hid the field on every screen, edged in a cyan the field does not have. It is
frosted glass over the field now, edged with the ring itself.

**THE SUM FAILED ACCESSIBILITY, AND NOBODY KNEW.** Found while moving the
question card onto its tokens: the operator was orange at 3.16:1 and the
equals sign green at **2.78:1 — below WCAG AA even as large text**, on the
most important line in the game. It is written in the ring's two ends now,
blue numbers and a magenta operator, each deepened until it clears AA, and a
test pins all three. The field's own magenta is only 3.9:1 as text on a light
face, so it could not simply be reused; a test records that too, so nobody
"simplifies" back to it.

**The theme guard caught a bug of mine from the same day.** The "copy on the
account" panel added to the grown-ups' screen by the progress-sync run was a
white box on a dark page, and its "Deleted" confirmation was dark green
`#1f6b3a` on a dark panel — nearly invisible. Both fixed. That is the
argument for the guard.

WHAT IS STILL OUTSTANDING HERE: the tap. The field does not yet answer a
touch — see the next section, whose resolution (two vocabularies) stands and
is unbuilt. And the question card is still the largest light area on screen,
on purpose; that is the reading-face rule working, not something left
undone.

**Making it answer a tap overturns an earlier decision, and the roadmap
should say so rather than pretend otherwise.** `field-pulse.service.ts`
carries the note "Deliberately not fired on every tap: a celebration for a
trivial action stops meaning anything", and only three things pulse today: a
correct answer (0.5), a three-streak (0.85), a finished round (1.0). Yobyn
has asked for tap feedback, so that decision is superseded — but its
reasoning still holds. The way to have both is TWO VOCABULARIES: a tap gets a
small, local, immediate scatter at the point of contact, which reads as the
surface being physical; a reward keeps the full-field surge, which stays
rare. Same field, different gesture. If the two cannot be told apart in a
screen recording, they have been collapsed and the point is lost.

One implementation trap: the particle host is `pointer-events: none` and must
stay that way, or it swallows every tap in the game. The field cannot listen
for clicks — interaction has to be pushed to it, by extending
`FieldPulseService` so a pulse can carry a point.

**THE CHARACTER'S HAIR PROBLEM IS STRUCTURAL**, so it cannot be fixed by
editing path strings. In `avatar/avatar-model.ts`, `HAIR_PATHS` is keyed only
by hair style and `FACE_PATHS` only by face shape, and both are absolute
coordinates over the same 100x100 box — so the hair silhouette is identical
whatever face is under it. Nine hair styles times four face shapes is 36
combinations and only `round` was ever tuned; on `square` and `heart` the
hair floats above the skull or cuts into it, and even on `round` it reads as
a cap sitting on top, because the hairline is a straight-ish chord across a
curved crown. The ears are fixed circles (cx 22/78, cy 55, r 7) that no hair
style knows about. What this needs is a head geometry the parts share — a
scalp curve and a hairline per face shape that hair styles are expressed
against — so hair is drawn ON a head rather than NEAR one. That is testable:
every one of the 36 combinations should be provably seated, with no gap above
the crown and no hair inside the face outline.

The character is also flat: every fill is one solid colour, there is no
shading, no outline on the silhouette, one hard white glint per eye, and the
torso is a single blob. "A lot more graphics" means depth. Keep it SVG and
keep it cheap — no raster art, no animation library.

**THE GRADE SCREEN WAS TEN IDENTICAL CARDS — DONE (2026-09-23).** Each was
the same white box with the same 📚 emoji, told apart only by a rainbow
stripe that meant nothing. Now each grade is a point on the particle ring:
`theme/palette.ts` walks from the field's blue (grade 1, `#3880ff`) to its
magenta (grade 10, `#d633eb`), using the SAME colour function the field
draws with (`fieldColour`, exported from `particle-field.ts` for this), so
the grades are literally on the ring behind them rather than lookalikes. A
glowing numbered badge in that colour replaced the emoji. The difficulty
screen walks the same ring in three steps, so an ordered choice looks like
one everywhere in the game.

The copy is fixed in all three languages: it rendered "Maths for 1 students"
— counting children rather than naming a year group — and now reads "Maths
for grade 1" / "Wiskunde voor groep 1" / "Matemáticas para el grado 1". The
two keys that built the broken sentence, `mathematics-for` and `students`,
are deleted rather than left for someone to reassemble.

Still outstanding: the card does not say what is IN each grade. That needs
the question generator's content per grade written down in one place, which
it is not — money is the only strand with explicit bands — so writing ten
descriptions per language now would mean guessing, and a wrong one is worse
than none.

**What does not bend for any of this.** Prettier must never mean harder to
read: question and answer surfaces stay high-contrast, and a decorative
change that costs contrast is not an improvement. Do not darken the card or
keypad faces. Everything that moves respects `prefers-reduced-motion`, and
for tap feedback that means OFF, not smaller. Decoration may not eat a 44px
touch target. Nothing interrupts a question — a burst under a keypad key is
fine, a full-screen surge mid-question is not. Identity is never earned and
never locked: skin, face, hair and their colours stay free at level 1 however
the art changes. Per-tap work must be bounded, so a child mashing the keypad
cannot allocate without limit.

**And art costs bytes.** The initial bundle has **5.05 kB** of headroom
(494.95 kB against a 500 kB error budget, measured 2026-09-23 after the theme
migration, which cost 1.61 kB: a `var(--token)` is longer than the hex it
replaces). The particle field is eager, so anything added there lands in the
first load. `question.component.css` is 5.23 kB against a 6 kB ERROR, so
0.77 kB of room.

CORRECTION to what this section said this morning: deleting the dead code
does NOT pay for anything. `src/app/app/`, `translation-keys.ts`,
profile-creation and `pokemon.service` are imported by nothing, so webpack
already tree-shakes them out of the bundle — removing them saves ZERO bytes.
It is worth doing for clarity, not for budget. What actually frees room is
something that IS in the first load, measured first with `mapsize.js`. Never
raise the budget.

**How to know whether any of this worked.** A green suite has never once told
anyone this game is ugly. Screenshot before, screenshot after, and read both
images. For the character, render a contact sheet of many combinations at
once — one avatar in isolation hides exactly the fitting problem Yobyn saw.
For motion, take a burst of frames a few milliseconds apart and read them in
order; a single screenshot cannot show whether a tap did anything.

## Outstanding — roughly in the order a real product would need them

### Content and teaching
- **Money is a taught strand now, and it follows the published progression.**
  It used to be one shape of question per band in whole euros: add two prices
  from grade 2, work out change from grade 4, and nothing else ever. No
  coins, no cents, no decimals, and no worked line at all.
  THE PROGRESSION IS NOT A GUESS. The national curriculum programmes of study
  for mathematics, and the teaching-for-mastery material built on them, set
  it out: Years 1-2 recognise the coins and combine them to make an amount,
  with pounds and pence kept SEPARATE and deliberately no decimal point;
  Year 3 adds and subtracts mixed units and gives change, still recorded
  separately, with the pence part never reaching 100; Year 4 is where the
  decimal £.p form is introduced formally. Practitioner guidance on counting
  coins adds the prerequisite — a mixed pile rests on SKIP COUNTING, so a
  child meets one denomination before two and two before a handful.
  So `src/app/teaching/money.ts` holds a band per grade, five question shapes
  (count a pile, make an amount from one coin, PUT COINS DOWN to make an
  amount, total two prices, give change), and the rule that decides how an
  amount is written. Grade 1 gets
  one denomination and nothing else; grade 2 gets a second and "how many 20c
  coins make €1"; grade 3 gets mixed units, totals and change written as
  "€4 and 15c"; grade 4 writes "€4.15".
  THE ONE RULE THAT SHAPES THE TYPED SHAPES: below the decimal band every
  TYPED answer must be a whole number in ONE unit — so many cents, or so many
  euros, never "3 euros 40". That is the curriculum's own separation rule
  rather than a workaround, and questions are BUILT to satisfy it rather than
  generated and rejected. The unit sits on the answer box (`c` after, or `€`
  in front), so a child is never left guessing whether 75 or 0.75 is wanted.
  THE PICKING SHAPE IS EXEMPT, and that is the point of it rather than a
  loophole: nothing is typed, so nothing has to be typeable. "Put down coins
  to make €1 and 26c" is a question the answer box could not ask at all
  below grade 4, and it is exactly the mixed-unit recording Year 3 does. A
  test asserts such questions really are generated, so the new shape cannot
  quietly decay into a second way of entering what the box already accepted.
  The keypad grew a decimal point for the bands that need one — the minus
  key swapped for it rather than a thirteenth key added, because no money
  answer here is ever negative and a thirteenth key narrows all the others on
  a phone. 3.4 and 3.40 both count, and the comparison is done in whole cents
  so no float ever decides whether a child was right.
  MONEY QUESTIONS HAVE A WORKED LINE NOW, which this roadmap recorded as
  missing: a counted pile is added up one piece at a time, and change is
  counted UP from the price to what was handed over, which is how it is
  taught. Every printed line is read back as arithmetic by the tests.
  Coins are drawn all the same size on purpose. Children read value off size,
  and the real euro set does not even agree with that — a 5c coin is
  physically larger than a 10c. Colour and the printed value separate them,
  and the €1 and €2 are drawn the way round they really are.
  A CHILD PUTS COINS DOWN NOW — the shape this file called "the one practical
  shape the curriculum names that a number pad cannot express". From grade 2,
  a question asks for an amount and gives a tray to tap from, a purse that
  fills, and a running total. `src/app/teaching/coin-pick.ts` is DOM-free and
  holds the rules; `src/app/money/coin-picker.component.*` draws it.
  ANY COMBINATION THAT COMES TO THE AMOUNT IS RIGHT, which is the whole
  design rather than a leniency. The Year 2 objective, in the curriculum's
  own words, is to "combine amounts to make a particular value" and to "find
  different combinations of coins that equal the same amounts of money", so a
  child who makes 75c as 50+20+5 and one who makes it as 20+20+20+10+5 have
  both done exactly what was asked. Marking one canonical set right would
  teach the opposite of the objective.
  THE FEWEST-COINS VERSION IS THE WORKED LINE, NOT THE MARK SCHEME. The NCETM
  unit does raise fewest coins — "what do the children notice about making
  88p in the fewest number of coins?" — as something to notice. So it is what
  the screen shows after two honest attempts, along the same rule every other
  worked line follows, and never what decides whether a child was right.
  NO COUNT OF COINS APPEARS ANYWHERE, deliberately: a count invites hunting
  for a shorter answer, which is a different lesson from the one being
  taught. A test pins that too.
  An amount one coin makes on its own is never asked. Two 10s make 20c and
  20c is a coin, so a child could have answered by finding the single 20 and
  combined nothing; those roll again. The tray also leaves out any coin
  bigger than the amount, which could never be part of a right answer.
  THE SAME UNIT TEST CANNOT SEE A BORDER THAT IS INVISIBLE. The empty purse
  was first drawn with a white dashed edge copied from a rule written for a
  dark surface — on the white question card it simply was not there, and
  every test passed. A browser found it in one screenshot. It is dark now,
  and a test reads the computed border's luminance against the card.
  STILL OPEN: the pieces are drawn, not photographed, so a child does not
  meet the real faces; nothing adapts the currency — see Reach, below; and
  the picking screen is 1.44 screenfuls in landscape against the typed
  screen's 1.24, so "Check Answer" sits just below the fold there.
- **Difficulty advises, and stops short of adapting.** Rounds now record the
  setting they were played at, and the difficulty screen marks a card when
  recent play says the child is on the wrong rung: two rounds at 85% or better
  suggests a step up, two at 50% or worse a step down, one step only, and
  nothing at all for the wide middle in between. The child still chooses —
  every card stays exactly as choosable, because a system that overrules what
  a child picked produces the frustration adapting was meant to prevent.
  The rules are in `src/app/levels/difficulty-tuner.ts`, DOM-free and tested.
  A ROUND NOW ADAPTS TOO, AND IT ASKS BEFORE IT DOES. After three questions
  wrong in a row — with at least three left to play, and only where there is
  a rung below the one being played — the game puts one question on the
  screen: "Would you like the rest a bit easier?" Yes drops the remaining
  questions one rung; no changes nothing. It is asked once a round at most,
  whichever way it is answered.
  THE OBVIOUS DESIGN WAS TO DO IT SILENTLY, and the research says not to. The
  85% rule (Wilson et al., Nature Communications 2019) does say a child far
  below the sweet spot is close to the worst place to learn, so something
  should give. But quietly easing the remaining questions is rubber-banding,
  and the games literature is consistent that it backfires: players notice
  difficulty being adjusted for them even when nobody tells them, and once
  noticed it makes the rest of the win feel unearned — it takes away the
  sense of having overcome something, which is what a struggling child has
  least of. The remedy that work converges on is visibility, not better
  concealment. It would also break this game's own rule, that it advises and
  never overrules: a silent mid-round change is overruling, invisibly.
  Because the switch is announced and chosen, the child knows exactly which
  questions were easier, and nothing after it is quietly discounted.
  A round that changed part way through is recorded with NO difficulty at
  all (`EASED_KEY` in `src/app/levels/in-round-tuner.ts`), because it cannot
  answer "how hard was it" and must not become evidence about which rung the
  child belongs on. The child's stored choice is left alone: the offer is
  about the rest of this round, not about what they play next.
  GRADE IS REVISITED NOW TOO, and three decisions in
  `src/app/levels/grade-tuner.ts` are worth keeping straight.
  It only ever points UP. A grade is a school year, so telling a child to go
  down one is a statement about them rather than about the questions — and it
  is not needed, because the difficulty ladder already handles "this is too
  hard" without touching the grade, and asks rather than tells. Up and down
  look symmetrical and are not. A sweep asserts no history at any grade and
  any score can ever produce a downward suggestion.
  It WAITS FOR THE DIFFICULTY LADDER TO RUN OUT: grade and difficulty are two
  dials on the same thing, and the cheaper, safer one comes first. Only three
  rounds at the TOP rung, all at 90% or better, mark the next grade's card —
  a higher bar and more rounds than a difficulty step, because moving a whole
  year is a bigger claim. The card is marked and given a line; every other
  card stays exactly as choosable.
  It DOES NOT MEASURE SPEED, which is the obvious way to tell "knows it" from
  "got there eventually". Boaler's Fluency Without Fear reports that for
  roughly a third of students the onset of timed testing is where maths
  anxiety begins, and Beilock's imaging work finds time pressure blocks the
  working memory the facts are held in, so a child under the clock cannot
  reach facts they know. The evidence is contested — there are no clean
  experiments proving timed tests cause anxiety — but either way a timer buys
  a better signal with exactly the thing this game exists to avoid. Accuracy
  over several rounds is noisier and is the right trade.
  DELIBERATELY NOT BUILT: a mid-round "shall we make it harder" to mirror the
  easier offer. It looks like the symmetric case and is not. The downward
  offer exists because drowning is harmful right now; interrupting a child who
  is doing well, to ask whether they would like to do worse, turns a good run
  into a decision they can regret — and a child who says yes and then slips
  has spoilt their own round by choosing. The upward nudge belongs between
  rounds, where nothing is at stake, and that is where it now is.
  What is still missing: the suggestion is read from the grade last played, so
  a child who has never finished a round sees nothing, which is right; but a
  child who switches grades often will keep resetting the three-round window.
- **Spacing is measured in days now, and the intervals are EQUAL.** A missed
  fact used to come back "next round" — a month later, or ninety seconds
  later if the child kept playing. Ninety seconds later is massed practice,
  which is the one thing the spacing literature is unambiguous about. A fact
  is now due a day after it was missed, so a child playing five rounds in one
  sitting meets it in none of them and meets it tomorrow. Answered right on
  three separate days, it is learned and leaves the queue; missed again, it
  goes back to the beginning.
  THE ROADMAP USED TO ASK FOR EXPANDING INTERVALS — a day, then three, then a
  week — which is what every flashcard app builds. The evidence does not
  support the complexity. Karpicke and Roediger (Psychonomic Bulletin &
  Review, 2014) compared expanding against equal-interval retrieval over the
  long term and found no reliable advantage for expanding; Logan and Balota
  (2008) found the expanding advantage appears during the learning session
  and is gone after a day, with expanded items at a DISADVANTAGE for younger
  learners. What the meta-analytic work does support is the absolute gap:
  spacing beats massing, and the size of the lag does the work, not the shape
  of the ladder. So the ladder is flat and the gap is the feature.
  `src/app/teaching/review-schedule.ts` is DOM-free and tested against any
  date. A fact stored before any of this existed reads as due now, which is
  the truth about it.
  A visible consequence, and a deliberate one: a single sitting now contains
  far less review than it used to. Rounds two through five of an afternoon
  are all new questions. The work moved to tomorrow.
  The grown-ups' screen says how far each fact has got ("Right so far: 1 / 3")
  and how many are waiting for their day, which is the closest thing there is
  to "did last week's three stick".
  What is missing: the within-round replay is untouched and still immediate —
  a fact missed twice comes back two questions later in the same round, which
  is retrieval practice rather than spacing and belongs where it is. There is
  also no sense of a fact being harder than another: every fact gets the same
  gap and the same three reviews, which is exactly the simplification the
  evidence licenses but would be worth revisiting if a child ends up stuck on
  one fact forever.
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
  ten) rarely see one. Money questions used to get none at all; they now
  carry their own, built where the question is (see Money, above).

### Keeping a child coming back
- **The game remembers what happened now.** `/scrapbook` is a record, reached
  from the progress screen: the events a child was present for, the items
  they won, the day each arrived, their best round and the earliest one the
  history still holds. Newest first.
  WHAT WAS MISSING WAS NOT A PAGE, IT WAS THE DATA. Earned events were a list
  of bare ids and items were never recorded at all — only derived from the
  level a child happens to be at now, which can say WHAT they have and never
  WHEN they got it. So `events:<owner>` now carries a date and
  `keepsakes:<owner>` is new, written at the moment an item is won.
  THE DATES BEFORE TODAY ARE GONE AND THE BOOK SAYS SO. Anything earned
  before this reads as "A while ago" rather than being given an invented
  date, and those entries sort to the end. A made-up date in a book of what
  really happened is worse than an honest gap.
  IT IS NOT A SET TO COMPLETE. The progress screen already counts items
  earned against items in all; this one never does, and shows no count of
  what is left. Habgood and Ainsworth (Journal of the Learning Sciences,
  2011) found children learned more from a game whose reward WAS the subject,
  and spent seven times longer at it freely, than from one where the reward
  sat alongside the learning — so this records the maths that was done and
  what it won, rather than becoming a second game about collecting. The
  collecting literature that does exist is mostly about what keeps adults
  buying, and this project has already turned down the countdown version of
  that in `seasonal-events.ts`.
  THREE THINGS A BROWSER FOUND that the tests did not: the seasonal events
  had NO NAMES AT ALL — there was no `event-*` string anywhere, so every
  event entry rendered nameless; "You won this" was printed under the best
  round and the earliest round, neither of which is a thing you win; and the
  way out said "Back to Grade Selection" while going to the progress page.
  STILL OPEN: the book is 2.3 screenfuls in landscape and will grow as a
  child plays, so it will want the landscape treatment the other pages got.
  The earliest round it can show is the oldest of the twenty kept in history,
  not the first ever played — it is worded as "the earliest round in here"
  for that reason, but a child who has played more than twenty rounds has a
  first round the game cannot name.
- **Guest play is done end to end.** A child takes "Play without an account"
  on the login screen, plays full rounds, and after three of them the result
  screen offers an account below the celebration — once, and not again if it
  is waved away. Signing up moves their rounds and missed facts into the
  account and empties the guest slot. Progress is now filed per player
  (`roundHistory:guest`, `roundHistory:user:<name>`), so two children on one
  tablet no longer share a history. AND AN ACCOUNT NOW REALLY DOES FOLLOW A
  CHILD TO ANOTHER DEVICE — see the next bullet. The signup offer, which for
  sixteen runs was worded carefully not to promise that, now says it, and a
  test on the result screen holds both halves: that it says it, and that a
  finished round really is sent.
- **Levels exist, and the wardrobe hangs off them.** Rounds earn experience and
  experience earns levels, shown on the result screen as a badge, a bar and a
  "Level up!" on the round that crosses. A round always pays — ten for
  finishing plus two per correct answer — so a child who scores nothing still
  climbs, at a third of the pace of a perfect round. Levels cost one round's
  worth more each time, capped at eight rounds' worth so the ladder never
  becomes a grind. Experience is stored per player (`xp:<owner>`), not derived
  from history, which is capped at twenty rounds. The curve lives in
  `src/app/levels/level-curve.ts`, DOM-free and tested directly.
  WHAT THIS BULLET USED TO SAY — that a level up says "Level up!" and nothing
  else happens — stopped being true two runs later, when the wardrobe landed,
  and nobody came back to say so. Levels now hand over hats, glasses and
  shirts, and the result screen names what was won.
  What is genuinely missing: the product direction is explicit that a reward
  at every level only works if the levels take real practice, and the curve
  has never been checked against a real child's pace now that there is
  something to win. Level is shown on the result screen, on the progress
  screen and, as a price, in the chooser — but not in the header, which is
  still the obvious home for it.
- **The avatar, its wardrobe and its events all exist.** A child has a
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
  THE PAGE HAD NO FRONT DOOR, and that was worth more than anything on it.
  Yobyn asked for "an avatar page where you can change the way you look" — it
  had existed for several runs, which said plainly that the page was not the
  problem. Measured: on every screen, the ONLY route to it was
  `.welcome-icon`, a 45px circle in the header with an `aria-label` and NO
  VISIBLE TEXT AT ALL. Its border was `2px solid transparent` until `:hover`,
  and a phone has no hover. So on the devices this game is built for, the one
  route to the character never looked like a button — and the page was more
  discoverable to a child using a screen reader than to a child looking at it.
  Now: a named, drawn button on the grade screen (the screen a child starts
  on) and another on the result screen, plus a ring on the header circle that
  is there without hovering.
  THE RESULT SCREEN ONE CHANGES ITS WORDS. It already said "You unlocked the
  Cap" and then offered no way to go and wear it; on a round that handed
  something over the button reads "Put it on" and takes a visible border.
  The research CONFIRMS rather than contradicts here, and that is worth
  saying: Zhang et al. (CHI 2025, "Understanding Children's Avatar Making in
  Social Online Games") find children's avatar-making is driven by
  self-representation and identity exploration rather than collecting, and
  describe a "wardrobe effect" — children make several avatars but use one
  favourite consistently. That is an argument FOR what is already here (one
  character, identity free, items earned on top) and AGAINST adding avatar
  slots. It is also why the entrance is permanent rather than appearing only
  when something is unlocked: a trophy cabinet opens when you win something,
  but this is meant to be you.
  SKIN TONE ALONE WAS NOT REPRESENTATION, and the page behaved as if it were.
  Six skin tones, and then one face, one mouth, one eye shape and four hair
  shapes — short, long, curly and a bun — every one of which is the same
  hair. Work on inclusive avatars (Mack et al., CHI 2023, and the EGAL
  guidance drawn from it) is explicit that changing skin colour is not enough
  to represent people of colour, because the shapes of eyes, mouths,
  HAIRSTYLES and HAIR TEXTURES are key physical characteristics too. A child
  could tint the character their colour and still not find themselves in it.
  Zhang et al. (CHI 2025) separately record that children ask for more
  hairstyle options than games give them.
  So: nine hair styles, and the five added are the point — an afro, tight
  coils, braids, locs and a buzz. And four face shapes where there was a
  hard-coded circle: round, oval, square, heart.
  THE SCREENSHOT CAUGHT WHAT THE TEST DID NOT. The first square and heart
  faces passed a bounding-box test and were indistinguishable at 44px, because
  a bounding box cannot see a jaw. The shapes were redrawn with real
  silhouettes, and the test now samples the fill at the brow, the cheek and
  the chin and requires any two faces to differ across that profile. Two of
  the new hair styles also failed the crown sweep — which now runs over every
  face shape as well as every style, since a style that covers the round face
  can still leave the taller oval one bare.
  `round` is exactly the circle the face used to be, and a character saved
  before any of this has no `faceShape` at all, so it reads as round and looks
  identical to what its owner left.
  EVERYTHING THIS BULLET ONCE LISTED AS REMAINING IS DONE, and it took the
  audit to notice. Eye shape and mouth shape became choices, hair texture
  became its own axis, the long scroll became three sections, and the set of
  events a child has been present for became `/scrapbook` — all in later
  runs, none of which came back to strike the lines out here. Four paragraphs
  of "what remains" that a reader would have believed. See "the character,
  finished" below for what is actually left of it.
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

  What remains: the way in is a plain link, which is discreet but not private
  — a determined older sibling passes the gate. (It is no longer 2400px down a
  390px phone: the grade screen is 1267px in total now, so the link sits
  within the second screenful.)
  THE PAST TENSE EXISTS NOW. "What stuck" lists the facts learned in the last
  seven days, with the same wording and the same answers as the three to
  practise. `src/app/teaching/learned.ts` is DOM-free and `learned:<owner>`
  holds it; the record is written at the exact moment `afterReview` returns
  nothing, which is the moment a fact leaves the queue and used to be the
  moment the only trace of it disappeared.
  WHY IT BELONGS ON THIS SCREEN rather than being a nice extra: the whole
  design rests on an adult keeping to a small, bounded, scripted activity
  instead of improvising, because Maloney et al. (Psychological Science,
  2015) found the harm travelling through anxious, frequent, unstructured
  helping. A plan whose results you never see is a plan you stop doing, and
  the thing that would decay is precisely the structure. There is a 2022
  Early Childhood Research Quarterly paper on parent practice WITH FEEDBACK
  being the instructional strategy that actually moves parent behaviour
  (10.1016/j.ecresq.2022.09.010), but its abstract was not readable from
  here — it is named rather than leaned on.
  IT IS NOT A SCORE, A STREAK OR A TARGET, and a test asserts all three: no
  percentage, no chart, no goal. It is a short list that empties itself as
  the days age out, and a quiet week says so plainly — "nothing has finished
  this week yet", with the reason — rather than showing a zero.
  A fact learned, missed and learned again counts ONCE, with the later day;
  two entries would read as two different facts and overstate a week.
  STILL OPEN: the window is a fixed seven days and nothing compares one week
  to the next, deliberately — a comparison is the first step to a target.
  And there is no teacher shape at all: one child per device, no class, no
  export.

### Platform
- **The header fits a phone now.** It used to be 598px across at 390px wide,
  so every screen scrolled sideways. On phones the language buttons show the
  flag alone with the name moved to the accessible label, the controls row
  wraps, and the strapline is dropped: 154px of header at 360, 375 and 390px,
  no overflow and every control still at least 44px in both directions — the
  label shrinks, the target does not. Re-swept 2026-09-23 across eleven
  widths from 320px to 1180px and seven screens: no horizontal overflow
  anywhere, and nothing tappable under 44px at 360px wide. The range this
  file claimed (360 to 1112) was narrower than what actually holds.
  The question screen has now been measured too, and it was spilling 17px off
  each side of a 390px phone: the card was 100% wide with 2rem of padding
  added on top of that. It is border-box now and fits.
  The grade screen has now been measured and fixed. It was ONE card per row
  at 390px — the container's 2rem padding plus the grid's own 1rem left 294px,
  which is not enough for two 150px tracks — so ten cards ran 183px each and
  the page was 2522px, three screenfuls, with "For grown-ups" 2414px down.
  Two columns of compact cards, with the description hidden on phones because
  it only says the heading again in more words, brings that to 128px a card
  and a 1073px page. The card's accessible label still carries the full name.
  Re-measured 2026-09-23 with six rounds of history behind it, the grade
  screen is 1267px — 1.5 screenfuls. The difference is the "Carry on at
  Grade 3" button and its heading, which a child who has never played does
  not see: the 1073px figure was measured on an empty slate and is the
  first-visit number, not the usual one.
  The screen now carries up to three offers above the cards — an unfinished
  round, an unseen result, and the grade last played — and each costs about
  77px: 1344px (1.59 screenfuls) in portrait and 683px (1.75) in landscape
  with the result offer showing. None of them is permanent; each appears only
  when there is something behind it, and a first visit still sees none.
  MORE TO THE POINT, A CHILD WHO HAS PLAYED BEFORE NO LONGER CHOOSES AT ALL.
  The result screen deliberately clears the stored grade to force a fresh
  selection, so every single round began with ten cards. Guidance on
  children's interfaces lands on three to five options a screen, and this was
  ten before a child could do anything. So the last grade played — read from
  history rather than storage, because storage is what gets cleared — is
  offered as one button at the top: "Carry on at Grade 3". The full list
  stays directly below it, because this offers and does not decide.
  Also fixed while measuring: the header's sign-in button was 43px tall, one
  pixel under the minimum this project holds itself to.
- **A round now survives the real world.** It used to hold everything in
  memory alone: a phone call, a locked screen or a backgrounded tab lost it,
  and on a phone that is not an edge case. The obvious fix is a save on
  `unload`, and it would have run on every platform except this one — per
  the page lifecycle documentation `unload` never fires on Safari, mobile or
  desktop, `beforeunload` only fires on desktop navigations, and none of
  them run when the OS closes a page while the browser is not running. So
  the round is saved on `visibilitychange` to hidden (the last reliable
  signal), on `pagehide`, and after every answer.
  It is OFFERED BACK RATHER THAN RESTORED, at both doors a child can come
  back through: the question screen itself, when the OS reloaded the tab
  underneath them, and the grade screen, when the app was closed and
  reopened. Restoring silently hands a child a mystery; starting fresh
  silently loses their work. Four hours is the window — long enough for a
  meal, a school run or a flat battery, short enough that a round whose
  question they no longer remember is not put back in front of them.
  Grounded in the disengagement research (Poeller et al., CHI PLAY / CHI):
  children struggle to leave a session they have not reached CLOSURE in, and
  a round torn away at question six has none at all.
  COINS ALREADY PUT DOWN COME BACK TOO. A child four coins into making an
  amount gets those four coins back, not an empty purse. That took two fixes
  in the same parser, and both were found by a test rather than by reading:
  `parseRound` rebuilds its object field by field and silently dropped
  `picked`, and one level down `readMoney` did the same to the question's
  TRAY — which is worse, because a picking question read back without its
  tray returns as a box to type a number into, for a question whose answer is
  a handful of coins. Anything a store hands back is still distrusted: coins
  that are not positive whole numbers are dropped, the list is capped, and a
  tray that is present but broken voids the whole question rather than
  showing an empty one.
  THE END OF A ROUND SURVIVES NOW TOO, which is what this file had been
  calling "a round interrupted after the tenth answer is not offered back".
  `src/app/result/result-state.ts` is DOM-free and `result:<owner>` holds it.
  WHAT WAS BEING LOST WAS NOT PROGRESS, IT WAS ACKNOWLEDGEMENT, and that
  distinction is the research rather than a turn of phrase. Everything a
  finished round earned was already safe — the round went into history, the
  experience was added, a level's items and an event's item were recorded —
  and if the phone took the screen away between the last answer and the
  result, none of it was ever SHOWN. Poeller et al. (Proceedings of the ACM
  on Human-Computer Interaction / CHI PLAY 2024, "Disengagement From Games",
  peer-reviewed) find that satisfying exits happen at STRUCTURAL ENDPOINTS —
  a level completed, a round finished — and that the exits players describe
  as bad are the ones where effort went UNACKNOWLEDGED; avoidance of progress
  loss was the strongest single facilitator of a good exit in their survey.
  A finished round whose result was never seen is exactly that bad case.
  IT IS PAID FOR ONCE, and that is the whole engineering risk of it. What is
  stored is what to SAY, never what to give: showing the result again reads
  the history, the experience, the level's items and the event, and writes
  none of them. A test asserts every one of those is unchanged after a second
  showing, and removing the branch that separates the two paths fails six.
  IT IS OFFERED ONLY IF IT WAS NEVER SEEN. Once a child has read their
  result, putting it back in front of them is not closure, it is a repeat —
  so the grade screen's offer disappears the moment the screen has been
  opened, or the moment the child picks a grade. The result itself stays
  readable at `/result` for four hours, the same window a round is offered
  back for.
  THE ACCOUNT OFFER IS SUPPRESSED on a result being shown again. It belongs
  to the moment a round is finished; an hour later, on a screen a child is
  seeing because something interrupted them, it is an ambush.
  A BUG THIS UNCOVERED, and it had been there the whole time: a bare visit to
  `/result` — a reload with nothing in memory — rendered `NaN%` AND recorded
  a round with no questions in it, which inflated "rounds finished" on the
  progress screen. That screen's numbers only ever go up by design; one of
  them was going up for rounds nobody played. The screen now leaves for the
  grade cards instead.
  STILL OPEN: an interrupted round is not carried into an account at signup —
  it is deliberately let go, on the grounds that the child is in the middle of
  it right now under whichever name.
- **The character is FEATURE-complete, and the page that makes it is
  navigable — but it does not look good, and "finished" was the wrong
  word (struck 2026-09-23; see Art direction).** Every option below
  exists and works; the art they are drawn with does not hold up, and the
  hair does not sit on the head at all. Read the Art direction section
  before touching any of it.
  The inclusive-avatar work (Mack et al., CHI 2023) names four physical
  characteristics that skin tone cannot stand in for; two were done and two
  were not. EYE SHAPE was one pair of circles on every child and MOUTH SHAPE
  one curve. Both are choices now, four of each, and `round` and `smile` are
  exactly what was drawn before, so nobody's saved character moved.
  HAIR TEXTURE IS ITS OWN AXIS NOW, which means long coily hair exists — it
  could not before, because texture was bundled into the style and the only
  coily options were short ones. The obvious design was a silhouette per
  style per texture: twenty-seven hand-drawn shapes, and incoherent anyway,
  because five of the nine styles (afro, coils, braids, locs, curly) ARE a
  texture and a texture control over them asks the same question twice.
  Instead the texture is a rim along the hair's own outline — a dash pattern
  in a lighter tint of the hair colour, so it composes with every style at
  the cost of no new paths. Smooth draws no rim at all.
  THE PAGE IS THREE SECTIONS: your face, your hair, things to wear, in that
  order. It was eight rows in one column — 1862px at 390px wide, 2.2
  screenfuls, 3.7 in landscape, the longest screen in the game — and every
  row was equally present and none of them findable. Fu et al. (2025,
  preprint: 48 children aged 8-13, interviews and observed play) put
  SELF-REPRESENTATION first among four reasons children make avatars, so the
  parts that make a face look like a particular child do not belong at the
  bottom of a scroll. After: 1.4-1.6 screenfuls in portrait (re-measured
  2026-09-23 at 1.57), and 1.43 on a tablet — this file said 1.0 there, which
  was either measured on a different tablet size or written from hope. The
  avatar page is the longest screen in the game on every viewport measured.
  Everything earned is in the third section and nothing earned is anywhere
  else, so two of the three can be opened without ever meeting a lock — a
  test pins that, along with "every part of the character is in exactly one
  section", which is the failure this splits into.
  STILL OPEN: the page is 2.3-2.9 screenfuls with the phone on its side, so
  the sections helped but did not finish the job there; the swatch rows are
  what is left to lay out. The texture rim reads as beads or coils at the
  edge of the hair rather than through it, which is a stylisation rather
  than a likeness, and a child with fine wavy hair will not find it exactly.
- **A new version waits to be let in.** The service worker used to call
  `skipWaiting()` the moment it installed and `clients.claim()` the moment it
  activated, so a deploy landing mid-round took over the page without a word:
  the running app and the cache it fetched from came from two different
  builds. The documented pattern (Workbox, "Handling service worker updates",
  Chrome for Developers) is the opposite — do not skip waiting, tell the
  person, and take over only on their say-so — and that is what happens now.
  THE PROMPT WAS DEAD CODE WITHOUT A BUILD STEP, which is the part that had to
  come first. A browser decides whether a worker changed by comparing the
  bytes of the script, and `src/service-worker.js` is copied into the build
  verbatim: identical on every deploy. `registration.waiting` therefore never
  appeared and there was nothing to detect. `scripts/stamp-service-worker.js`
  stamps a hash of the built `index.html` into it after `ng build`, so the
  worker changes when and only when the app does — a comment-only source edit
  that minifies away correctly produces no update at all. It also fixes a
  second thing: `CACHE_VERSION` was the literal `math-game-v1` forever, so
  `activate` never had an old cache to clear.
  WHEN A CHILD MAY BE TOLD is this game's own decision, and the answer is
  never while a question is on screen. A round survives a reload now, but a
  reload mid-round lands them on the resume card, so accepting there would
  swap one interruption for two. It is offered on the grade and result
  screens and nowhere else. A "later" is remembered against that exact
  version; a newer one asks again, because that is a different question.
  FOUR BUGS THIS FOUND, none of them visible to a unit test — all four came
  from running two real builds against a real service worker:
  `main.ts` registered a SECOND `PwaService` with `new`, so the instance the
  app shell asked about updates never learned anything; `clients.claim()` on
  a first install fired `controllerchange` and reloaded the game the first
  time a child ever opened it; the route stayed `/` for the whole session
  because the initial navigation completes before `ngOnInit` subscribes to
  the router; and the version reply arrives on a `MessagePort`, whose
  `onmessage` zone.js does not patch, so the state was right and the screen
  never re-rendered.
  STILL OPEN: the update is only noticed when the browser re-checks the
  worker — on navigation, or roughly daily — so a child who never closes the
  tab may not be told for a while. Nothing polls for it, deliberately: a
  background check every few minutes to tell a child about a deploy is a lot
  of machinery for very little.
- **Offline is shell-only.** The app works offline because everything it needs
  is static, but login needs the backend, so an offline child cannot sign in.
- **It fits a phone on its side now, and a large tablet.** It was portrait-
  tuned only, and the measurements were bad: at 844x390 the question screen
  ran to 1072px of page — 2.7 screenfuls — with THE KEYPAD KEYS, Check Answer
  and Back all below the fold. A child holding the phone sideways could not
  see the thing they answer with. The grade screen was 3.8 screenfuls, the
  login screen put its own sign-in button off the bottom, and the result
  screen hid all three ways onward.
  THE RULE IS "SHORT", NOT "LANDSCAPE", and that distinction is the whole
  design. A tablet on its side is landscape with 820px of height to stack in;
  a phone on its side is landscape with 390. `(orientation: landscape)`
  cannot tell them apart and they want opposite layouts. So
  `src/app/layout/screen-fit.ts` decides between `stack`, `short` and `wide`
  from the size, `LayoutService` publishes it as `data-fit` on the document,
  and `src/fit.css` holds every rule that keys off it — one file, so the
  landscape layout can be read in one place instead of reconstructed from
  eight stylesheets.
  IT IS AN ATTRIBUTE RATHER THAN A MEDIA QUERY FOR A SECOND REASON: karma
  opens one window and cannot resize it, so a layout written only in media
  queries cannot be tested at all. Setting the attribute is what lets a test
  assert that the keypad really does move beside the sum.
  After: question 1.3 screenfuls (was 2.7) with the keypad reachable, grade
  1.6 (3.8), progress 1.6 (2.1), difficulty 1.1 (1.5), result 1.9 (3.0). On a
  tablet in landscape the question screen went from 1.3 screenfuls with the
  Check button below the fold to 1.2 with nothing below it.
  The header was the worst single offender: its compact layout was keyed on
  `max-width: 600px`, and a phone in landscape is 844 WIDE — so the smallest
  screen the game ever sees got the tablet header, strapline and all, for
  about 150 of its 390 pixels.
  A PICKING QUESTION HAS NO KEYPAD, so the 168px column held open for one
  would have been an empty gutter beside a single narrow column. The card
  drops to one column for that shape and the PICKER splits itself instead:
  the purse on the left, the tray on the right, which is the pair a child
  looks between. The coins are never shrunk to fit — 56px is above the 44px
  floor and a coin a child taps is the last thing to compress.
  RE-MEASURED 2026-09-23, and these held: question 1.24 screenfuls in
  landscape (claimed 1.3), grade 1.55 (1.6), difficulty 1.08 (1.1), login
  1.58 (1.6), scrapbook 2.27 (2.3). The picking question measures 1.22 in
  portrait and 1.44 in landscape, where "Check Answer" falls just below the
  fold. Progress came out at 1.67 against a
  claimed 1.6, which is the seeded history rather than drift. The result
  screen was not re-measured — reaching it means finishing a round — so its
  1.9 is the one landscape number here still taken on trust.
  STILL OUTSTANDING: the login screen is 1.6 screenfuls in landscape and its
  secondary links sit below the fold; the result screen is 1.9; the avatar
  page is 3.7, and that is the page's shape rather than the layout's — see
  "the character, finished", which is where the sectioning belongs. The
  question screen's own Back link is the one control still below the fold in
  landscape, which is the right one to lose if any must be.
- **Safe areas are asked for now.** `viewport-fit=cover` is in the viewport
  meta, which is what makes `env(safe-area-inset-*)` mean anything at all —
  measured before the change, `env(safe-area-inset-top, 99px)` came back as
  `0px` rather than the fallback, so any safe-area CSS would have been dead
  code that looked alive. The insets are applied once on the body (sides and
  bottom) and on the header (top), rather than per screen.
  NOT VERIFIED ON REAL HARDWARE: a headless browser reports zero insets, so
  what is proved here is that the values are asked for and applied, not that
  they look right on a notched phone.
- **Pinch zoom works again.** The viewport meta carried
  `maximum-scale=1.0, user-scalable=no`, which fails WCAG 1.4.4 and takes
  away the one thing a low-vision player has. The usual reason to add it is
  iOS zooming when an input under 16px is focused; every input here is
  already 1rem, so there was nothing being protected. A test pins the
  viewport string against both flags coming back.
  `index.html` IS PINNED NOW. The constant was asserted and no test read the
  file, so the two could drift silently — this file said so for three runs and
  no run closed it. `scripts/index-html.test.js` reads the real file, checks
  the meta tag against `VIEWPORT_CONTENT`, and fails on `user-scalable`,
  `maximum-scale` or a second viewport tag appearing. It runs in CI with the
  other script tests and needs no browser.

### Reach
- **Three languages, all reachable and remembered** (English, Dutch, Spanish).
- **Only the UI is translated.** Names, encouragement and money wording are
  translated; nothing adapts currency or number formatting per locale, and
  there is no right-to-left support if a language ever needs it.

### Code health
- **Accounts survive a restart now.** `server/store.js` keeps them in one JSON
  file and the routes read and write through it.
  NOT THE MONGOOSE MODEL that has been sitting unwired in `models/User.js`,
  and that is the decision rather than a shortcut. The server holds a
  username, a password hash and an optional email — every scrap of a child's
  actual progress is in their own browser and none of it is sent there.
  Standing up a database server to keep three fields per account means nobody
  can run the game without also running Mongo, which is a large part of why
  the README could never say how to start it. If this ever has to scale past
  one process, that is the moment to reach for it, and the model is still
  there.
  THE FAILURE THAT DESIGN HAS IS NOT SIZE, IT IS DURABILITY: a process that
  dies part way through rewriting the file leaves it truncated, and truncated
  here means every account is gone — the exact problem this was meant to fix.
  So a save writes a temporary file, fsyncs it, and renames it over the real
  one; rename is atomic on POSIX, so a reader sees the whole old file or the
  whole new one and never half of either. A test replaces `fs.renameSync`
  with a throw and asserts the file on disk is untouched.
  A corrupt file throws on startup rather than quietly starting empty, which
  would hand the next child to register somebody else's username and silently
  drop the rest. Ids are never reused, so a stale token cannot start pointing
  at a different person.
  Registering and signing in also validate their input now: `bcrypt` throws on
  `undefined`, which turned a missing field into a 500 with a stack trace in
  the body.
  THE SERVER IS IN CI — 39 tests with `node --test`, which
  needs no dependencies. It was never covered, which is how an unwired
  database model and a `const users = []` sat in it unnoticed.
  `server/data/` is gitignored and must stay that way.
  The account now survives a restart, which is what "an account that cannot
  be logged back into is a promise half kept" actually asked for.
- **PROGRESS FOLLOWS A CHILD BETWEEN DEVICES NOW** (2026-09-23). For sixteen
  runs this was the one thing an account was for and the one thing it did not
  do. `server/progress-store.js` and three routes on `server/server.js` do it.

  **The considered answer this was waiting on is the work, and it is a short
  list rather than a long one.** KEPT: the last twenty rounds, experience,
  lifetime totals, events the child was here for, the things they won, and
  their character — what a child would notice missing on a new phone. NEVER
  KEPT: `missedFacts`, `learned`, the round in play and the last result. The
  practice queue rebuilds itself from a few days' play, and "what this child
  is bad at" is the most sensitive thing this game knows; a child getting 8+7
  wrong is not knowingly engaging a server. That line is the ICO Age
  Appropriate Design Code's standard 8, quoted in the file it governs. A guest
  syncs nothing at all. Retention is the account's lifetime. Deleting is a
  button on the grown-ups' screen, not a support request, and it removes the
  server's copy only — what is on the device is the child's.

  **The rule that makes it safe is that the device is the authority.** The
  client merges and puts the result; the server never merges. A pull fills
  gaps and takes the higher of numbers that only rise, so it can add but never
  take away. The subtle part, which would have quietly doubled every child's
  experience: this is NOT the guest-adoption merge. Adopting a guest SUMS xp
  and totals, because that is two identities' separate earnings being
  combined. Two devices are two copies of ONE identity, so summing counts the
  same round twice, and again on every sync — here numbers take the maximum.
  Rounds are deduplicated by their timestamp for the same reason; without it
  ten syncs mean ten copies of every round and the real history falls off the
  end of the twenty-round cap. Both of those have a test that fails if the
  rule is changed back.

  **The account id comes from the token and never from the request**, so
  asking for another child's progress is not something the API can express.
  There is a test per verb for that, and they were written twice: the first
  pair passed against a server that happily read `?userId=` off the query
  string, because the test named the other child by username and the store
  keys by numeric id. Real account ids are small numbers and trivial to guess.

  **It costs 6.84 kB of the initial bundle** — measured, by building
  `origin/main` in a worktree and comparing: 486.50 kB before, 493.34 kB
  after, against a 460 kB warning and a 500 kB ERROR budget. That leaves
  6.66 kB. The next run that adds anything to the eager path breaks the
  build, and that is the budget working as intended rather than a problem
  with it — so the next feature of any size has to start by moving something
  off the initial bundle, not by raising the ceiling.
  (Superseded 2026-09-23: the theme run spent 1.61 kB of it; 5.05 kB is left.
  See Art direction.)

  Verified in two real browsers against a real server: device A pushes, a
  brand-new device B signs in and has the rounds, level, keepsake and
  character, B earns more and A picks it up without losing its own missed
  facts, and deleting empties the server while the device keeps everything.
  That run also caught something no unit test had: an avatar arriving from the
  server goes through the same level gate as one chosen here, so a hand-edited
  store is not a way to arrive wearing a crown.
- **No lint setup.** Angular 12 dropped the default; nothing enforces style.
- **`server/node_modules` is committed** — 1,888 files of dependencies in
  version control. It is why the server's CI step skips installing: a fresh
  checkout already has them, and everything the server actually requires
  (express, cors, body-parser, jose, bcryptjs, nodemailer, dotenv) loads from
  it on Linux. It said `jsonwebtoken` here until the audit; the server has
  used `jose` since before that line was written.
  MONGOOSE DOES NOT. It was committed from a case-insensitive filesystem, so
  `lib/collection.js` asks for `./connectionstate` while the file on disk is
  `connectionState.js`, and `require('mongoose')` throws on any Linux
  checkout. Nothing requires it, so nothing notices — but it is a second
  reason the unwired model was never going to be a five-minute job.
  Untracking the directory is a large, mechanical diff that deserves a run of
  its own rather than riding along with a behaviour change.
- **`body-parser` is required but not declared** in `server/package.json`; it
  resolves transitively through express today and would stop the moment that
  changed.
- **The keypad is its own component now** (`src/app/keypad/`), which was the
  fix for `question.component.css` sitting 280 bytes under the 6 kB
  per-component ERROR budget — the next thing added to that screen would have
  failed the build rather than warned. 5.72 kB → 4.81 kB, and the keypad's
  own stylesheet is 1.3 kB.
  THE STYLES HAD TO TRAVEL WITH THE MARKUP, and that is the trap in this
  refactor rather than an implementation detail. Angular's default emulated
  view encapsulation scopes a component's CSS to its own template by
  rewriting the selectors with a generated attribute, so any `.keypad` rule
  left behind in the question screen's stylesheet would simply have stopped
  matching. The version of this change that moves the HTML and not the CSS
  compiles, passes a shallow test, and is broken the moment anyone opens it
  on a phone. A test now reads the computed style of a real key.
  The answer-box rules came out too, into `src/app/keypad/answer-entry.ts`:
  what a key does to what is typed is a pure string transform, and it was
  tangled up with the field it edited, so the only way to test "does the
  minus toggle" was to build the whole quiz screen. It is swept now — every
  key from every state of the box — and holds three invariants the old code
  only implied: never more than six digits, never a minus anywhere but the
  front, and always undoable back to empty.
  THE SAME TRAP CAUGHT THE SAME WAY AGAIN, and the precedent held: the
  coin-picking UI's rules took `question.component.css` to 5.23 kB, over its
  warning and heading for the 6 kB error. It became
  `src/app/money/coin-picker.component.*` instead, exactly as the keypad did,
  and the screen's stylesheet went back to 4.91 kB. The rule this file has
  been repeating is worth stating plainly: when the question screen grows a
  new piece of furniture, the furniture becomes a component.
  What remains, re-measured 2026-09-23: `question.component.css` is 4.91 kB,
  over the 4 kB WARNING budget and 1.09 kB under the 6 kB error. The progress
  bar and the score display are the next candidates if it creeps back up.
  `result.component.css` has quietly joined it at 4.29 kB, which this file
  never recorded.
  THE `initial` BUDGET IS MET NOW, and getting there meant finally looking at
  what was in the bundle. It had been over for many runs, printed on every
  build, and written down by none until the audit; it reached 569.28 kB.
  569.28 kB → 484.22 kB (2026-09-23), in two moves.
  FIRST, `@angular/animations` WAS 65 kB OF THE BUNDLE — 12.3% — and it
  bought two entrance effects: a fade-and-slide on the feedback line and a
  fade-and-scale on the Check button. The feedback one was bound with
  `:enter`/`:leave` on an element that has no `*ngIf`, so it ran ONCE on
  first render and never again. Both are four lines of CSS keyframes in
  `src/styles.css`, and dropping `BrowserAnimationsModule` took 72 kB off the
  first load on its own. The one thing Angular's animations did for free was
  respect `prefers-reduced-motion`; in CSS that has to be asked for, and it
  is, and a browser check confirms the rules really do turn off.
  SECOND, THE SCREENS THAT ARE NOT THE GAME ARE FETCHED WHEN THEY ARE OPENED.
  `/register`, `/avatar`, `/progress`, `/scrapbook` and `/grown-ups` are
  lazy routes with their own modules; sign in, grade, difficulty, question
  and result stay in the first load, because a child who is playing must
  never wait for a network fetch between one question and the next. That
  moved another 43 kB into five chunks, and a browser confirms the game loop
  fetches none of them while the five screens each fetch exactly one.
  THE HONEST NUMBER IS THE COMPRESSED ONE. Angular's budget counts raw bytes;
  what a child on a slow connection waits for is the transfer. Initial
  JavaScript went from 158.3 kB to 140.0 kB gzipped. The commonly cited
  mobile guidance (web.dev / Addy Osmani, platform documentation rather than
  a study) is under ~170 kB compressed for interactive-in-five-seconds on
  slow 3G; this was 12 kB inside that and is now 30 kB inside it.
  THE BUDGET WAS TIGHTENED RATHER THAN LEFT SLACK: the `initial` error was
  1 MB, which nothing was ever going to hit, so it now stops the build at
  500 kB — the line this app had already crossed — with a warning at 460 kB
  that still fires today and is meant to. Lowering a budget is the opposite
  of the rule this file keeps repeating about never raising one.
  THE TRANSLATION TABLE WAS MEASURED AND DELIBERATELY LEFT ALONE (2026-09-23).
  `src/app/services/language.service.ts` is 22.2 kB and holds every string in
  English, Dutch AND Spanish, which looks like the obvious next lever. It is
  not. Compressed — the number a child on a slow connection actually waits
  for — the two unread languages come to 4.9 kB: the three blocks together
  gzip to 7.8 kB and English alone to 3.0 kB, because they share keys and
  structure and compress against each other.
  AND THE GAME WORKS OFFLINE, which is what settles it. A lazily fetched
  locale would have to be precached by the service worker for a Dutch or
  Spanish child to keep playing on a train — so the bytes would be
  downloaded anyway and only the parse cost would move. The cost of the
  change is a `translate()` that is no longer synchronous, or a bootstrap
  that waits on a second request, and a flash of missing text for exactly
  the children who are not reading the default language.
  3.5% of the first load, against a new offline hazard for two thirds of the
  languages. If this is ever revisited it should be because the app has many
  more languages, not because 22.2 kB looks large in a source file.
- **A console error on a page whose service worker is unregistered and
  reloaded underneath it**: `Cannot read properties of undefined (reading
  'skin')`, from the character in the header. Seen 2026-09-23 while measuring
  the bundle, and CONFIRMED PRE-EXISTING by running the same probe against
  `origin/main`, which produces it identically. It does not reproduce on a
  cold load or on direct navigation to any of the nine screens, so it is
  written down rather than guessed at: something renders the header with no
  avatar while the worker is being swapped, and `[avatar]="avatar"` passes
  `undefined` over the component's own default.
- **Dead code**, all four confirmed still dead on 2026-09-23: `src/app/app/`
  (a leftover scaffold — `AppModule` imports `./app.component`, not this one),
  `src/app/types/translation-keys.ts` (a second `TranslationKeys` union that
  nothing imports), and `profile-creation` + `pokemon.service`, which no route
  reaches and which `AppModule` does not declare.
  NONE OF IT IS IN THE BUNDLE — checked 2026-09-23 by searching the
  production build for `pokemon`, `PokemonService` and `profile-creation`:
  zero hits. Nothing imports it, so webpack drops it. Deleting it is worth
  doing for clarity and saves exactly zero bytes; an earlier version of this
  file suggested it as a way to pay for art, which was wrong.
  `profile-creation` was listed as a headline FEATURE in the README until this
  run — "allow children to create their own profiles" — for a component no
  child can reach. Dead code is cheap; dead code a document promises is not.
- **Coverage is 91.8% of statements** (85.5% of branches, 91.6% of lines),
  re-measured 2026-09-23. It was recorded here as "~50%" for sixteen runs,
  which is what a number written once and never re-read is worth.
  The thin files are real, though, and they are the two this file has always
  named: `register.component.ts` at 14.3% and `login.component.ts` at 36%.
  The language selector, the third name on that list, is now above 96% and
  should come off it.
- **The README is rewritten, and what it used to say is the point.** This
  file recorded it as having "no run instructions". It had them. They told a
  new contributor to install MongoDB, listed it as a prerequisite, and gave
  `MONGODB_URI` as an environment variable to set — for a server that has
  kept its accounts in a JSON file since the store landed, and whose vendored
  `mongoose` cannot even be required on Linux. It also offered `npm run e2e`,
  which is not a script in this project, and `npm run dev` for the server,
  which needs a `nodemon` that is not installed.
  Wrong instructions are worse than missing ones: missing instructions make
  somebody ask, and wrong ones make them spend an afternoon installing a
  database the game has no use for.
  Every build and test script now carries
  `NODE_OPTIONS=--openssl-legacy-provider` itself, as `start` already did, so
  the flag is no longer something a reader has to know. What remains: the
  README describes the game rather than the code's shape, and there is still
  no contributing note about where a change belongs.

## What the audit found (2026-09-23)

Sixteen runs had written into this file. None had ever read it back. This run
checked every claim against the code and re-measured every number in it, and
the result is worth recording, because the failure is structural rather than
careless: each run corrected the part of the file it was working on and left
the rest exactly as it found it, including the paragraphs its own change had
just made false.

**A test had already broken the build, and the clock did it.** The suite was
red on `main` at the start of this run, on a commit nobody had touched since
it went green. A test in `adults.component.spec.ts` recorded two facts as
missed on `new Date(2026, 8, 22)` and asserted both were "waiting for
tomorrow" — but the component asks the REAL clock what day it is, so the
assertion held on the 22nd of September and failed on the 23rd. It was written
on the day it describes.

**A second one would have gone red for about forty-five days a year**, and
only a browser on a different date could have found it. `result.component.spec.ts`
asserted that a round which crossed no level "handed nothing over" — true on an
ordinary day, false during every winter, spring and autumn event, because
finishing a round while an event is on wins the event's item whatever the
score. It would have started failing on 25 October and stopped on 2 November,
for nobody's mistake, and the obvious diagnosis — a flake — would have been
wrong twice over.

**So the suite now runs twice**, the second time with `Date` moved on more
than a year (`src/testing/shift-clock.ts`, `npm run test:future`, and a step
in CI). A test may read the clock; plenty do and should. What it may not do is
assume what the clock says. Running the same specs on a different day is what
tells those two apart, and it is the only thing that can: the failure is
invisible on the day the test is written, which is the day it is run. Both
bugs above were caught by its first execution. The whole suite was then swept
across ten future dates — every event window, both sides of a leap day, a year
end and a month end — and is green on all of them.

The shift is 400 days, not a round year, so a test cannot survive by landing
on the same date in a later year. It costs about four seconds.

**What else was wrong, in rough order of how badly:**

| This file said | The truth on 2026-09-23 |
| --- | --- |
| Coverage ~50% of statements | 91.8% |
| README has no run instructions | It had them; they told you to install MongoDB |
| The service worker takes over immediately on activation | It waits to be let in — two bullets, opposite claims |
| Events do not exist; eye shape, mouth shape and hair texture are fixed; the character page is one long scroll; there is no way to see the events a child was present for | All six were done in later runs that never came back to strike them out |
| Levels: "nothing hangs off them yet" | The whole wardrobe hangs off them |
| Level is shown only on the result screen | Also on the progress screen |
| The server requires `jsonwebtoken` | It requires `jose` |
| `server/node_modules` is 1,935 files | 1,888 |
| `question.component.css` is 4.81 kB | 4.91 kB — and `result.component.css` is over the warning budget too, which was never recorded |
| (nothing) | The `initial` bundle has been 55 kB over its warning budget for many runs, printed on every build, written down by none |
| No overflow from 360px to 1112px | No overflow from 320px to 1180px — the claim was narrower than the truth |
| The character page is 1.0 screenfuls on a tablet | 1.43 |
| `index.html` is not pinned by any test | It is now — that line had been a standing item for three runs |

Three of those (the two date bombs and the budget warning) were live defects,
not documentation drift. The rest were false statements that a person reading
this file to decide what to work on would have acted on.

**What this changes about how the file is kept.** Two of the corrections above
are now machine-checked rather than promised: `scripts/index-html.test.js`
pins what `index.html` must say, and `npm run test:future` pins the suite's
independence from the calendar. That is the only kind of claim that stays
true on its own. Everything else here is prose, and prose rots — so a run that
changes behaviour should strike out the lines its change makes false, in the
same commit, rather than adding a new paragraph below them.

The numbers above have a date on them for the same reason. A number without
one reads as current forever.
