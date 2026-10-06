import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { DifficultySelectComponent } from './difficulty-select.component';

/** The difficulty screen, fetched on its own (app-routing.module.ts). */
@NgModule({
  declarations: [DifficultySelectComponent],
  imports: [SharedModule, RouterModule.forChild([{ path: '', component: DifficultySelectComponent }])]
})
export class DifficultySelectModule { }
