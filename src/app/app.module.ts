import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms'; 
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { QuestionComponent } from './question/question.component';
import { ResultComponent } from './result/result.component';
import { ProfileCreationComponent } from './profile-creation/profile-creation.component';
import { LoginComponent } from './login/login.component';
import { DifficultySelectComponent } from './difficulty-select/difficulty-select.component';

@NgModule({
  declarations: [
    AppComponent,
    QuestionComponent,
    ResultComponent,
    ProfileCreationComponent,
    LoginComponent,
    DifficultySelectComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
