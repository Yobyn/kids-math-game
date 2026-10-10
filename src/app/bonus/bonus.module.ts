import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { BonusComponent } from './bonus.component';
import { JumpComponent } from './jump.component';

/** The bonus games, fetched only when one is opened: nothing of them is in the first load. */
@NgModule({
  declarations: [BonusComponent, JumpComponent],
  imports: [SharedModule, RouterModule.forChild([
    { path: '', component: BonusComponent },
    { path: 'jump', component: JumpComponent }
  ])]
})
export class BonusModule { }
