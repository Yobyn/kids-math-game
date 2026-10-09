import { Injectable, NgModule } from '@angular/core';
import { PreloadingStrategy, Route, RouterModule, Routes } from '@angular/router';
import { Observable, of } from 'rxjs';
import { AuthGuard } from './auth.guard';

/**
 * WHAT A CHILD WAITS FOR BEFORE THE FIRST SCREEN is the whole point of the
 * split below. The first load is the frame round every screen (header,
 * languages, the character, the starry field) and nothing else: every screen
 * is fetched on its own.
 *
 * The screens a child goes through to play (title, grade, difficulty, the
 * round and its result) are PRELOADED: once the first screen is up, the rest
 * are fetched in the background, and so cached for offline, while the child
 * is still choosing. Moving on is as quick as when they were in the first
 * load. The screens a child opens BETWEEN rounds (dressing up, progress,
 * scrapbook, grown-ups) are fetched only when opened: the dressing-up
 * screen's 3D is not worth a child's data until they ask for it.
 *
 * How it got here: 2026-09-23 moved the between-rounds screens out (34 kB);
 * 2026-10-06 the round and result (63 kB, when the first load had 0.6 kB
 * left), and then the title, grade and difficulty screens with their words
 * (Yobyn: "There must be a smarter way to load in the content as the user
 * navigates, so we can reduce the initial content and make room for more
 * improvements").
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
  {
    path: 'login',
    data: PRELOAD,
    loadChildren: () => import('./login/login.module').then(m => m.LoginModule)
  },
  {
    path: 'register',
    loadChildren: () => import('./register/register.module').then(m => m.RegisterModule)
  },
  {
    path: 'grade',
    canActivate: [AuthGuard],
    data: PRELOAD,
    loadChildren: () => import('./grade-select/grade-select.module').then(m => m.GradeSelectModule)
  },
  {
    path: 'difficulty',
    canActivate: [AuthGuard],
    data: PRELOAD,
    loadChildren: () => import('./difficulty-select/difficulty-select.module').then(m => m.DifficultySelectModule)
  },
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
  // The bonus game after a round (Yobyn, 2026-10-09), fetched when opened
  {
    path: 'bonus',
    canActivate: [AuthGuard],
    loadChildren: () => import('./bonus/bonus.module').then(m => m.BonusModule)
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

