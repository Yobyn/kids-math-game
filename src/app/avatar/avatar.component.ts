import { Component, Input } from '@angular/core';
import { Avatar, FULL_VIEW_BOX, PORTRAIT_VIEW_BOX, defaultAvatar } from './avatar-model';
import { AvatarLayers, SPRITE, avatarLayers, avatarVars } from './avatar-parts';

let instances = 0;

/**
 * Draws the child's character from the parts sprite. Every part is a <use>
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
export class AvatarComponent {
  @Input() avatar: Avatar = defaultAvatar();
  /** Drawn size in pixels; the artwork itself is resolution-free. */
  @Input() size = 96;
  /**
   * 'portrait' is the head alone, for the small circular places where a torso
   * would be cropped off anyway. 'full' reaches the shoulders, where clothes
   * can actually be seen.
   */
  @Input() framing: 'portrait' | 'full' = 'portrait';

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
