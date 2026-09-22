import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { QuestionComponent } from './question/question.component';
import { ResultComponent } from './result/result.component';
import { GradeSelectComponent } from './grade-select/grade-select.component';
import { DifficultySelectComponent } from './difficulty-select/difficulty-select.component';
import { AvatarChooserComponent } from './avatar/avatar-chooser.component';
import { ProgressComponent } from './progress/progress.component';
import { AuthGuard } from './auth.guard';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'grade', component: GradeSelectComponent, canActivate: [AuthGuard] },
  { path: 'difficulty', component: DifficultySelectComponent, canActivate: [AuthGuard] },
  { path: 'questions', component: QuestionComponent, canActivate: [AuthGuard] },
  { path: 'result', component: ResultComponent, canActivate: [AuthGuard] },
  { path: 'avatar', component: AvatarChooserComponent, canActivate: [AuthGuard] },
  { path: 'progress', component: ProgressComponent, canActivate: [AuthGuard] },
  { path: '', redirectTo: '/grade', pathMatch: 'full' },
  { path: '**', redirectTo: '/grade' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

