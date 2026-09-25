import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { AvatarChooserComponent } from './avatar-chooser.component';
import { AvatarStageComponent } from '../avatar3d/avatar-stage.component';

/**
 * The dressing-up screen, loaded when a child opens it. The character
 * ITSELF is not in here — the header draws it on every screen, so it stays
 * in the first load and comes from SharedModule.
 */
@NgModule({
  declarations: [AvatarChooserComponent, AvatarStageComponent],
  imports: [
    SharedModule,
    RouterModule.forChild([{ path: '', component: AvatarChooserComponent }])
  ]
})
export class AvatarChooserModule { }
