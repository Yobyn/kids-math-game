import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SoundPickerComponent } from './sound-picker.component';

/**
 * The sound picker's own module, fetched when a child opens it. Imported by
 * nothing — `AppComponent` loads it with a dynamic import.
 */
@NgModule({
  declarations: [SoundPickerComponent],
  imports: [CommonModule]
})
export class SoundPickerModule {}

export { SoundPickerComponent };
