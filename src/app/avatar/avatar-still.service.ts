import { Injectable } from '@angular/core';
import { Avatar } from './avatar-model';

export type StillFraming = 'portrait' | 'full';

/** What makes a still: the lazy renderer, or a stand-in in tests. */
export interface StillMaker {
  render(avatar: Avatar, framing: StillFraming, width: number, height: number): string;
}

/** Bumped whenever the 3D look changes, so no screen shows a picture of the old one. */
export const STILL_VERSION = 2;
export const STILL_STORE_KEY = 'avatarStills';
/** A few pictures of the current character are kept; older ones make room. */
export const MAX_STORED_STILLS = 8;

/** A full still is taller than it is wide, as the 2D drawing's full framing is. */
export function stillBox(framing: StillFraming, size: number, pixelRatio: number): [number, number] {
  const ratio = Math.min(2, Math.max(1, pixelRatio || 1));
  const height = framing === 'full' ? size * 1.32 : size;
  return [Math.round(size * ratio), Math.round(height * ratio)];
}

/** The same character always gives the same key, whatever order its fields were set in. */
export function stillKey(avatar: Avatar, framing: StillFraming, width: number, height: number): string {
  const fields = Object.keys(avatar).sort().map(key => `${key}=${(avatar as any)[key]}`).join(';');
  return `${STILL_VERSION}|${framing}|${width}x${height}|${fields}`;
}

/** The kept pictures, by key; an unreadable store is an empty one. */
export function readStills(): { [key: string]: string } {
  try {
    const raw = JSON.parse(localStorage.getItem(STILL_STORE_KEY) || '{}');
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  } catch {
    return {};
  }
}

/** What still-queue.ts gives back: pictures made one at a time. */
export interface StillMaking {
  still(key: string, avatar: Avatar, framing: StillFraming, width: number, height: number): Promise<string | null>;
}

/**
 * Pictures of the 3D character for every screen, made by a renderer fetched
 * the first time one is wanted (never in the first load) and kept, in memory
 * and in the browser, so the header shows the 3D character at once on the
 * next visit. Until a picture is ready, and wherever there is no WebGL, the
 * 2D drawing stands in: nothing waits for it.
 *
 * Only reading a kept picture is here, in the first load; making one, and
 * keeping it, is in still-queue.ts, fetched with the first picture made.
 */
@Injectable({
  providedIn: 'root'
})
export class AvatarStillService {
  /** Off in the unit tests of other screens (see src/test.ts); the still's own tests turn it on. */
  static enabledByDefault = true;
  enabled = AvatarStillService.enabledByDefault;

  /** Swapped in tests; in the app it fetches the 3D renderer. */
  loader: () => Promise<StillMaker | null> = () =>
    import('../avatar3d/still-renderer').then(module => module.createStillRenderer());

  /** Swapped in tests; in the app it fetches the code that makes and keeps pictures. */
  queueLoader: () => Promise<StillMaking> = () =>
    import('./still-queue').then(module => new module.StillQueue(() => this.loader()));

  private making: Promise<StillMaking> | null = null;

  /** A picture already made or kept, if there is one: no waiting, no fetch. */
  cached(avatar: Avatar, framing: StillFraming, size: number): string | null {
    return (this.enabled && readStills()[this.keyFor(avatar, framing, size)]) || null;
  }

  /** A picture of this character, or null where one cannot be made. */
  still(avatar: Avatar, framing: StillFraming, size: number): Promise<string | null> {
    const kept = this.cached(avatar, framing, size);
    if (!this.enabled || kept) {
      return Promise.resolve(kept);
    }
    const [width, height] = stillBox(framing, size, this.pixelRatio());
    if (!this.making) {
      this.making = this.queueLoader();
    }
    // Offline before the chunk was ever fetched: the 2D drawing stays
    return this.making.then(making => making.still(stillKey(avatar, framing, width, height), avatar, framing, width, height), () => null);
  }

  keyFor(avatar: Avatar, framing: StillFraming, size: number): string {
    const [width, height] = stillBox(framing, size, this.pixelRatio());
    return stillKey(avatar, framing, width, height);
  }

  private pixelRatio(): number {
    return window.devicePixelRatio || 1;
  }
}
