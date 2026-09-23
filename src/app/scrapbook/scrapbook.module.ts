import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { ScrapbookComponent } from './scrapbook.component';

/**
 * Loaded when a child actually opens this screen, not before. See
 * app-routing.module.ts for what that is worth.
 */
@NgModule({
  declarations: [ScrapbookComponent],
  imports: [
    SharedModule,
    RouterModule.forChild([{ path: '', component: ScrapbookComponent }])
  ]
})
export class ScrapbookModule { }
