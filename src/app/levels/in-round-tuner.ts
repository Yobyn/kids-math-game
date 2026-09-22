import { Difficulty, DIFFICULTY_ORDER, isDifficulty, step } from './difficulty-tuner';

/**
 * When to offer a child an easier rest of the round, kept free of the DOM so
 * the rule can be tested against any run of answers.
 *
 * A round asks ten questions at one setting whatever happens, so a child
 * drowning on question three drowns for another seven. The 85% rule (Wilson
 * et al., Nature Communications 2019) says that is close to the worst place
 * to learn: there is a sweet spot around 85% right, and far below it learning
 * slows and the child disengages.
 *
 * The obvious fix is to quietly make the remaining questions easier. That is
 * rubber-banding, and the games literature is consistent that it backfires:
 * players notice difficulty being adjusted for them even when nobody tells
 * them, and once noticed it makes the rest of the win feel unearned — it
 * takes away the sense of having overcome something, which is exactly what a
 * struggling child has least of. The remedy the work converges on is not
 * better concealment but visibility.
 *
 * It would also break this game's own rule, which is that it advises and
 * never overrules: a silent mid-round change is overruling, invisibly.
 *
 * So nothing here changes anything either. It says when there is enough
 * evidence to ASK, once, and the child answers. Because the switch is
 * announced and chosen, the child knows exactly which questions were easier,
 * and nothing that comes after it is quietly discounted.
 */

/**
 * Three wrong in a row. A rate over ten questions is too noisy to read this
 * early — two misses is a bad patch — but a run of three is what drowning
 * actually feels like, and it cannot happen by accident.
 */
export const MISSES_IN_A_ROW = 3;

/**
 * Marks a round whose difficulty changed part way through. Such a round
 * cannot answer "how hard was it", so the between-round suggestion must not
 * read it as evidence — it is recorded with no difficulty at all.
 */
export const EASED_KEY = 'difficultyEased';

/**
 * Below this many questions left the offer buys nothing: the round is nearly
 * over, and interrupting it to say "shall we make the last two easier" is
 * all cost.
 */
export const MIN_QUESTIONS_LEFT = 3;

export interface OfferState {
  /** Every finished question this round, in order: true if it was right. */
  results: boolean[];
  /** The setting the round is currently running at. */
  difficulty: string;
  totalQuestions: number;
  /** True once the child has answered the offer, either way. */
  spent: boolean;
}

/** The last run of wrong answers, however long. */
export function missesInARow(results: boolean[]): number {
  let run = 0;
  for (let index = results.length - 1; index >= 0 && results[index] === false; index--) {
    run++;
  }
  return run;
}

/** One rung easier, or undefined when there is no such rung. */
export function easierThan(current: string): Difficulty | undefined {
  return isDifficulty(current) ? step(current, -1) : undefined;
}

/**
 * Whether to put the offer in front of the child now. Every condition here is
 * a reason NOT to ask, which is the right default: the round they chose is
 * what they get unless the evidence is real.
 */
export function shouldOfferEasier(state: OfferState): boolean {
  if (state.spent) {
    return false;
  }

  if (!easierThan(state.difficulty)) {
    // Nothing easier to offer; the bottom rung is the bottom rung
    return false;
  }

  const left = state.totalQuestions - state.results.length;
  if (left < MIN_QUESTIONS_LEFT) {
    return false;
  }

  return missesInARow(state.results) >= MISSES_IN_A_ROW;
}

/** The settings an offer could ever be made at, for anyone enumerating them. */
export function difficultiesWithSomethingEasier(): Difficulty[] {
  return DIFFICULTY_ORDER.filter(difficulty => !!easierThan(difficulty));
}
