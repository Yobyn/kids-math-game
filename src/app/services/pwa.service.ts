import { Injectable } from '@angular/core';

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
   * @returns whether registration was attempted. Development is skipped: a
   * cached shell in front of the dev server only ever causes confusion.
   */
  register(nav: Navigator, isProduction: boolean): boolean {
    if (!isProduction || !('serviceWorker' in nav)) {
      return false;
    }

    nav.serviceWorker.register('service-worker.js').catch(() => {
      // An unavailable service worker must never stop the game loading
    });
    return true;
  }
}
