import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { LoginComponent } from './login.component';
import { TitleHeroComponent } from './title-hero.component';

/** The title screen, fetched on its own (app-routing.module.ts). */
@NgModule({
  declarations: [LoginComponent, TitleHeroComponent],
  imports: [SharedModule, RouterModule.forChild([{ path: '', component: LoginComponent }])]
})
export class LoginModule { }
