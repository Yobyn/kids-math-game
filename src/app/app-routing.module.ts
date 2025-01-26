import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { QuestionComponent } from './question/question.component';
import { ResultComponent } from './result/result.component';
import { ProfileCreationComponent } from './profile-creation/profile-creation.component';
import { LoginComponent } from './login/login.component';
import { DifficultySelectComponent } from './difficulty-select/difficulty-select.component';

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'difficulty', component: DifficultySelectComponent },
  { path: 'profile', component: ProfileCreationComponent },
  { path: 'questions', component: QuestionComponent },
  { path: 'result', component: ResultComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

