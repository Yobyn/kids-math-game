import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { QuestionComponent } from './question/question.component';
import { ResultComponent } from './result/result.component';
import { GradeSelectComponent } from './grade-select/grade-select.component';
import { DifficultySelectComponent } from './difficulty-select/difficulty-select.component';
import { LanguageSelectorComponent } from './language-selector/language-selector.component';
import { ProgressComponent } from './progress/progress.component';
import { AdultsComponent } from './adults/adults.component';
import { KeypadComponent } from './keypad/keypad.component';
import { AvatarComponent } from './avatar/avatar.component';
import { AvatarChooserComponent } from './avatar/avatar-chooser.component';
import { ParticlesComponent } from './particles/particles.component';
import { AuthInterceptor } from './auth.interceptor';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    QuestionComponent,
    ResultComponent,
    GradeSelectComponent,
    DifficultySelectComponent,
    LanguageSelectorComponent,
    ParticlesComponent,
    AvatarComponent,
    AvatarChooserComponent,
    ProgressComponent,
    AdultsComponent,
    KeypadComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    BrowserAnimationsModule
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
