import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { AdultsComponent } from './adults.component';

/**
 * Loaded when a child actually opens this screen, not before. See
 * app-routing.module.ts for what that is worth.
 */
@NgModule({
  declarations: [AdultsComponent],
  imports: [
    SharedModule,
    RouterModule.forChild([{ path: '', component: AdultsComponent }])
  ]
})
export class AdultsModule { }
