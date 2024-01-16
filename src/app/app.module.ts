import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms'; 

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { QuestionComponent } from './question/question.component';
import { ResultComponent } from './result/result.component';
import { ProfileCreationComponent } from './profile-creation/profile-creation.component';

@NgModule({
  declarations: [
    AppComponent,
    QuestionComponent,
    ResultComponent,
    ProfileCreationComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
