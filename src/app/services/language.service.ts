import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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
  | 'ok'
  | 'email'
  | 'forgot-password'
  | 'enter-email'
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
  | 'percentage'
  | 'total-score'
  | 'lets-learn';

export type Language = 'en' | 'nl' | 'es';

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

  getCurrentLang(): Observable<Language> {
    return this.currentLanguage.asObservable();
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
      'try-again': 'Not quite right, try one more time! ',
      'ok': 'OK',
      'start': 'Start Game',
      'email': 'Email',
      'forgot-password': 'Forgot Password',
      'enter-email': 'Please enter your email address',
      'password-reset-sent': 'Password reset instructions have been sent to your email',
      'password-reset-failed': 'Failed to send password reset email. Please try again.',
      'reset-password': 'Reset Password',
      'cancel': 'Cancel',
      'invalid-form': 'Please fix the errors in the form',
      'username-requirements': 'Username must be at least 3 characters',
      'password-requirements': 'Password must be at least 6 characters',
      'email-requirements': 'Please enter a valid email address',
      'enter-valid-email': 'Please enter a valid email address',
      'registration-success': 'Registration successful! You can now log in.',
      'streak': 'Streak',
      'bonus-points': 'bonus points',
      'check': 'Check Answer',
      'next': 'Next Question',
      'back': 'Back to Grade Selection',
      'percentage': 'Accuracy',
      'total-score': 'Total Score with Bonus',
      'lets-learn': 'Let\'s learn some math!',
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
      'try-again': 'Niet helemaal goed, probeer nog een keer! ',
      'ok': 'OK',
      'start': 'Start Spel',
      'email': 'E-mailadres',
      'forgot-password': 'Wachtwoord vergeten',
      'enter-email': 'Voer uw e-mailadres in',
      'password-reset-sent': 'Instructies voor het opnieuw instellen van uw wachtwoord zijn naar uw e-mail verzonden',
      'password-reset-failed': 'Kon geen wachtwoord reset e-mail verzenden. Probeer het opnieuw.',
      'reset-password': 'Wachtwoord opnieuw instellen',
      'cancel': 'Annuleren',
      'invalid-form': 'Corrigeer de fouten in het formulier',
      'username-requirements': 'Gebruikersnaam moet minimaal 3 tekens bevatten',
      'password-requirements': 'Wachtwoord moet minimaal 6 tekens bevatten',
      'email-requirements': 'Voer een geldig e-mailadres in',
      'enter-valid-email': 'Voer een geldig e-mailadres in',
      'registration-success': 'Registratie succesvol! Je kunt nu inloggen.',
      'streak': 'Streak',
      'bonus-points': 'bonus punten',
      'check': 'Controleer antwoord',
      'next': 'Volgende vraag',
      'back': 'Terug naar groep selectie',
      'percentage': 'Nauwkeurigheid',
      'total-score': 'Totale score met bonus',
      'lets-learn': 'Laten we wat wiskunde leren!',
    },
    es: {
      'register': 'Registro',
      'username': 'Nombre de usuario',
      'password': 'Contraseña',
      'fill-all-fields': 'Por favor, rellene todos los campos',
      'registration-failed': 'Registro fallido',
      'have-account': '¿Ya tienes una cuenta? Inicia sesión',
      'login': 'Iniciar sesión',
      'need-account': '¿Necesitas una cuenta? Regístrate',
      'login-failed': 'Inicio de sesión fallido',
      'grade': 'Grado',
      'select-grade': 'Seleccione Grado',
      'mathematics-for': 'Matemáticas para',
      'students': 'estudiantes',
      'difficulty': 'Seleccione Dificultad',
      'select-difficulty': 'Seleccione Nivel de Dificultad',
      'level': 'Nivel',
      'easy-desc': 'Operaciones básicas con números pequeños',
      'medium-desc': 'Operaciones mixtas con números más grandes',
      'hard-desc': 'Problemas complejos con varios pasos',
      'question': 'Pregunta',
      'of': 'de',
      'score': 'Puntuación',
      'submit': 'Enviar',
      'correct': 'Correcto',
      'wrong': 'Incorrecto',
      'incorrect': 'Incorrecto',
      'total': 'Total',
      'quiz-complete': '¡Quiz completo!',
      'your-score': 'Tu puntuación',
      'outstanding': '¡Excelente!',
      'great-job': '¡Buen trabajo!',
      'good-effort': '¡Buen esfuerzo!',
      'keep-practicing': '¡Sigue practicando!',
      'play-again': 'Jugar de nuevo',
      'welcome': 'Bienvenido',
      'logout': 'Cerrar sesión',
      'correct-answer': 'La respuesta correcta es',
      'try-again': 'No es correcto, inténtalo de nuevo ',
      'ok': 'OK',
      'start': 'Comenzar juego',
      'email': 'Correo electrónico',
      'forgot-password': '¿Olvidaste tu contraseña?',
      'enter-email': 'Por favor, ingresa tu dirección de correo electrónico',
      'password-reset-sent': 'Se han enviado instrucciones para restablecer tu contraseña a tu correo electrónico',
      'password-reset-failed': 'No se pudo enviar el correo electrónico de restablecimiento de contraseña. Por favor, inténtalo de nuevo.',
      'reset-password': 'Restablecer contraseña',
      'cancel': 'Cancelar',
      'invalid-form': 'Por favor, corrige los errores en el formulario',
      'username-requirements': 'El nombre de usuario debe tener al menos 3 caracteres',
      'password-requirements': 'La contraseña debe tener al menos 6 caracteres',
      'email-requirements': 'Por favor, ingresa una dirección de correo electrónico válida',
      'enter-valid-email': 'Por favor, ingresa una dirección de correo electrónico válida',
      'registration-success': 'Registro exitoso! Ahora puedes iniciar sesión.',
      'streak': 'Racha',
      'bonus-points': 'puntos extra',
      'check': 'Comprobar',
      'next': 'Siguiente',
      'back': 'Volver a Selección de Grado',
      'percentage': 'Precisión',
      'total-score': 'Puntuación total con bonus',
      'lets-learn': '¡Aprendamos matemáticas!',
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