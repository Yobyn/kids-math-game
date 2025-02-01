import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

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
  | 'start'
  | 'score'
  | 'correct'
  | 'incorrect'
  | 'total'
  | 'play-again'
  | 'logout'
  | 'need-account'
  | 'login-failed'
  | 'select-grade'
  | 'mathematics-for'
  | 'students'
  | 'select-difficulty'
  | 'level'
  | 'easy-desc'
  | 'medium-desc'
  | 'hard-desc'
  | 'question'
  | 'of'
  | 'submit'
  | 'wrong'
  | 'quiz-complete'
  | 'your-score'
  | 'outstanding'
  | 'great-job'
  | 'good-effort'
  | 'keep-practicing'
  | 'welcome'
  | 'correct-answer'
  | 'try-again'
  | 'ok';

export type Language = 'en' | 'nl';

type TranslationSet = {
  [key in Language]: {
    [key in TranslationKeys]: string;
  };
};

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private currentLanguage = new BehaviorSubject<Language>('en');

  getCurrentLang(): string {
    return this.currentLanguage.value;
  }

  private translations: TranslationSet = {
    en: {
      'register': 'Register',
      'username': 'Username',
      'password': 'Password',
      'fill-all-fields': 'Please fill in all fields',
      'registration-failed': 'Registration failed',
      'have-account': 'Already have an account? Login',
      'login': 'Login',
      'need-account': 'Need an account? Register',
      'login-failed': 'Login failed',
      'grade': 'Grade',
      'select-grade': 'Select Grade',
      'mathematics-for': 'Mathematics for',
      'students': 'students',
      'difficulty': 'Select Difficulty',
      'select-difficulty': 'Select Difficulty Level',
      'level': 'Level',
      'easy-desc': 'Basic operations with small numbers',
      'medium-desc': 'Mixed operations with larger numbers',
      'hard-desc': 'Complex problems with multiple steps',
      'question': 'Question',
      'of': 'of',
      'score': 'Score',
      'submit': 'Submit',
      'correct': 'Correct',
      'wrong': 'Wrong',
      'incorrect': 'Incorrect',
      'total': 'Total',
      'quiz-complete': 'Quiz Complete!',
      'your-score': 'Your Score',
      'outstanding': 'Outstanding!',
      'great-job': 'Great job!',
      'good-effort': 'Good effort!',
      'keep-practicing': 'Keep practicing!',
      'play-again': 'Play Again',
      'welcome': 'Welcome',
      'logout': 'Logout',
      'correct-answer': 'The correct answer is',
      'try-again': 'Not quite right, try one more time! 💪',
      'ok': 'OK',
      'start': 'Start Game'
    },
    nl: {
      'register': 'Registreren',
      'username': 'Gebruikersnaam',
      'password': 'Wachtwoord',
      'fill-all-fields': 'Vul alle velden in',
      'registration-failed': 'Registratie mislukt',
      'have-account': 'Heb je al een account? Log in',
      'login': 'Inloggen',
      'need-account': 'Nog geen account? Registreer',
      'login-failed': 'Inloggen mislukt',
      'grade': 'Groep',
      'select-grade': 'Kies Groep',
      'mathematics-for': 'Wiskunde voor',
      'students': 'leerlingen',
      'difficulty': 'Kies Moeilijkheidsgraad',
      'select-difficulty': 'Kies Moeilijkheidsgraad',
      'level': 'Niveau',
      'easy-desc': 'Basis bewerkingen met kleine getallen',
      'medium-desc': 'Gemengde bewerkingen met grotere getallen',
      'hard-desc': 'Complexe problemen met meerdere stappen',
      'question': 'Vraag',
      'of': 'van',
      'score': 'Score',
      'submit': 'Verstuur',
      'correct': 'Goed',
      'wrong': 'Fout',
      'incorrect': 'Onjuist',
      'total': 'Totaal',
      'quiz-complete': 'Quiz Voltooid!',
      'your-score': 'Jouw Score',
      'outstanding': 'Uitstekend!',
      'great-job': 'Goed gedaan!',
      'good-effort': 'Goed geprobeerd!',
      'keep-practicing': 'Blijf oefenen!',
      'play-again': 'Opnieuw Spelen',
      'welcome': 'Welkom',
      'logout': 'Uitloggen',
      'correct-answer': 'Het juiste antwoord is',
      'try-again': 'Niet helemaal goed, probeer nog een keer! 💪',
      'ok': 'OK',
      'start': 'Start Spel'
    }
  };

  constructor() {}

  setLanguage(lang: Language) {
    this.currentLanguage.next(lang);
  }

  translate(key: TranslationKeys): string {
    return this.translations[this.currentLanguage.value][key];
  }
} 