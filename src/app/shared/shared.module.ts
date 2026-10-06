import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvatarComponent } from '../avatar/avatar.component';
import { LanguageSelectorComponent } from '../language-selector/language-selector.component';

/**
 * What a lazily-loaded screen needs from the rest of the app.
 *
 * The character and the language picker are shared: the header draws both
 * on every screen, the title screen has the picker too, and the progress
 * screen, the scrapbook and the chooser all draw the character, so they stay
 * in the first load whatever else moves out. Everything else a lazy screen
 * uses is its own.
 */
@NgModule({
  declarations: [AvatarComponent, LanguageSelectorComponent],
  imports: [CommonModule],
  exports: [AvatarComponent, LanguageSelectorComponent, CommonModule]
})
export class SharedModule { }
