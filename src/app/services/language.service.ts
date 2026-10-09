import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import type { AdultsKey } from '../adults/adults-words';
import type { ScrapbookKey } from '../scrapbook/scrapbook-words';
import type { ProgressKey } from '../progress/progress-words';
import type { ChooserKey } from '../avatar/chooser-words';
import type { LoginKey } from '../login/login-words';
import type { SelectKey } from '../grade-select/select-words';
import type { PlayKey } from '../question/play-words';
import type { ItemKey } from '../avatar/item-words';
import type { BonusKey } from '../bonus/bonus-words';

export type TranslationKeys = 
  | 'register'
  | 'username'
  | 'password'
  | 'fill-all-fields'
  | 'registration-failed'
  | 'have-account'
  | 'login'
  | 'grade'
  | 'difficulty'
  | 'score'
  | 'correct'
  | 'total'
  | 'sum-double'
  | 'sum-half'
  | 'sum-part-of'
  | 'sum-remainder'
  | 'unit-hours'
  | 'unit-minutes'
  | 'round-tens'
  | 'round-hundreds'
  | 'round-thousands'
  | 'sum-area'
  | 'sum-packs'
  | 'sum-cost'
  | 'sum-discount'
  | 'play-again'
  | 'logout'
  | 'need-account'
  | 'login-failed'
  | 'select-grade'
  | 'maths-for-grade'
  | 'select-difficulty'
  | 'climb-easy'
  | 'climb-medium'
  | 'climb-hard'
  | 'grade-coming-soon'
  | 'bonus-title'
  | 'bonus-how'
  | 'bonus-start'
  | 'bonus-seconds'
  | 'bonus-well-played'
  | 'bonus-points-won'
  | 'bonus-done'
  | 'bonus-board'
  | 'level'
  | 'easy-desc'
  | 'medium-desc'
  | 'hard-desc'
  | 'question'
  | 'of'
  | 'submit'
  | 'wrong'
  | 'praise-3'
  | 'praise-2'
  | 'praise-1'
  | 'praise-0'
  | 'welcome'
  | 'try-again'
  | 'answer-is'
  | 'good-try'
  | 'money-total'
  | 'money-change'
  | 'money-count'
  | 'money-make'
  | 'adults-stuck-title'
  | 'adults-stuck-none'
  | 'adults-stuck-one'
  | 'adults-stuck-many'
  | 'see-result'
  | 'see-result-line'
  | 'money-pick'
  | 'money-purse'
  | 'money-tray'
  | 'money-so-far'
  | 'money-take-back'
  | 'money-and'
  | 'new-best'
  | 'your-best'
  | 'email'
  | 'forgot-password'
  | 'password-reset-sent'
  | 'password-reset-failed'
  | 'reset-password'
  | 'cancel'
  | 'invalid-form'
  | 'username-requirements'
  | 'password-requirements'
  | 'email-requirements'
  | 'enter-valid-email'
  | 'registration-success'
  | 'streak'
  | 'bonus-points'
  | 'check'
  | 'next'
  | 'back'
  | 'lets-learn'
  | 'sounds'
  | 'body-type'
  | 'boy'
  | 'girl'
  | 'play-as-guest'
  | 'guest-player'
  | 'sign-in'
  | 'keep-progress-title'
  | 'keep-progress-body'
  | 'create-account'
  | 'not-now'
  | 'xp'
  | 'xp-to-next'
  | 'level-up'
  | 'your-character'
  | 'turn-left'
  | 'turn-right'
  | 'hair-style'
  | 'hair-colour'
  | 'eyes'
  | 'done'
  | 'hats'
  | 'unlocked'
  | 'next-unlock'
  | 'item-none'
  | 'item-cap'
  | 'item-beanie'
  | 'item-crown'
  | 'item-wizard'
  | 'item-round-glasses'
  | 'item-shades'
  | 'item-goggles'
  | 'try-harder'
  | 'try-easier'
  | 'tops'
  | 'pets'
  | 'skin'
  | 'glasses'
  | 'extras'
  | 'top-colour'
  | 'own-colour'
  | 'on-your-back'
  | 'shoes'
  | 'item-striped'
  | 'item-star-tee'
  | 'item-hoodie'
  | 'item-kitten'
  | 'item-puppy'
  | 'item-dragon'
  | 'item-backpack'
  | 'item-cape'
  | 'item-high-tops'
  | 'item-boots'
  | 'item-light-up'
  | 'one-way'
  | 'event-earned'
  | 'back-in'
  | 'events-return'
  | 'item-bobble-hat'
  | 'item-flower-tee'
  | 'item-spooky-glasses'
  | 'your-progress'
  | 'progress-empty'
  | 'rounds-finished'
  | 'questions-answered'
  | 'answers-right'
  | 'things-earned'
  | 'more-to-win'
  | 'for-grown-ups'
  | 'gate-note'
  | 'gate-ask'
  | 'gate-continue'
  | 'adults-for'
  | 'adults-rounds'
  | 'adults-questions'
  | 'adults-accuracy'
  | 'adults-practise'
  | 'adults-answer'
  | 'adults-nothing-missed'
  | 'adults-weakest'
  | 'op-plus'
  | 'op-minus'
  | 'op-times'
  | 'op-divide'
  | 'adults-how-title'
  | 'adults-how'
  | 'adults-trend'
  | 'adults-no-rounds'
  | 'adults-trend-note'
  | 'adults-copy-title'
  | 'adults-copy-what'
  | 'adults-copy-not'
  | 'adults-forget'
  | 'adults-forget-sure'
  | 'adults-forget-yes'
  | 'adults-forget-no'
  | 'adults-forget-done'
  | 'easier-ask'
  | 'easier-yes'
  | 'easier-no'
  | 'welcome-back'
  | 'resume-progress'
  | 'resume-carry-on'
  | 'resume-start-again'
  | 'adults-right-so-far'
  | 'adults-waiting'
  | 'adults-spacing'
  | 'carry-on'
  | 'or-pick-another'
  | 'ready-to-try'
  | 'put-it-on'
  | 'face-shape'
  | 'eye-shape'
  | 'mouth-shape'
  | 'hair-texture'
  | 'your-face'
  | 'your-hair'
  | 'things-to-wear'
  | 'update-ready'
  | 'update-now'
  | 'update-later'
  | 'your-book'
  | 'book-empty'
  | 'book-won'
  | 'book-from-event'
  | 'book-long-ago'
  | 'book-best'
  | 'book-first'
  | 'open-book'
  | 'event-winter'
  | 'event-spring'
  | 'event-autumn'
  | 'book-back';

