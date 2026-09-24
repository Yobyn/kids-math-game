import { NgModule } from '@angular/core';
import { TapSparksComponent } from './tap-sparks.component';

/**
 * The tap layer's own module, so it can be fetched after the first screen
 * rather than in it: nothing can be tapped before something is drawn, and
 * the first load has only a few kB of budget left (see docs/ROADMAP.md).
 * Imported by nothing — `AppComponent` loads it with a dynamic import.
 */
@NgModule({
  declarations: [TapSparksComponent]
})
export class TapSparksModule {}

export { TapSparksComponent };
