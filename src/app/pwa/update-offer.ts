/**
 * When a child may be told that a new version of the game has arrived, kept
 * free of the DOM so the rule can be checked without a service worker.
 *
 * WHAT WAS HAPPENING. The service worker called `skipWaiting()` the moment it
 * installed and `clients.claim()` the moment it activated, so a deploy landing
 * while a child was playing took over their page without a word: the running
 * app and the cache it was fetching from came from two different builds, and
 * the next navigation swapped the shell underneath them.
 *
 * The documented safe pattern (Workbox, "Handling service worker updates",
 * Chrome for Developers — platform documentation) is the opposite: do NOT
 * skip waiting, let the new worker sit in `waiting`, tell the person, and
 * only on their say-so post it a message asking it to take over — then reload
 * when `controllerchange` fires.
 *
 * THE PART THAT IS THIS GAME'S OWN DECISION is when "tell the person" is
 * allowed to happen, and the answer is NEVER WHILE A QUESTION IS ON SCREEN.
 * A round survives a reload now, but a reload mid-round lands the child on
 * the resume card — so accepting an update mid-question would replace one
 * interruption with two. Between rounds it costs nothing at all, so that is
 * where it is asked, and nowhere else.
 *
 * And a child who says no is not asked again about the SAME version. They are
 * asked again about a newer one, because that is a different question.
 */

/** Where the child is allowed to be told. Both are between rounds. */
export const OFFER_ROUTES = ['/grade', '/result'];

/** The version a child has already said no to, if any. */
export const DECLINED_KEY = 'updateDeclined';

/** What the app asks a waiting worker for, and what it tells it to do. */
export const VERSION_REQUEST = 'version';
export const SKIP_WAITING = 'skipWaiting';

export interface OfferState {
  /** True once a new version is installed and waiting to take over. */
  ready: boolean;
  /** The current route, as the router reports it. */
  route: string;
  /** The waiting version's own name, or null if it did not say. */
  version: string | null;
  /** The version the child has already declined, or null. */
  declined: string | null;
}

/**
 * Whether to put the offer in front of the child right now.
 *
 * A version with no name is still offered: not knowing which build is waiting
 * is a reason to be careful about remembering a refusal, not a reason to let
 * a child keep playing an old one.
 */
export function mayOffer(state: OfferState | null | undefined): boolean {
  if (!state || !state.ready) {
    return false;
  }
  if (!onOfferRoute(state.route)) {
    return false;
  }
  return !isDeclined(state.version, state.declined);
}

/** True where the route is one of the places between rounds. */
export function onOfferRoute(route: string): boolean {
  const path = basePath(route);
  return OFFER_ROUTES.indexOf(path) >= 0;
}

/**
 * Whether this exact version is the one they already turned down. A version
 * that cannot name itself is never treated as declined, because "no" to an
 * unknown build would silence every build after it.
 */
export function isDeclined(version: string | null, declined: string | null): boolean {
  return !!version && !!declined && version === declined;
}

/** The path alone: query strings and fragments are not part of the decision. */
function basePath(route: string): string {
  const raw = (route || '').split('?')[0].split('#')[0];
  const trimmed = raw.length > 1 && raw.charAt(raw.length - 1) === '/'
    ? raw.slice(0, -1)
    : raw;
  return trimmed.charAt(0) === '/' ? trimmed : '/' + trimmed;
}
