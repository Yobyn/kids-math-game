import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../shared/shared.module';
import { RegisterComponent } from './register.component';

/**
 * Loaded when a child actually opens this screen, not before. See
 * app-routing.module.ts for what that is worth.
 */
@NgModule({
  declarations: [RegisterComponent],
  imports: [
    SharedModule,
    FormsModule,
    RouterModule.forChild([{ path: '', component: RegisterComponent }])
  ]
})
export class RegisterModule { }
