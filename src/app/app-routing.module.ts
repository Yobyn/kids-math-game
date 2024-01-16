import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { QuestionComponent } from './question/question.component';
import { ResultComponent } from './result/result.component';
import { ProfileCreationComponent } from './profile-creation/profile-creation.component';

const routes: Routes = [
  { path: '', component: ProfileCreationComponent },
  { path: 'questions', component: QuestionComponent },
  { path: 'result', component: ResultComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

