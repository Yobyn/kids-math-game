import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { GradeSelectComponent } from './grade-select.component';

/** The grade screen, fetched on its own (app-routing.module.ts). */
@NgModule({
  declarations: [GradeSelectComponent],
  imports: [SharedModule, RouterModule.forChild([{ path: '', component: GradeSelectComponent }])]
})
export class GradeSelectModule { }
