import { Avatar } from './avatar-model';
import { MAX_STORED_STILLS, STILL_STORE_KEY, StillFraming, StillMaker, StillMaking, readStills } from './avatar-still.service';

/**
 * Making the character's pictures, fetched with the first one (see
 * AvatarStillService): each character once. A picture is drawn in one
 * synchronous call, so two never overlap on the one renderer. A picture that could not be made is remembered as
 * such for this visit, not asked for again on every redraw of the page.
 */
export class StillQueue implements StillMaking {
  private maker: Promise<StillMaker | null> | null = null;
  private made = new Map<string, Promise<string | null>>();

  constructor(private loader: () => Promise<StillMaker | null>) {}

  still(key: string, avatar: Avatar, framing: StillFraming, width: number, height: number): Promise<string | null> {
    let pending = this.made.get(key);
    if (!pending) {
      pending = this.make(avatar, framing, width, height).then(url => {
        if (url) {
          keepStill(key, url);
        }
        return url;
      });
      this.made.set(key, pending);
    }
    return pending;
  }

  private make(avatar: Avatar, framing: StillFraming, width: number, height: number): Promise<string | null> {
    if (!this.maker) {
      this.maker = this.loader();
    }
    // No renderer (no WebGL, or its chunk would not load) or a failed draw: no picture
    return this.maker.then(maker => (maker ? maker.render(avatar, framing, width, height) : null)).catch(() => null);
  }
}

/** Keeps a picture, dropping the oldest to stay small; a full store just keeps fewer. */
export function keepStill(key: string, url: string) {
  const stored = readStills();
  delete stored[key];
  stored[key] = url;
  const keys = Object.keys(stored);
  keys.slice(0, Math.max(0, keys.length - MAX_STORED_STILLS)).forEach(old => delete stored[old]);
  for (let tries = 0; tries < 3; tries++) {
    try {
      localStorage.setItem(STILL_STORE_KEY, JSON.stringify(stored));
      return;
    } catch {
      const oldest = Object.keys(stored)[0];
      if (!oldest || oldest === key) {
        return;
      }
      delete stored[oldest];
    }
  }
}
