/**
 * The bonus games a finished round can offer (Yobyn, 2026-10-10: "the two
 * ball games will be randomly selected and given as an option to play after
 * completing a session"). One is picked at random as the round earns it, and
 * kept with it (ProgressService.grantBonus), so coming back to the result
 * screen offers the same one.
 *
 * Small and outside the games themselves: the result screen needs the names
 * and routes, never the games.
 */
export type BonusGame = 'pong' | 'jump';

export const BONUS_GAMES: BonusGame[] = ['pong', 'jump'];

/** Where each is played: both in the bonus screens, fetched only when opened. */
export const BONUS_ROUTES: { [game in BonusGame]: string } = { pong: '/bonus', jump: '/bonus/jump' };

/** What the result screen's button shows before the name. */
export const BONUS_ICONS: { [game in BonusGame]: string } = { pong: '🏓', jump: '🏀' };

export function pickBonusGame(random: () => number = Math.random): BonusGame {
  return BONUS_GAMES[Math.min(BONUS_GAMES.length - 1, Math.floor(random() * BONUS_GAMES.length))];
}

/**
 * The game kept in storage. Anything else that is there is a bonus earned
 * before there was a choice, which was the paddle game.
 */
export function readBonusGame(stored: string | null): BonusGame | null {
  if (stored === null) {
    return null;
  }
  return BONUS_GAMES.indexOf(stored as BonusGame) >= 0 ? stored as BonusGame : 'pong';
}
