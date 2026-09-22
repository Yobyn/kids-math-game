import { Component, Input } from '@angular/core';
import { Avatar, HAIR_PATHS, defaultAvatar } from './avatar-model';

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

  get hairPath(): string {
    return HAIR_PATHS[this.avatar.hairStyle];
  }
}
