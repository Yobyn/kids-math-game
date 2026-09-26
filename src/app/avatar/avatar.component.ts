import { Component, Input, OnChanges } from '@angular/core';
import { Avatar, FULL_VIEW_BOX, PORTRAIT_VIEW_BOX, defaultAvatar } from './avatar-model';
import { AvatarLayers, SPRITE, avatarLayers, avatarVars } from './avatar-parts';
import { AvatarStillService } from './avatar-still.service';

let instances = 0;

/**
 * Shows the child's character: the 3D character as a still picture where it
 * can be made, and the 2D drawing until then, or where it cannot.
 *
 * The 2D drawing comes from the parts sprite. Every part is a <use>
 * of a shape fitted to this face, coloured through CSS variables — so the
 * detail lives in an asset the service worker caches, not in the JavaScript
 * every screen loads. See avatar-parts.ts for the rules, and
 * scripts/avatar-art/ for the drawing.
 */
@Component({
  selector: 'app-avatar',
  templateUrl: './avatar.component.html',
  styleUrls: ['./avatar.component.css']
})
export class AvatarComponent implements OnChanges {
  @Input() avatar: Avatar = defaultAvatar();
  /** Drawn size in pixels; the artwork itself is resolution-free. */
  @Input() size = 96;
  /**
   * 'portrait' is the head alone, for the small circular places where a torso
   * would be cropped off anyway. 'full' reaches the shoulders, where clothes
   * can actually be seen.
   */
  @Input() framing: 'portrait' | 'full' = 'portrait';

  /**
   * '3d' shows a picture of the 3D character once it is ready. 'flat' keeps
   * to the 2D drawing: the dressing-up screen's small swatches, which preview
   * dozens of options at once.
   */
  @Input() look: '3d' | 'flat' = '3d';
  /** A happy hop, twice, when this turns true: the end of a round. Not under reduced motion (the CSS's rule). */
  @Input() hop = false;

  /** The picture of the 3D character, when there is one. */
  still: string | null = null;
  private asked = 0;
  private lastKey = '';

  constructor(private stills: AvatarStillService) {}

  ngOnChanges() {
    if (this.look !== '3d') {
      this.lastKey = '';
      this.still = null;
      return;
    }
    const avatar = this.avatar || defaultAvatar();
    // A page may hand over a new object for the same character on every
    // redraw; the same character is not asked for twice
    const key = this.stills.keyFor(avatar, this.framing, this.size);
    if (key === this.lastKey) {
      return;
    }
    this.lastKey = key;
    const ask = ++this.asked;
    // Kept from before: shown at once, with nothing to fetch
    this.still = this.stills.cached(avatar, this.framing, this.size);
    if (this.still) {
      return;
    }
    this.stills.still(avatar, this.framing, this.size).then(url => {
      // Only the newest question's answer: the character may have changed meanwhile
      if (ask === this.asked) {
        this.still = url;
      }
    });
  }

  /** Unique per character on the page, so two hats never share one clip. */
  readonly clipId = `avatar-hat-${instances++}`;

  get viewBox(): string {
    return this.framing === 'full' ? FULL_VIEW_BOX : PORTRAIT_VIEW_BOX;
  }

  /** Height follows the framing, so the head is never squashed to fit. */
  get height(): number {
    return this.framing === 'full' ? Math.round(this.size * 1.32) : this.size;
  }

  get layers(): AvatarLayers {
    return avatarLayers(this.avatar || defaultAvatar(), this.framing);
  }

  get vars(): string {
    return avatarVars(this.avatar || defaultAvatar(), this.size);
  }

  get clipRef(): string | null {
    return this.layers.coversHair ? `url(#${this.clipId})` : null;
  }

  part(id: string): string {
    return `${SPRITE}#${id}`;
  }
}
