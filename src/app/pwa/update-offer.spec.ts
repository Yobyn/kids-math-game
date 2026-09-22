import {
  DECLINED_KEY,
  OFFER_ROUTES,
  OfferState,
  SKIP_WAITING,
  VERSION_REQUEST,
  isDeclined,
  mayOffer,
  onOfferRoute
} from './update-offer';

const ROUTES = ['/grade', '/result', '/questions', '/difficulty', '/avatar',
                '/progress', '/login', '/register', '/grown-ups', '/events'];

function state(over: Partial<OfferState> = {}): OfferState {
  return { ready: true, route: '/grade', version: 'math-game-abc', declined: null, ...over };
}

describe('when a child may be told a new version has arrived', () => {
  it('says nothing while there is nothing waiting', () => {
    expect(mayOffer(state({ ready: false }))).toBe(false);
  });

  it('offers it between rounds', () => {
    expect(mayOffer(state({ route: '/grade' }))).toBe(true);
    expect(mayOffer(state({ route: '/result' }))).toBe(true);
  });

  it('NEVER offers it while a question is on screen', () => {
    // A round survives a reload, but a reload mid-round lands the child on
    // the resume card — so accepting here swaps one interruption for two
    expect(mayOffer(state({ route: '/questions' }))).toBe(false);
  });

  it('offers it on exactly two screens and no others', () => {
    ROUTES.forEach(route => {
      const expected = route === '/grade' || route === '/result';
      expect(mayOffer(state({ route }))).toBe(expected, route);
    });
  });

  it('ignores a query string or a fragment on the way', () => {
    expect(mayOffer(state({ route: '/result?from=round' }))).toBe(true);
    expect(mayOffer(state({ route: '/grade#top' }))).toBe(true);
    expect(mayOffer(state({ route: '/questions?resume=1' }))).toBe(false);
  });

  it('ignores a trailing slash', () => {
    expect(onOfferRoute('/grade/')).toBe(true);
    expect(onOfferRoute('grade')).toBe(true);
  });

  it('is not fooled by a route that merely starts the same way', () => {
    expect(onOfferRoute('/grades')).toBe(false);
    expect(onOfferRoute('/grade-select')).toBe(false);
    expect(onOfferRoute('/resulting')).toBe(false);
  });

  it('does not ask twice about the same version', () => {
    expect(mayOffer(state({ version: 'v7', declined: 'v7' }))).toBe(false);
  });

  it('does ask again about a newer one, because that is a new question', () => {
    expect(mayOffer(state({ version: 'v8', declined: 'v7' }))).toBe(true);
  });

  it('offers a version that will not name itself', () => {
    // Not knowing which build is waiting is a reason to be careful about
    // remembering a refusal, not a reason to leave a child on an old build
    expect(mayOffer(state({ version: null }))).toBe(true);
    expect(mayOffer(state({ version: null, declined: 'v7' }))).toBe(true);
  });

  it('never lets one refusal silence every version after it', () => {
    expect(isDeclined(null, 'v7')).toBe(false);
    expect(isDeclined('v7', null)).toBe(false);
    expect(isDeclined('', '')).toBe(false);
  });

  it('answers no to nothing at all rather than throwing', () => {
    expect(mayOffer(null)).toBe(false);
    expect(mayOffer(undefined)).toBe(false);
    expect(onOfferRoute('')).toBe(false);
    expect(onOfferRoute(null as any)).toBe(false);
  });

  it('sweeps every route against every state it can be in', () => {
    ROUTES.forEach(route => {
      [true, false].forEach(ready => {
        ['v1', null].forEach(version => {
          ['v1', 'v0', null].forEach(declined => {
            const shown = mayOffer(state({ route, ready, version, declined } as any));
            if (shown) {
              // Whatever else is true, these three always are
              expect(ready).toBe(true);
              expect(onOfferRoute(route)).toBe(true);
              expect(version === null || version !== declined).toBe(true);
            }
          });
        });
      });
    });
  });

  it('names the two messages the page and the worker agree on', () => {
    expect(SKIP_WAITING).toBe('skipWaiting');
    expect(VERSION_REQUEST).toBe('version');
    expect(DECLINED_KEY).toBe('updateDeclined');
    expect(OFFER_ROUTES).toEqual(['/grade', '/result']);
  });
});
