import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { QuestionComponent } from './question/question.component';
import { ResultComponent } from './result/result.component';
import { GradeSelectComponent } from './grade-select/grade-select.component';
import { DifficultySelectComponent } from './difficulty-select/difficulty-select.component';
import { AuthGuard } from './auth.guard';

/**
 * WHAT A CHILD WAITS FOR BEFORE THE FIRST QUESTION is the whole point of the
 * split below. The screens of the game itself — sign in, pick a grade, pick
 * a difficulty, play, see the result — are in the first load. Everything a
 * child opens BETWEEN rounds is fetched when they open it.
 *
 * Measured 2026-09-23: it moves 34 kB out of the first load, on top of the
 * 72 kB that dropping @angular/animations took off it.
 */
export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'register',
    loadChildren: () => import('./register/register.module').then(m => m.RegisterModule)
  },
  { path: 'grade', component: GradeSelectComponent, canActivate: [AuthGuard] },
  { path: 'difficulty', component: DifficultySelectComponent, canActivate: [AuthGuard] },
  { path: 'questions', component: QuestionComponent, canActivate: [AuthGuard] },
  { path: 'result', component: ResultComponent, canActivate: [AuthGuard] },
  {
    path: 'avatar',
    canActivate: [AuthGuard],
    loadChildren: () => import('./avatar/avatar-chooser.module').then(m => m.AvatarChooserModule)
  },
  {
    path: 'progress',
    canActivate: [AuthGuard],
    loadChildren: () => import('./progress/progress.module').then(m => m.ProgressModule)
  },
  {
    path: 'scrapbook',
    canActivate: [AuthGuard],
    loadChildren: () => import('./scrapbook/scrapbook.module').then(m => m.ScrapbookModule)
  },
  // Guarded like every other screen, and gated again on arrival: the guard
  // only asks whether somebody is playing, not whether they are the adult
  {
    path: 'grown-ups',
    canActivate: [AuthGuard],
    loadChildren: () => import('./adults/adults.module').then(m => m.AdultsModule)
  },
  { path: '', redirectTo: '/grade', pathMatch: 'full' },
  { path: '**', redirectTo: '/grade' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

