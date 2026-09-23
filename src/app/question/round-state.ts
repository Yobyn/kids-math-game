import { MAX_PICKED } from '../teaching/coin-pick';
import { MissedFact } from '../services/progress.service';
import { MoneyQuestion } from '../teaching/money';

/**
 * A round that outlives the tab it was played in.
 *
 * Nothing about an in-flight round used to be kept anywhere. On a desktop
 * that is a small thing; on the phone this game is built for it is not an
 * edge case at all. A call comes in, a parent needs the screen, the bus
 * arrives, the battery goes — and nine answered questions are gone. That is
 * precisely the unearned failure the rest of this game works to avoid.
 *
 * WHY IT IS WORTH THE TROUBLE, and not just tidiness: the peer-reviewed work
 * on children leaving games (Poeller et al., CHI/CHI PLAY, on disengagement
 * from play) finds children struggle to exit a session when they have not
 * reached a point of CLOSURE, and are left unsatisfied by it — and that
 * parents find it hard to act on a session whose state they cannot see. A
 * round torn away at question six is the case with no closure at all. Keeping
 * it is how the closure is given back.
 *
 * WHERE THE OBVIOUS IMPLEMENTATION FAILS. The reflex is to save on `unload`,
 * or on `beforeunload`. Per the platform's own documentation of the page
 * lifecycle, `unload` does not fire at all on mobile Safari or desktop
 * Safari, `beforeunload` only fires on desktop navigations, and none of the
 * three can be relied on when the OS closes a page while the browser is not
 * running. The last signal a page is reliably given is `visibilitychange` to
 * hidden, with `pagehide` next best. So the save points are those two, plus
 * every completed question — never `unload`. The obvious version would have
 * run on every platform except the one this game is for.
 *
 * Kept free of the DOM and of Angular so every rule below — what counts as
 * resumable, what a stale round is, what a corrupt one reads as — can be
 * tested against any clock rather than only this moment's.
 */

/** The quiz is ten questions long. ScoreService.isGameComplete() agrees. */
export const QUESTIONS_IN_ROUND = 10;

/**
 * Bumped when the saved shape changes; an older version reads as nothing.
 * 2: a money question carries its whole self, not just a line of wording.
 */
export const ROUND_VERSION = 2;

/**
 * How long a round stays worth coming back to.
 *
 * Four hours covers a phone call, a meal, the school run and a flat battery
 * — the interruptions this exists for. It does not cover a round from
 * yesterday, and that is deliberate: a child who no longer remembers the
 * question on the screen is not being offered a favour by being put back in
 * front of it, and half-finished work hanging about is its own small weight.
 *
 * This is a limit on how stale STORED STATE may be. It is not a clock on the
 * child: nothing here is ever measured against how long they took to answer.
 */
export const RESUME_WINDOW_MS = 4 * 60 * 60 * 1000;

/**
 * Set by a screen that has already put the choice to the child, so the
 * question screen does not ask the same question twice.
 */
export const RESUME_CHOICE_KEY = 'roundResume';

export type ResumeChoice = 'resume' | 'fresh';

export interface SavedQuestion {
  num1: number;
  num2: number;
  operation: string;
  money?: MoneyQuestion;
}

export interface SavedReplay {
  question: SavedQuestion;
  dueAfter: number;
  reviewOf?: MissedFact;
}

export interface SavedRound {
  version: number;
  /** Epoch milliseconds. The only thing the expiry below is measured from. */
  savedAt: number;
  grade: number;
  difficulty: string;
  /** Whether the child had taken the "a bit easier?" offer in this round. */
  eased: boolean;
  questionsAnswered: number;
  correctAnswers: number;
  score: number;
  streak: number;
  /** Every finished question this round, in order. */
  results: boolean[];
  question: SavedQuestion;
  isReplay: boolean;
  reviewing?: MissedFact;
  missed: SavedReplay[];
  offerSpent: boolean;
  /**
   * Coins already put down on a picking question. A child interrupted four
   * coins into making €1.35 comes back to those four coins; losing them
   * would be the same kind of quiet loss the whole round save exists to
   * prevent, only smaller and more annoying.
   */
  picked?: number[];
  /**
   * True when `question` had already been answered and the child was looking
   * at the answer. Restoring that state would re-ask a question already
   * counted, so a round saved this way resumes at the NEXT question instead.
   */
  answered: boolean;
  /** Tries already spent on `question`, so a second chance is not a third. */
  wrongAttempts: number;
}

