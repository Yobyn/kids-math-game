import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { SharedModule } from './shared/shared.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';
import { QuestionComponent } from './question/question.component';
import { ResultComponent } from './result/result.component';
import { GradeSelectComponent } from './grade-select/grade-select.component';
import { DifficultySelectComponent } from './difficulty-select/difficulty-select.component';
import { LanguageSelectorComponent } from './language-selector/language-selector.component';
import { KeypadComponent } from './keypad/keypad.component';
import { CoinsComponent } from './money/coins.component';
import { CoinPickerComponent } from './money/coin-picker.component';
import { ParticlesComponent } from './particles/particles.component';
import { RoundTrackComponent } from './question/round-track.component';
import { TitleHeroComponent } from './login/title-hero.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    QuestionComponent,
    ResultComponent,
    GradeSelectComponent,
    DifficultySelectComponent,
    LanguageSelectorComponent,
    ParticlesComponent,
    KeypadComponent,
    CoinsComponent,
    CoinPickerComponent,
    RoundTrackComponent,
    TitleHeroComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    SharedModule,
    HttpClientModule,
  ],
  // No HTTP interceptor: every request that needs a token sets its own, from
  // AuthService as it stands (progress-sync.service.ts). One here used to
  // hold the token from when the app opened and put it back over theirs
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
