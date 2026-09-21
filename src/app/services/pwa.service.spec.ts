import { PwaService } from './pwa.service';

describe('PwaService', () => {
  let service: PwaService;
  let registered: string[];
  let fakeNav: any;

  beforeEach(() => {
    service = new PwaService();
    registered = [];
    fakeNav = {
      serviceWorker: {
        register: (path: string) => {
          registered.push(path);
          return Promise.resolve({} as ServiceWorkerRegistration);
        }
      }
    };
  });

  it('registers the worker in production', () => {
    expect(service.register(fakeNav, true)).toBe(true);
    expect(registered).toEqual(['service-worker.js']);
  });

  it('stays out of the way in development', () => {
    expect(service.register(fakeNav, false)).toBe(false);
    expect(registered).toEqual([]);
  });

  it('does nothing on a browser without service workers', () => {
    expect(service.register({} as Navigator, true)).toBe(false);
  });

  it('never lets a failed registration escape', () => {
    fakeNav.serviceWorker.register = () => Promise.reject(new Error('blocked'));

    expect(() => service.register(fakeNav, true)).not.toThrow();
  });
});
