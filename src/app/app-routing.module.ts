import { Injectable, NgModule } from '@angular/core';
import { PreloadingStrategy, Route, RouterModule, Routes } from '@angular/router';
import { Observable, of } from 'rxjs';
import { LoginComponent } from './login/login.component';
import { GradeSelectComponent } from './grade-select/grade-select.component';
import { DifficultySelectComponent } from './difficulty-select/difficulty-select.component';
import { AuthGuard } from './auth.guard';

/**
 * WHAT A CHILD WAITS FOR BEFORE THE FIRST QUESTION is the whole point of the
 * split below. Signing in and picking a grade and a difficulty are in the
 * first load. Everything a child opens BETWEEN rounds is fetched when they
 * open it.
 *
 * Measured 2026-09-23: it moves 34 kB out of the first load, on top of the
 * 72 kB that dropping @angular/animations took off it.
 *
 * The round and its result were in the first load too, until the questions
 * had to grow to what is asked in school (Yobyn, 2026-10-06) and the first
 * load had 0.6 kB left. They are fetched on their own now, but PRELOADED:
 * fetched, and so cached for offline, as soon as the app opens, while the
 * child is still choosing a grade. Only they are: the dressing-up screen's
 * 3D is not worth a child's data until they open it.
 */
export const PRELOAD = { preload: true };

/** Preloads the routes marked PRELOAD, and nothing else. */
@Injectable({ providedIn: 'root' })
export class PreloadGameScreens implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    return route.data && route.data.preload ? load() : of(null);
  }
}

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'register',
    loadChildren: () => import('./register/register.module').then(m => m.RegisterModule)
  },
  { path: 'grade', component: GradeSelectComponent, canActivate: [AuthGuard] },
  { path: 'difficulty', component: DifficultySelectComponent, canActivate: [AuthGuard] },
  {
    path: 'questions',
    canActivate: [AuthGuard],
    data: PRELOAD,
    loadChildren: () => import('./play/question.module').then(m => m.QuestionModule)
  },
  {
    path: 'result',
    canActivate: [AuthGuard],
    data: PRELOAD,
    loadChildren: () => import('./play/result.module').then(m => m.ResultModule)
  },
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
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadGameScreens })],
  exports: [RouterModule]
})
export class AppRoutingModule { }