function whole(value: any): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

function readQuestion(raw: any): SavedQuestion | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const num1 = Number(raw.num1);
  const num2 = Number(raw.num2);
  if (!Number.isFinite(num1) || !Number.isFinite(num2)) {
    return null;
  }
  if (typeof raw.operation !== 'string' || !raw.operation) {
    return null;
  }
  const question: SavedQuestion = { num1, num2, operation: raw.operation };
  const money = readMoney(raw.money);
  if (money) {
    question.money = money;
  }
  return question;
}

/**
 * A stored money question, or undefined for anything that is not a whole one.
 * A half-read money question would put a pile on the screen that does not add
 * up to its own answer, so it is dropped entirely rather than patched.
 */
function readMoney(raw: any): MoneyQuestion | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }
  const answer = Number(raw.answer);
  const answerCents = Number(raw.answerCents);
  if (!Number.isFinite(answer) || !Number.isFinite(answerCents)) {
    return undefined;
  }
  if (typeof raw.shape !== 'string' || typeof raw.prompt !== 'string' || typeof raw.unit !== 'string') {
    return undefined;
  }
  if (!Array.isArray(raw.pile) || raw.pile.some((piece: any) => !Number.isFinite(Number(piece)))) {
    return undefined;
  }
  const values: { [name: string]: string } = {};
  if (raw.values && typeof raw.values === 'object') {
    Object.keys(raw.values).forEach(name => {
      if (typeof raw.values[name] === 'string') {
        values[name] = raw.values[name];
      }
    });
  }
  // The tray is what makes a picking question answerable at all. Read back
  // without it, the question would come back as a box to type a number into
  // — for a question whose answer is a handful of coins. So a tray that is
  // there must be whole, and one that is not there is simply a question of
  // another shape. (No migration is needed for rounds saved before this
  // existed: the shape did not exist either, so none of them carry one.)
  let tray: number[] | undefined;
  if (raw.tray !== undefined) {
    if (!Array.isArray(raw.tray) || !raw.tray.length) {
      return undefined;
    }
    tray = raw.tray.map((piece: any) => Number(piece));
    if (tray!.some(piece => !Number.isFinite(piece) || piece <= 0)) {
      return undefined;
    }
  }

  // Spread into place rather than assigned afterwards, so the key lands
  // where the interface declares it and a round read and written back out
  // again is byte for byte what it came from
  return {
    shape: raw.shape,
    prompt: raw.prompt,
    values,
    pile: raw.pile.map((piece: any) => Number(piece)),
    ...(tray ? { tray } : {}),
    answer,
    unit: raw.unit,
    answerCents,
    worked: typeof raw.worked === 'string' ? raw.worked : '',
    answerText: typeof raw.answerText === 'string' ? raw.answerText : String(answer),
    summary: typeof raw.summary === 'string' ? raw.summary : ''
  };
}

function readFact(raw: any): MissedFact | undefined {
  const question = readQuestion(raw);
  if (!question) {
    return undefined;
  }
  const fact: MissedFact = { ...question };
  if (typeof raw.due === 'string') {
    fact.due = raw.due;
  }
  if (Number.isFinite(Number(raw.reviews))) {
    fact.reviews = whole(raw.reviews);
  }
  return fact;
}

function readReplays(raw: any): SavedReplay[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const replays: SavedReplay[] = [];
  raw.forEach(entry => {
    if (!entry || typeof entry !== 'object') {
      return;
    }
    const question = readQuestion(entry.question);
    const dueAfter = Number(entry.dueAfter);
    if (!question || !Number.isFinite(dueAfter)) {
      return;
    }
    const replay: SavedReplay = { question, dueAfter: Math.floor(dueAfter) };
    const reviewOf = readFact(entry.reviewOf);
    if (reviewOf) {
      replay.reviewOf = reviewOf;
    }
    replays.push(replay);
  });
  return replays;
}

