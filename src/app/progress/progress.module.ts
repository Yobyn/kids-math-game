import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { ProgressComponent } from './progress.component';

/**
 * Loaded when a child actually opens this screen, not before. See
 * app-routing.module.ts for what that is worth.
 */
@NgModule({
  declarations: [ProgressComponent],
  imports: [
    SharedModule,
    RouterModule.forChild([{ path: '', component: ProgressComponent }])
  ]
})
export class ProgressModule { }
