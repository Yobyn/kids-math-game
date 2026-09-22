import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { FIT_ATTRIBUTE, Fit, layoutFor } from '../layout/screen-fit';

/**
 * Publishes the screen's shape as an attribute on the document, so every
 * component's stylesheet can key off one decision made in one place.
 *
 * The rule itself lives in layout/screen-fit.ts and is tested there; this is
 * only the wiring, and it is deliberately thin.
 */
@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  private readonly fit = new BehaviorSubject<Fit>('stack');
  private listening = false;

  private readonly onChange = () => this.apply();

  /** Starts watching, and publishes the size the app opened at. */
  start(): void {
    this.apply();
    if (this.listening || typeof window === 'undefined') {
      return;
    }
    window.addEventListener('resize', this.onChange);
    // Both, on purpose: some browsers report the OLD size while handling
    // orientationchange, and the resize that follows is what corrects it.
    window.addEventListener('orientationchange', this.onChange);
    this.listening = true;
  }

  stop(): void {
    if (!this.listening || typeof window === 'undefined') {
      return;
    }
    window.removeEventListener('resize', this.onChange);
    window.removeEventListener('orientationchange', this.onChange);
    this.listening = false;
  }

  /** Re-reads the window and publishes what it finds. */
  apply(): Fit {
    const fit = layoutFor(this.size());
    if (fit !== this.fit.value) {
      this.fit.next(fit);
    }
    this.write(fit);
    return fit;
  }

  current(): Fit {
    return this.fit.value;
  }

  changes(): Observable<Fit> {
    return this.fit.asObservable();
  }

  private size() {
    if (typeof window === 'undefined') {
      return null;
    }
    return { width: window.innerWidth, height: window.innerHeight };
  }

  private write(fit: Fit): void {
    if (typeof document === 'undefined' || !document.documentElement) {
      return;
    }
    document.documentElement.setAttribute(FIT_ATTRIBUTE, fit);
  }
}
