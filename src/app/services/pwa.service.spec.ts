import { TestBed } from '@angular/core/testing';
import { PwaService } from './pwa.service';
import { SKIP_WAITING } from '../pwa/update-offer';

/** A stand-in worker: the real one needs a secure origin and two deploys. */
function fakeWorker(state = 'installed') {
  const listeners: { [type: string]: Function[] } = {};
  return {
    state,
    posted: [] as any[],
    addEventListener(type: string, fn: Function) {
      (listeners[type] = listeners[type] || []).push(fn);
    },
    fire(type: string) {
      (listeners[type] || []).forEach(fn => fn());
    },
    postMessage(message: any) {
      this.posted.push(message);
    }
  };
}

function fakeRegistration(over: any = {}) {
  const listeners: { [type: string]: Function[] } = {};
  return {
    waiting: null,
    installing: null,
    addEventListener(type: string, fn: Function) {
      (listeners[type] = listeners[type] || []).push(fn);
    },
    fire(type: string) {
      (listeners[type] || []).forEach(fn => fn());
    },
    ...over
  };
}

function fakeNav(controller: any = {}) {
  const listeners: { [type: string]: Function[] } = {};
  return {
    serviceWorker: {
      controller,
      addEventListener(type: string, fn: Function) {
        (listeners[type] = listeners[type] || []).push(fn);
      },
      fire(type: string) {
        (listeners[type] || []).forEach(fn => fn());
      }
    }
  };
}

describe('PwaService: registering', () => {
  let service: PwaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PwaService);
  });

  it('does not register in development', () => {
    expect(service.register({ serviceWorker: {} } as any, false)).toBe(false);
  });

  it('does not register where there is no service worker at all', () => {
    expect(service.register({} as any, true)).toBe(false);
  });
});

describe('PwaService: a new version waiting', () => {
  let service: PwaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PwaService);
  });

  it('has nothing to offer before anything is waiting', () => {
    expect(service.isReady()).toBe(false);
  });

  it('finds a worker that was already waiting when the page opened', () => {
    // The common case: the update installs while the child is not looking
    const waiting = fakeWorker();

    service.watch(fakeNav(), fakeRegistration({ waiting }));

    expect(service.isReady()).toBe(true);
  });

  it('finds one that finishes installing while the child is playing', () => {
    const installing = fakeWorker('installing');
    const registration = fakeRegistration({ installing });
    service.watch(fakeNav(), registration);
    expect(service.isReady()).toBe(false);

    registration.fire('updatefound');
    installing.state = 'installed';
    installing.fire('statechange');

    expect(service.isReady()).toBe(true);
  });

  it('says nothing about the very first install, which is not an update', () => {
    // No controller means this is the first time the game was ever opened
    const installing = fakeWorker('installing');
    const registration = fakeRegistration({ installing });
    service.watch(fakeNav(null), registration);

    registration.fire('updatefound');
    installing.state = 'installed';
    installing.fire('statechange');

    expect(service.isReady()).toBe(false);
  });

  it('ignores a worker that is still installing', () => {
    const installing = fakeWorker('installing');
    const registration = fakeRegistration({ installing });
    service.watch(fakeNav(), registration);

    registration.fire('updatefound');
    installing.fire('statechange');

    expect(service.isReady()).toBe(false);
  });

  it('asks the waiting worker which build it is', () => {
    const waiting = fakeWorker();

    service.watch(fakeNav(), fakeRegistration({ waiting }));

    expect(waiting.posted.length).toBe(1);
    expect(waiting.posted[0].type).toBe('version');
  });

  it('only tells it to take over when it is asked to', () => {
    const waiting = fakeWorker();
    service.watch(fakeNav(), fakeRegistration({ waiting }));
    const asked = waiting.posted.length;

    service.apply();

    expect(waiting.posted.length).toBe(asked + 1);
    expect(waiting.posted[asked]).toEqual({ type: SKIP_WAITING });
  });

  it('does nothing when asked to apply an update that is not there', () => {
    expect(() => service.apply()).not.toThrow();
  });

  it('reloads once the new worker is actually in charge, not before', () => {
    // Reloading before it takes over just reloads the old version
    const reload = spyOn(service as any, 'reload');
    const nav = fakeNav();
    service.watch(nav, fakeRegistration({ waiting: fakeWorker() }));

    service.apply();
    expect(reload).not.toHaveBeenCalled();

    nav.serviceWorker.fire('controllerchange');
    expect(reload).toHaveBeenCalled();
  });

  it('does not reload when the very first worker claims the page', () => {
    // `clients.claim()` fires controllerchange on a first install too, and
    // reloading there restarts the game the first time a child opens it
    const reload = spyOn(service as any, 'reload');
    const nav = fakeNav(null);
    service.watch(nav, fakeRegistration({ waiting: fakeWorker() }));

    nav.serviceWorker.fire('controllerchange');

    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads once, however many times control changes', () => {
    const reload = spyOn(service as any, 'reload');
    const nav = fakeNav();
    service.watch(nav, fakeRegistration({ waiting: fakeWorker() }));

    nav.serviceWorker.fire('controllerchange');
    nav.serviceWorker.fire('controllerchange');
    nav.serviceWorker.fire('controllerchange');

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('survives a registration that is not there at all', () => {
    expect(() => service.watch(fakeNav(), null)).not.toThrow();
    expect(service.isReady()).toBe(false);
  });
});

describe('PwaService: getting back inside Angular', () => {
  it('hands the version over through the zone, or nothing re-renders', () => {
    // The reply arrives on a MessagePort, whose onmessage zone.js does not
    // patch. Without this the state was right and the screen never changed.
    const runs: Function[] = [];
    const zone = { run: (work: Function) => { runs.push(work); return work(); } };
    const service = new PwaService(zone as any);
    const waiting = {
      postMessage(_message: any, ports: any[]) {
        // Answer on the port the service handed over, as the worker does
        setTimeout(() => ports && ports[0] && ports[0].postMessage('math-game-zzz'), 0);
      }
    };

    service.watch({ serviceWorker: { controller: {} } }, { waiting });

    expect(service.isReady()).toBe(true);
  });

  it('works even without a zone, so a bare instance does not throw', () => {
    const service = new PwaService(null as any);

    expect(() => service.watch({ serviceWorker: { controller: {} } },
                               { waiting: { postMessage() { /* no reply */ } } })).not.toThrow();
    expect(service.isReady()).toBe(true);
  });
});
