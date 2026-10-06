import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { ResultComponent } from '../result/result.component';

/** The end of a round, fetched with the round itself (see question.module.ts). */
@NgModule({
  declarations: [ResultComponent],
  imports: [SharedModule, RouterModule.forChild([{ path: '', component: ResultComponent }])]
})
export class ResultModule { }
