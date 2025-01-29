import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

type TranslationKeys = 'login' | 'register' | 'username' | 'password' | 'need-account' | 'have-account' | 
  'login-failed' | 'registration-failed' | 'logout' | 'select-grade' | 'grade' | 'mathematics-for' | 
  'students' | 'select-difficulty' | 'level' | 'easy-desc' | 'medium-desc' | 'hard-desc' | 'question' | 
  'of' | 'score' | 'submit' | 'correct' | 'wrong' | 'quiz-complete' | 'your-score' | 'outstanding' | 
  'great-job' | 'good-effort' | 'keep-practicing' | 'play-again' | 'welcome' | 'correct-answer' | 'try-again' | 'ok';

type TranslationSet = {
  [K in TranslationKeys]: string;
};

type Translations = {
  [lang: string]: TranslationSet;
};

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private currentLang = new BehaviorSubject<string>(localStorage.getItem('lang') || 'en');
  
  translations: Translations = {
    en: {
      // Login/Register
      'login': 'Login',
      'register': 'Register',
      'username': 'Username',
      'password': 'Password',
      'need-account': 'Need an account? Register',
      'have-account': 'Already have an account? Login',
      'login-failed': 'Login failed',
      'registration-failed': 'Registration failed',
      'logout': 'Logout',
      'welcome': 'Welcome',
      
      // Grade Selection
      'select-grade': 'Select Your Grade',
      'grade': 'Grade',
      'mathematics-for': 'Mathematics for Grade',
      'students': 'students',
      
      // Difficulty Selection
      'select-difficulty': 'Select Difficulty Level',
      'level': 'Level',
      'easy-desc': 'Basic operations with smaller numbers',
      'medium-desc': 'Intermediate operations with medium-sized numbers',
      'hard-desc': 'Advanced operations with larger numbers',
      
      // Questions
      'question': 'Question',
      'of': 'of',
      'score': 'Score',
      'submit': 'Submit',
      'correct': 'Correct! 🎉',
      'wrong': 'Wrong, try again! 💪',
      
      // Results
      'quiz-complete': 'Quiz Complete!',
      'your-score': 'Your Score',
      'outstanding': 'Outstanding! You\'re a math genius! 🌟',
      'great-job': 'Great job! Keep up the good work! 🎉',
      'good-effort': 'Good effort! Practice makes perfect! 💪',
      'keep-practicing': 'Keep practicing! You\'ll get better! 📚',
      'play-again': 'Play Again',
      'correct-answer': 'The correct answer is',
      'try-again': 'Not quite right, try one more time! 💪',
      'ok': 'OK'
    },
    nl: {
      // Login/Register
      'login': 'Inloggen',
      'register': 'Registreren',
      'username': 'Gebruikersnaam',
      'password': 'Wachtwoord',
      'need-account': 'Nog geen account? Registreer',
      'have-account': 'Al een account? Log in',
      'login-failed': 'Inloggen mislukt',
      'registration-failed': 'Registratie mislukt',
      'logout': 'Uitloggen',
      'welcome': 'Welkom',
      
      // Grade Selection
      'select-grade': 'Kies je klas',
      'grade': 'Groep',
      'mathematics-for': 'Wiskunde voor Groep',
      'students': 'leerlingen',
      
      // Difficulty Selection
      'select-difficulty': 'Kies Moeilijkheidsgraad',
      'level': 'Niveau',
      'easy-desc': 'Basis bewerkingen met kleine getallen',
      'medium-desc': 'Gemiddelde bewerkingen met middelgrote getallen',
      'hard-desc': 'Gevorderde bewerkingen met grote getallen',
      
      // Questions
      'question': 'Vraag',
      'of': 'van',
      'score': 'Score',
      'submit': 'Controleer',
      'correct': 'Goed zo! 🎉',
      'wrong': 'Jammer! 💪',
      
      // Results
      'quiz-complete': 'Quiz Voltooid!',
      'your-score': 'Jouw Score',
      'outstanding': 'Fantastisch! Je bent een rekenwonder! 🌟',
      'great-job': 'Heel goed gedaan! Ga zo door! 🎉',
      'good-effort': 'Goed geprobeerd! Oefening baart kunst! 💪',
      'keep-practicing': 'Blijf oefenen! Je wordt steeds beter! 📚',
      'play-again': 'Opnieuw Spelen',
      'correct-answer': 'Het juiste antwoord is',
      'try-again': 'Niet helemaal goed, probeer nog een keer! 💪',
      'ok': 'OK'
    }
  };

  constructor() {}

  setLanguage(lang: string) {
    localStorage.setItem('lang', lang);
    this.currentLang.next(lang);
  }

  getCurrentLang() {
    return this.currentLang.asObservable();
  }

  translate(key: TranslationKeys): string {
    const currentLang = this.currentLang.value;
    return this.translations[currentLang][key] || key;
  }
} 