export function serialiseRound(round: SavedRound): string {
  return JSON.stringify(round);
}

/**
 * A stored round, or null. Null covers every way this can go wrong — nothing
 * stored, unreadable JSON, a shape from a version that no longer exists, a
 * round with no question in it — because all of them mean the same thing to
 * a child: there is nothing to come back to, so play a fresh round. A round
 * store is never worth an error on a screen.
 */
export function parseRound(raw: string | null | undefined): SavedRound | null {
  if (!raw) {
    return null;
  }

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object' || parsed.version !== ROUND_VERSION) {
    return null;
  }

  const question = readQuestion(parsed.question);
  const savedAt = Number(parsed.savedAt);
  if (!question || !Number.isFinite(savedAt)) {
    return null;
  }

  const results = Array.isArray(parsed.results)
    ? parsed.results.map((entry: any) => entry === true)
    : [];

  const reviewing = readFact(parsed.reviewing);
  const picked = readPicked(parsed.picked);

  const round: SavedRound = {
    version: ROUND_VERSION,
    savedAt,
    grade: whole(parsed.grade) || 1,
    difficulty: typeof parsed.difficulty === 'string' && parsed.difficulty
      ? parsed.difficulty
      : 'medium',
    eased: parsed.eased === true,
    questionsAnswered: whole(parsed.questionsAnswered),
    correctAnswers: whole(parsed.correctAnswers),
    score: whole(parsed.score),
    streak: whole(parsed.streak),
    results,
    question,
    isReplay: parsed.isReplay === true,
    missed: readReplays(parsed.missed),
    offerSpent: parsed.offerSpent === true,
    // In place rather than assigned afterwards, so a round written by the
    // question screen and read back is byte for byte what it came from
    ...(picked.length ? { picked } : {}),
    answered: parsed.answered === true,
    wrongAttempts: whole(parsed.wrongAttempts)
  };

  // Left off entirely rather than set to undefined, so that reading a round
  // and writing it back out again gives the same bytes it came from.
  if (reviewing) {
    round.reviewing = reviewing;
  }

  return round;
}

/**
 * Coins already put down, from a store that may hold anything. Nothing here
 * is trusted: a value that is not a positive whole number of cents is
 * dropped, and the whole thing is capped, so a hand-edited store cannot put
 * a thousand coins on the screen.
 */
function readPicked(raw: any): number[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((entry: any) => Number(entry))
    .filter((value: number) => Number.isFinite(value) && value > 0 && value === Math.floor(value))
    .slice(0, MAX_PICKED);
}

/** How old a saved round is. A clock moved backwards reads as brand new. */
export function roundAge(round: SavedRound, now: number): number {
  return Math.max(0, now - round.savedAt);
}

/**
 * Whether this is worth offering back.
 *
 * A round with nothing answered is not: "carry on from question 1" is the
 * same as starting, and putting a choice in front of a child that makes no
 * difference is worse than not asking. A finished round is not either — it
 * belongs on the result screen, not back in play. And a round older than the
 * window has gone cold.
 */
export function isResumable(
  round: SavedRound | null,
  now: number,
  total: number = QUESTIONS_IN_ROUND
): round is SavedRound {
  if (!round) {
    return false;
  }
  if (round.questionsAnswered < 1 || round.questionsAnswered >= total) {
    return false;
  }
  return roundAge(round, now) <= RESUME_WINDOW_MS;
}

/**
 * The question number to put in front of the child, counting from one. A
 * round saved with its question already answered resumes at the next one,
 * so both cases land on the same arithmetic.
 */
export function resumeQuestionNumber(
  round: SavedRound,
  total: number = QUESTIONS_IN_ROUND
): number {
  return Math.min(round.questionsAnswered + 1, total);
}
