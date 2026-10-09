import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { BonusComponent } from './bonus.component';

/** The bonus game, fetched only when it is opened: nothing of it is in the first load. */
@NgModule({
  declarations: [BonusComponent],
  imports: [SharedModule, RouterModule.forChild([{ path: '', component: BonusComponent }])]
})
export class BonusModule { }
