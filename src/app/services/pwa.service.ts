import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SKIP_WAITING, VERSION_REQUEST } from '../pwa/update-offer';

/**
 * Registers the service worker that makes the game installable and usable on
 * a flaky school connection. Kept behind a plain function so the decision —
 * rather than the browser plumbing — can be tested.
 */
@Injectable({
  providedIn: 'root'
})
export class PwaService {
  /**
   * Everything this service hears comes from outside Angular, and one of
   * those doors is not one zone.js watches: the reply to the version
   * question arrives on a MessagePort, whose `onmessage` is not patched. So
   * the state changed, `mayOffer` agreed, and the strip never appeared —
   * the template was simply never re-checked. Every hand-back into the app
   * goes through the zone.
   */
  constructor(private zone: NgZone) {}

  /** The waiting version's name, or null while nothing is waiting. */
  private readonly waitingVersion = new BehaviorSubject<string | null>(null);
  private ready = false;
  private waiting: ServiceWorker | null = null;
  private reloading = false;

  /**
   * @returns whether registration was attempted. Development is skipped: a
   * cached shell in front of the dev server only ever causes confusion.
   */
  register(nav: Navigator, isProduction: boolean): boolean {
    if (!isProduction || !('serviceWorker' in nav)) {
      return false;
    }

    nav.serviceWorker.register('service-worker.js')
      .then(registration => this.watch(nav, registration))
      .catch(() => {
        // An unavailable service worker must never stop the game loading
      });
    return true;
  }

  /**
   * Watches a registration for a worker that has installed and is waiting to
   * take over. Public so a test can hand it a stand-in: the real thing needs
   * a secure origin, a built app and a second deploy.
   */
  watch(nav: any, registration: any): void {
    if (!registration) {
      return;
    }

    // Whether anything was already in charge when this page loaded. It
    // decides whether a later `controllerchange` is a TAKEOVER worth
    // reloading for, or just the first worker claiming a page that has
    // never had one — which is what `clients.claim()` does on a first
    // install, and which was reloading the game the first time a child
    // ever opened it.
    const hadController = !!(nav.serviceWorker && nav.serviceWorker.controller);

    // Already waiting when the page opened — the common case, because the
    // update usually installs while the child is not looking
    this.found(registration.waiting);

    if (typeof registration.addEventListener === 'function') {
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing || typeof installing.addEventListener !== 'function') {
          return;
        }
        installing.addEventListener('statechange', () => {
          // `installed` with something already in control means an UPDATE.
          // Without a controller it is the very first install, and there is
          // nothing to tell anybody about.
          if (installing.state === 'installed' && nav.serviceWorker.controller) {
            this.found(installing);
          }
        });
      });
    }

    if (nav.serviceWorker && typeof nav.serviceWorker.addEventListener === 'function') {
      nav.serviceWorker.addEventListener('controllerchange', () => {
        // The new worker has taken over. Reload once, never twice — and
        // never at all if nothing was in charge before, because that is a
        // first install rather than an update.
        if (this.reloading || !hadController) {
          return;
        }
        this.reloading = true;
        this.inZone(() => this.reload());
      });
    }
  }

  /** True once a new version is installed and waiting for permission. */
  isReady(): boolean {
    return this.ready;
  }

  /** The waiting version's name, so a refusal can be about THIS version. */
  version(): Observable<string | null> {
    return this.waitingVersion.asObservable();
  }

  /**
   * Tells the waiting worker to take over. The reload comes later, from
   * `controllerchange`, because that is the moment the new one is actually
   * in charge — reloading before it is just reloads the old version.
   */
  apply(): void {
    if (!this.waiting) {
      return;
    }
    this.waiting.postMessage({ type: SKIP_WAITING });
  }

  private found(worker: ServiceWorker | null | undefined): void {
    if (!worker) {
      return;
    }
    this.waiting = worker;
    this.ready = true;
    this.askVersion(worker);
  }

  /** Asks the waiting worker what it is called, over a one-shot channel. */
  private askVersion(worker: any): void {
    if (typeof MessageChannel === 'undefined' || typeof worker.postMessage !== 'function') {
      return;
    }
    try {
      const channel = new MessageChannel();
      channel.port1.onmessage = event => {
        const version = typeof event.data === 'string' ? event.data : null;
        this.inZone(() => this.waitingVersion.next(version));
      };
      worker.postMessage({ type: VERSION_REQUEST }, [channel.port2]);
    } catch {
      // A worker that will not say which build it is still gets offered
    }
  }

  /**
   * Back inside Angular, where a change to what the app shows is noticed.
   * Guarded because a test may build this without a real zone.
   */
  private inZone(work: () => void): void {
    if (this.zone && typeof this.zone.run === 'function') {
      this.zone.run(work);
      return;
    }
    work();
  }

  /** Split out so a test can watch for it without the page going away. */
  protected reload(): void {
    if (typeof location !== 'undefined' && location.reload) {
      location.reload();
    }
  }
}
