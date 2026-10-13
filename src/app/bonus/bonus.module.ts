import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { BonusComponent } from './bonus.component';
import { JumpComponent } from './jump.component';
import { BalloonsComponent } from './balloons.component';

/** The bonus games, fetched only when one is opened: nothing of them is in the first load. */
@NgModule({
  declarations: [BonusComponent, JumpComponent, BalloonsComponent],
  imports: [SharedModule, RouterModule.forChild([
    { path: '', component: BonusComponent },
    { path: 'jump', component: JumpComponent },
    { path: 'balloons', component: BalloonsComponent }
  ])]
})
export class BonusModule { }
