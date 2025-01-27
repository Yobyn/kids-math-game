import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

type Translations = {
  [key: string]: {
    [key: string]: string;
  };
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
      'play-again': 'Play Again'
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
      'wrong': 'Jammer, probeer nog eens! 💪',
      
      // Results
      'quiz-complete': 'Quiz Voltooid!',
      'your-score': 'Jouw Score',
      'outstanding': 'Fantastisch! Je bent een rekenwonder! 🌟',
      'great-job': 'Heel goed gedaan! Ga zo door! 🎉',
      'good-effort': 'Goed geprobeerd! Oefening baart kunst! 💪',
      'keep-practicing': 'Blijf oefenen! Je wordt steeds beter! 📚',
      'play-again': 'Opnieuw Spelen'
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

  translate(key: string): string {
    const currentLang = this.currentLang.value;
    return this.translations[currentLang][key] || key;
  }
} 