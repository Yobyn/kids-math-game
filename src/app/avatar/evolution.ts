import { Avatar, Family } from './avatar-model';
import { GUEST_OWNER, accountOwner } from '../services/progress.service';

/** The families whose character looks different at each stage, and so has an evolution to celebrate. */
export const FAMILIES_THAT_GROW: Family[] = ['kid', 'creature', 'robot'];

/** How long the dressing-up screen celebrates an evolution: as long as the stage takes to play it (motion.ts). */
export const CELEBRATION_MS = 3000;

/** The last stage each family was seen at, by this child: stored per account, like everything else of theirs. */
type Seen = { [family: string]: number };

function owner(): string {
  const username = localStorage.getItem('username');
  return username ? accountOwner(username) : GUEST_OWNER;
}

function key(): string {
  return `evolution-seen:${owner()}`;
}

function read(): Seen {
  try {
    const seen = JSON.parse(localStorage.getItem(key()) || '{}');
    return seen && typeof seen === 'object' && !Array.isArray(seen) ? seen : {};
  } catch {
    return {};
  }
}

/**
 * Notes that the child has now seen their character at the stage it is at,
 * and says which stage it grew from since they last looked, if it did: an
 * evolution to celebrate. Never on the first look (there is nothing to have
 * grown from), never for a family that looks the same at every stage, and
 * never when the child has chosen to stay at an earlier stage.
 */
export function evolvedFrom(avatar: Avatar, earnedStage: number): number | null {
  if (FAMILIES_THAT_GROW.indexOf(avatar.family) < 0) {
    return null;
  }
  try {
    const seen = read();
    const before = seen[avatar.family];
    seen[avatar.family] = earnedStage;
    localStorage.setItem(key(), JSON.stringify(seen));
    return Number.isInteger(before) && before < earnedStage && avatar.stage === earnedStage ? before : null;
  } catch {
    // No storage: nothing remembered, and nothing to celebrate
    return null;
  }
}
