import { MissedFact, RoundResult } from '../services/progress.service';
import { workedStep } from '../teaching/worked-step';
import { REVIEWS_TO_GRADUATE, reviewsOf, waitingFacts } from '../teaching/review-schedule';

/**
 * What an adult is shown about a child's practice, and — more importantly —
 * what they are asked to do about it.
 *
 * The obvious design is a dashboard: the trend, the weak spots, and an
 * implied "now go and help". The research says that is the design most likely
 * to do harm. Maloney et al. (Psychological Science, 2015) followed first and
 * second graders across a school year: children of maths-anxious parents
 * learned significantly less maths and ended the year more anxious themselves
 * — but ONLY where those parents reported helping with maths homework often.
 * Where anxious parents helped less, there was no effect at all. The parents'
 * own maths knowledge did not matter. Wu et al. (Child Development, 2022)
 * adds the sting: parents are least constructively involved exactly when a
 * child is struggling, which is exactly when a dashboard would summon them.
 *
 * So the harm travels through anxious, unstructured helping, not through the
 * information. The protective factor in the follow-up work is structure — a
 * short, scripted activity, done and finished.
 *
 * This module is built to produce that shape instead of a report card:
 *   - a small, fixed number of facts, so the ask ends,
 *   - each one already worked out, so an adult never has to invent an
 *     explanation on the spot in front of their child,
 *   - and the honest trend beside it, which belongs here and nowhere a child
 *     can read it.
 */

/** Short enough to finish. Three facts is a five-minute job, not homework. */
export const FACTS_TO_PRACTISE = 3;

/** Below this, one bad answer would read as a pattern. */
const PATTERN_THRESHOLD = 2;

export interface TrendPoint {
  /** ISO date the round was played. */
  date: string;
  percentage: number;
}

export interface PracticeItem {
  /** The fact as it was asked, e.g. "8 + 7" or a money question's wording. */
  question: string;
  answer: string;
  /** One line of method, when the fact has one worth showing. */
  worked?: string;
  /** Times it has been answered right since it was last missed. */
  reviews: number;
  /** Times it needs before it is done with, so the count has a denominator. */
  toGraduate: number;
}

export interface PracticePlan {
  /** Oldest first, dips included. Nobody is protected from this one. */
  trend: TrendPoint[];
  facts: PracticeItem[];
  /** Correct answers as a percentage of all of them, or null before any. */
  accuracy: number | null;
  /** The operation missed most often, when there is enough to call it that. */
  weakest?: string;
  /**
   * Facts that are not due yet. The honest answer to "is it working": one
   * that stuck is not on this list at all any more.
   */
  waiting: number;
}

const SYMBOLS: { [operation: string]: string } = {
  '+': '+',
  '-': '−',
  '*': '×',
  '/': '÷'
};

/** The sign an adult reads, rather than the one the generator stores. */
export function operationSymbol(operation: string): string {
  return SYMBOLS[operation] || operation;
}

export function factAnswer(fact: MissedFact): number {
  switch (fact.operation) {
    case '+': return fact.num1 + fact.num2;
    case '-': return fact.num1 - fact.num2;
    case '*': return fact.num1 * fact.num2;
    case '/': return fact.num2 === 0 ? 0 : fact.num1 / fact.num2;
    default: return 0;
  }
}

/**
 * Turns everything stored about a child into the short plan above. Pure: the
 * same history always produces the same plan, so it can be checked directly.
 */
export function practicePlan(
  history: RoundResult[],
  missed: MissedFact[],
  now: Date = new Date()
): PracticePlan {
  const rounds = (history || []).filter(round => round && Number.isFinite(round.percentage));

  return {
    trend: trendOf(rounds),
    facts: factsToPractise(missed || []),
    accuracy: accuracyOf(rounds),
    weakest: weakestOf(missed || []),
    waiting: waitingFacts(missed || [], now).length
  };
}

/**
 * Oldest first, because a trend read left to right is the only direction an
 * adult will read it. History is stored newest first.
 */
function trendOf(rounds: RoundResult[]): TrendPoint[] {
  return rounds
    .slice()
    // Reverse first, then sort. History is stored newest first, and two rounds
    // finished inside the same millisecond share a timestamp — a stable sort
    // over the reversed list leaves those in the order they were played,
    // rather than backwards.
    .reverse()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map(round => ({
      date: round.date,
      percentage: clampPercentage(round.percentage)
    }));
}

function clampPercentage(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

/**
 * Rounds carry their own totals, so accuracy counts answers rather than
 * averaging percentages — a ten-question round and a three-question one are
 * not the same evidence.
 */
function accuracyOf(rounds: RoundResult[]): number | null {
  const asked = rounds.reduce((sum, round) => sum + Math.max(0, round.total || 0), 0);
  if (!asked) {
    return null;
  }
  const right = rounds.reduce((sum, round) => sum + Math.max(0, round.correctAnswers || 0), 0);
  return clampPercentage((right / asked) * 100);
}

function weakestOf(missed: MissedFact[]): string | undefined {
  const counts: { [operation: string]: number } = {};
  missed.forEach(fact => {
    if (fact && fact.operation && !fact.moneyPrompt) {
      counts[fact.operation] = (counts[fact.operation] || 0) + 1;
    }
  });

  let best: string | undefined;
  Object.keys(counts).forEach(operation => {
    if (counts[operation] >= PATTERN_THRESHOLD
        && (best === undefined || counts[operation] > counts[best])) {
      best = operation;
    }
  });

  return best;
}

/**
 * The most recently missed facts first — those are the ones still live — and
 * never more than a handful, whatever is stored. An adult handed twelve facts
 * does one of two things, and neither of them is three.
 */
function factsToPractise(missed: MissedFact[]): PracticeItem[] {
  return missed
    .filter(fact => fact && Number.isFinite(fact.num1) && Number.isFinite(fact.num2))
    .slice(0, FACTS_TO_PRACTISE)
    .map(toItem);
}

function toItem(fact: MissedFact): PracticeItem {
  const answer = factAnswer(fact);
  const reviews = reviewsOf(fact);
  const toGraduate = REVIEWS_TO_GRADUATE;

  if (fact.moneyPrompt) {
    // A worded problem's method is the wording; there is no one line for it
    return { question: fact.moneyPrompt, answer: `\u20ac${answer}`, reviews, toGraduate };
  }

  const item: PracticeItem = {
    question: `${fact.num1} ${operationSymbol(fact.operation)} ${fact.num2}`,
    answer: String(answer),
    reviews,
    toGraduate
  };

  const worked = workedStep(fact.num1, fact.num2, fact.operation);
  if (worked) {
    item.worked = worked;
  }
  return item;
}