export type Language = 'en' | 'nl' | 'es';

export const SUPPORTED_LANGUAGES: Language[] = ['en', 'nl', 'es'];
const STORAGE_KEY = 'language';

/** A screen's own words, in every language. */
export type Words<K extends string> = { [lang in Language]: { [key in K]: string } };

/**
 * Words that only a lazy screen uses live with that screen (see its
 * `*-words.ts`), not here: everything in this file is in the first load.
 */
type ScreenKey = AdultsKey | ScrapbookKey | ProgressKey | ChooserKey | LoginKey | SelectKey | PlayKey | ItemKey | BonusKey;

type TranslationSet = {
  [key in Language]: {
    [key in Exclude<TranslationKeys, ScreenKey>]: string;
  };
};

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private currentLanguage = new BehaviorSubject<Language>(LanguageService.readStoredLanguage());

  /** A child should not have to re-pick their language on every visit. */
  private static readStoredLanguage(): Language {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
      return stored && SUPPORTED_LANGUAGES.includes(stored) ? stored : 'en';
    } catch {
      return 'en';
    }
  }

  getCurrentLang(): Observable<Language> {
    return this.currentLanguage.asObservable();
  }

  /** The language right now, for callers that need it once rather than as a stream. */
  getLanguage(): Language {
    return this.currentLanguage.value;
  }

  private screenWords: { [lang in Language]: { [key: string]: string } } = { en: {}, nl: {}, es: {} };

  private translations: TranslationSet = {
    en: {
      'username': 'Username',
      'grade': 'Grade',
      'difficulty': 'Select Difficulty',
      'level': 'Level',
      'correct': 'Correct',
      'wrong': 'Wrong',
      'welcome': 'Welcome',
      'logout': 'Logout',
      'sounds': 'Sounds',
      'guest-player': 'Player',
      'sign-in': 'Sign in',
      'xp': 'XP',
      'xp-to-next': 'XP to the next level',
      'your-character': 'Your character',
      'done': 'Done',
      'your-progress': 'How far you have come',
      'answers-right': 'answers right',
      'for-grown-ups': 'For grown-ups',
      'resume-progress': 'You were on question {number} of {total}.',
      'resume-carry-on': 'Carry on',
      'update-ready': 'A new version of the game is ready.',
      'update-now': 'Get it now',
      'update-later': 'Later',
      'back': 'Back to Grade Selection',
      'lets-learn': 'Let\'s learn some math!'
    },
    nl: {
      'username': 'Gebruikersnaam',
      'grade': 'Groep',
      'difficulty': 'Kies Moeilijkheidsgraad',
      'level': 'Niveau',
      'correct': 'Goed',
      'wrong': 'Fout',
      'welcome': 'Welkom',
      'logout': 'Uitloggen',
      'sounds': 'Geluiden',
      'guest-player': 'Speler',
      'sign-in': 'Inloggen',
      'xp': 'XP',
      'xp-to-next': 'XP tot het volgende niveau',
      'your-character': 'Jouw figuur',
      'done': 'Klaar',
      'your-progress': 'Hoe ver je al bent',
      'answers-right': 'goede antwoorden',
      'for-grown-ups': 'Voor volwassenen',
      'resume-progress': 'Je was bij vraag {number} van {total}.',
      'resume-carry-on': 'Ga verder',
      'update-ready': 'Er is een nieuwe versie van het spel klaar.',
      'update-now': 'Nu ophalen',
      'update-later': 'Later',
      'back': 'Terug naar groep selectie',
      'lets-learn': 'Laten we wat wiskunde leren!'
    },
    es: {
      'username': 'Nombre de usuario',
      'grade': 'Grado',
      'difficulty': 'Seleccione Dificultad',
      'level': 'Nivel',
      'correct': 'Correcto',
      'wrong': 'Incorrecto',
      'welcome': 'Bienvenido',
      'logout': 'Cerrar sesión',
      'sounds': 'Sonidos',
      'guest-player': 'Jugador',
      'sign-in': 'Iniciar sesión',
      'xp': 'XP',
      'xp-to-next': 'XP para el siguiente nivel',
      'your-character': 'Tu personaje',
      'done': 'Listo',
      'your-progress': 'Lo lejos que has llegado',
      'answers-right': 'respuestas correctas',
      'for-grown-ups': 'Para adultos',
      'resume-progress': 'Ibas por la pregunta {number} de {total}.',
      'resume-carry-on': 'Continuar',
      'update-ready': 'Hay una nueva versión del juego lista.',
      'update-now': 'Obtenerla ahora',
      'update-later': 'Más tarde',
      'back': 'Volver a Selección de Grado',
      'lets-learn': '¡Aprendamos matemáticas!'
    }
  };

  constructor() {}

  setLanguage(lang: Language) {
    if (!SUPPORTED_LANGUAGES.includes(lang)) {
      return;
    }
    this.currentLanguage.next(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Private browsing is not worth failing a language switch over
    }
  }

  /** Adds a lazy screen's words, when the screen opens. Adding them twice is harmless. */
  extend<K extends string>(words: Words<K>): void {
    SUPPORTED_LANGUAGES.forEach(lang => Object.assign(this.screenWords[lang], words[lang]));
  }

  translate(key: TranslationKeys): string {
    const lang = this.currentLanguage.value;
    const word = (this.translations[lang] as { [key: string]: string })[key] ?? this.screenWords[lang][key];
    // A key no screen has added yet shows as itself: wrong, but visibly so
    return word ?? key;
  }
}