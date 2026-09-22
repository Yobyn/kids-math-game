import { Component, Input } from '@angular/core';
import {
  Avatar,
  EYE_PATHS,
  FACE_PATHS,
  FULL_VIEW_BOX,
  HAIR_PATHS,
  MOUTH_PATHS,
  Mouth,
  NECK_PATH,
  PORTRAIT_VIEW_BOX,
  TEXTURE_DASHES,
  TEXTURE_WIDTH,
  TORSO_PATH,
  WardrobeItem,
  defaultAvatar,
  findItem,
  lighten,
  topColour
} from './avatar-model';

/**
 * Draws the child's character from primitives — no images, so it stays sharp
 * at any size and costs nothing to ship.
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

  readonly neckPath = NECK_PATH;
  readonly torsoPath = TORSO_PATH;

  get viewBox(): string {
    return this.framing === 'full' ? FULL_VIEW_BOX : PORTRAIT_VIEW_BOX;
  }

  /** Height follows the framing, so the head is never squashed to fit. */
  get height(): number {
    return this.framing === 'full' ? Math.round(this.size * 1.32) : this.size;
  }

  get showsBody(): boolean {
    return this.framing === 'full';
  }

  get shirtColour(): string {
    return topColour(this.avatar);
  }

  get top(): WardrobeItem | undefined {
    return this.wornItem('top', this.avatar.top);
  }

  /** The face outline, which used to be a circle nobody could change. */
  get facePath(): string {
    return FACE_PATHS[this.avatar.faceShape] || FACE_PATHS.round;
  }

  get hairPath(): string {
    return HAIR_PATHS[this.avatar.hairStyle];
  }

  /** The eyes, which used to be one pair of circles on every child. */
  get eyePath(): string {
    return EYE_PATHS[this.avatar.eyeShape] || EYE_PATHS.round;
  }

  get mouth(): Mouth {
    return MOUTH_PATHS[this.avatar.mouthShape] || MOUTH_PATHS.smile;
  }

  /**
   * The texture rim, or nothing at all for smooth hair — which is what every
   * character had before texture was a choice, so they all look unchanged.
   */
  get textureDashes(): string {
    return TEXTURE_DASHES[this.avatar.hairTexture] || '';
  }

  get textureWidth(): number {
    return TEXTURE_WIDTH[this.avatar.hairTexture] || 0;
  }

  /** Follows the hair colour: a fixed highlight would read as grey hair. */
  get textureColour(): string {
    return lighten(this.avatar.hairColour);
  }

  get glasses(): WardrobeItem | undefined {
    return this.wornItem('glasses', this.avatar.glasses);
  }

  get hat(): WardrobeItem | undefined {
    return this.wornItem('hat', this.avatar.hat);
  }

  private wornItem(slot: 'hat' | 'glasses' | 'top', id: string): WardrobeItem | undefined {
    const item = findItem(slot, id);
    return item && item.path ? item : undefined;
  }
}
