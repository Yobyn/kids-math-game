import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AvatarComponent } from '../avatar/avatar.component';

/**
 * What a lazily-loaded screen needs from the rest of the app.
 *
 * Only the character is shared: the progress screen, the scrapbook and the
 * chooser all draw it, and the header draws it on every screen, so it stays
 * in the first load whatever else moves out. Everything else a lazy screen
 * uses is its own.
 */
@NgModule({
  declarations: [AvatarComponent],
  imports: [CommonModule, FormsModule],
  exports: [AvatarComponent, CommonModule, FormsModule]
})
export class SharedModule { }
