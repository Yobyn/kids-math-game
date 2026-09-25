import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import type { AdultsKey } from '../adults/adults-words';
import type { ScrapbookKey } from '../scrapbook/scrapbook-words';
import type { ProgressKey } from '../progress/progress-words';
import type { ChooserKey } from '../avatar/chooser-words';

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
  | 'skin'
  | 'hair-style'
  | 'hair-colour'
  | 'eyes'
  | 'done'
  | 'hats'
  | 'glasses'
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
  | 'item-striped'
  | 'item-star-tee'
  | 'item-hoodie'
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
type ScreenKey = AdultsKey | ScrapbookKey | ProgressKey | ChooserKey;

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
      'maths-for-grade': 'Maths for grade',
      'difficulty': 'Select Difficulty',
      'select-difficulty': 'Pick your climb',
      'climb-easy': 'Warm-up',
      'climb-medium': 'A step further',
      'climb-hard': 'Challenge',
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
      'total': 'Total',
      'praise-3': 'Brilliant work!',
      'praise-2': 'Great work!',
      'praise-1': 'Good work — keep going!',
      'praise-0': 'You kept going — that counts!',
      'play-again': 'Play Again',
      'welcome': 'Welcome',
      'logout': 'Logout',
      'sounds': 'Sounds',
      'play-as-guest': 'Play without an account',
      'guest-player': 'Player',
      'sign-in': 'Sign in',
      'keep-progress-title': 'Want to keep your scores?',
      'keep-progress-body': 'Right now they are only on this device. With an account they are yours on any phone or tablet you sign in on.',
      'create-account': 'Create an account',
      'not-now': 'Not now',
      'xp': 'XP',
      'xp-to-next': 'XP to the next level',
      'level-up': 'Level up!',
      'your-character': 'Your character',
      'skin': 'Skin',
      'done': 'Done',
      'glasses': 'Glasses',
      'unlocked': 'You unlocked the',
      'item-none': 'Nothing',
      'item-cap': 'Cap',
      'item-beanie': 'Beanie',
      'item-crown': 'Crown',
      'item-wizard': 'Wizard hat',
      'item-round-glasses': 'Round glasses',
      'item-shades': 'Sunglasses',
      'item-goggles': 'Goggles',
      'try-harder': 'Ready for this one?',
      'try-easier': 'Try this one today',
      'item-striped': 'Striped shirt',
      'item-star-tee': 'Star shirt',
      'item-hoodie': 'Hoodie',
      'one-way': 'One way to do it:',
      'event-earned': 'You were here for the event! You earned the',
      'item-bobble-hat': 'Bobble hat',
      'item-flower-tee': 'Flower shirt',
      'item-spooky-glasses': 'Spooky glasses',
      'your-progress': 'How far you have come',
      'answers-right': 'answers right',
      'for-grown-ups': 'For grown-ups',
      'easier-ask': 'Would you like the rest a bit easier?',
      'easier-yes': 'Yes, easier',
      'easier-no': 'No, keep going',
      'welcome-back': 'Welcome back!',
      'resume-progress': 'You were on question {number} of {total}.',
      'resume-carry-on': 'Carry on',
      'resume-start-again': 'Start again',
      'carry-on': 'Carry on at {grade}',
      'or-pick-another': 'Or pick a different one',
      'ready-to-try': 'Ready to try this one?',
      'put-it-on': 'Put it on',
      'update-ready': 'A new version of the game is ready.',
      'update-now': 'Get it now',
      'update-later': 'Later',
      'try-again': 'Not quite right, try one more time! ',
      'answer-is': 'The answer is',
      'good-try': "Good try — you'll get the next one!",
      'money-total': 'You buy a toy for {first} and a book for {second}. How much altogether?',
      'money-change': 'A toy costs {price}. You pay with {paid}. How much change do you get?',
      'money-count': 'How much money is this?',
      'money-make': 'How many {coin} coins make {target}?',
      'see-result': 'See how your last round went',
      'see-result-line': 'You got {correct} of {total}',
      'money-pick': 'Put down coins to make {target}.',
      'money-purse': 'Your coins',
      'money-tray': 'Coins you can use',
      'money-so-far': 'So far',
      'money-take-back': 'Take back',
      'money-and': 'and',
      'new-best': 'Your best round yet!',
      'email': 'Email',
      'forgot-password': 'Forgot Password',
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
      'maths-for-grade': 'Wiskunde voor groep',
      'difficulty': 'Kies Moeilijkheidsgraad',
      'select-difficulty': 'Kies je klim',
      'climb-easy': 'Opwarmen',
      'climb-medium': 'Een stapje verder',
      'climb-hard': 'Uitdaging',
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
      'total': 'Totaal',
      'praise-3': 'Knap gewerkt!',
      'praise-2': 'Goed gewerkt!',
      'praise-1': 'Goed bezig — ga zo door!',
      'praise-0': 'Je bent blijven doorgaan — dat telt!',
      'play-again': 'Opnieuw Spelen',
      'welcome': 'Welkom',
      'logout': 'Uitloggen',
      'sounds': 'Geluiden',
      'play-as-guest': 'Spelen zonder account',
      'guest-player': 'Speler',
      'sign-in': 'Inloggen',
      'keep-progress-title': 'Wil je je scores bewaren?',
      'keep-progress-body': 'Nu staan ze alleen op dit apparaat. Met een account zijn ze van jou op elke telefoon of tablet waarop je inlogt.',
      'create-account': 'Account aanmaken',
      'not-now': 'Niet nu',
      'xp': 'XP',
      'xp-to-next': 'XP tot het volgende niveau',
      'level-up': 'Niveau omhoog!',
      'your-character': 'Jouw figuur',
      'skin': 'Huid',
      'done': 'Klaar',
      'glasses': 'Brillen',
      'unlocked': 'Je hebt verdiend:',
      'item-none': 'Niets',
      'item-cap': 'Pet',
      'item-beanie': 'Muts',
      'item-crown': 'Kroon',
      'item-wizard': 'Tovenaarshoed',
      'item-round-glasses': 'Ronde bril',
      'item-shades': 'Zonnebril',
      'item-goggles': 'Duikbril',
      'try-harder': 'Klaar voor deze?',
      'try-easier': 'Probeer deze vandaag',
      'item-striped': 'Gestreept shirt',
      'item-star-tee': 'Sterrenshirt',
      'item-hoodie': 'Hoodie',
      'one-way': 'Zo kan het ook:',
      'event-earned': 'Je was erbij! Je hebt verdiend:',
      'item-bobble-hat': 'Muts met pompon',
      'item-flower-tee': 'Bloemenshirt',
      'item-spooky-glasses': 'Griezelbril',
      'your-progress': 'Hoe ver je al bent',
      'answers-right': 'goede antwoorden',
      'for-grown-ups': 'Voor volwassenen',
      'easier-ask': 'Wil je de rest wat makkelijker?',
      'easier-yes': 'Ja, makkelijker',
      'easier-no': 'Nee, ga door',
      'welcome-back': 'Welkom terug!',
      'resume-progress': 'Je was bij vraag {number} van {total}.',
      'resume-carry-on': 'Ga verder',
      'resume-start-again': 'Opnieuw beginnen',
      'carry-on': 'Ga verder met {grade}',
      'or-pick-another': 'Of kies een andere',
      'ready-to-try': 'Klaar om deze te proberen?',
      'put-it-on': 'Doe het aan',
      'update-ready': 'Er is een nieuwe versie van het spel klaar.',
      'update-now': 'Nu ophalen',
      'update-later': 'Later',
      'try-again': 'Niet helemaal goed, probeer nog een keer! ',
      'answer-is': 'Het antwoord is',
      'good-try': 'Goed geprobeerd — de volgende lukt je!',
      'money-total': 'Je koopt speelgoed voor {first} en een boek voor {second}. Hoeveel is dat samen?',
      'money-change': 'Speelgoed kost {price}. Je betaalt met {paid}. Hoeveel krijg je terug?',
      'money-count': 'Hoeveel geld is dit?',
      'money-make': 'Hoeveel munten van {coin} maken {target}?',
      'see-result': 'Kijk hoe je laatste ronde ging',
      'see-result-line': 'Je had er {correct} van {total} goed',
      'money-pick': 'Leg munten neer om {target} te maken.',
      'money-purse': 'Jouw munten',
      'money-tray': 'Munten die je kunt gebruiken',
      'money-so-far': 'Tot nu toe',
      'money-take-back': 'Terugnemen',
      'money-and': 'en',
      'new-best': 'Je beste ronde tot nu toe!',
      'email': 'E-mailadres',
      'forgot-password': 'Wachtwoord vergeten',
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
      'maths-for-grade': 'Matemáticas para el grado',
      'difficulty': 'Seleccione Dificultad',
      'select-difficulty': 'Elige tu subida',
      'climb-easy': 'Calentamiento',
      'climb-medium': 'Un paso más',
      'climb-hard': 'Desafío',
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
      'total': 'Total',
      'praise-3': '¡Un trabajo brillante!',
      'praise-2': '¡Buen trabajo!',
      'praise-1': '¡Bien hecho, sigue así!',
      'praise-0': '¡Seguiste adelante, eso cuenta!',
      'play-again': 'Jugar de nuevo',
      'welcome': 'Bienvenido',
      'logout': 'Cerrar sesión',
      'sounds': 'Sonidos',
      'play-as-guest': 'Jugar sin cuenta',
      'guest-player': 'Jugador',
      'sign-in': 'Iniciar sesión',
      'keep-progress-title': '¿Quieres guardar tus puntuaciones?',
      'keep-progress-body': 'Ahora solo están en este dispositivo. Con una cuenta son tuyas en cualquier móvil o tableta donde inicies sesión.',
      'create-account': 'Crear una cuenta',
      'not-now': 'Ahora no',
      'xp': 'XP',
      'xp-to-next': 'XP para el siguiente nivel',
      'level-up': '¡Subiste de nivel!',
      'your-character': 'Tu personaje',
      'skin': 'Piel',
      'done': 'Listo',
      'glasses': 'Gafas',
      'unlocked': 'Has desbloqueado:',
      'item-none': 'Nada',
      'item-cap': 'Gorra',
      'item-beanie': 'Gorro',
      'item-crown': 'Corona',
      'item-wizard': 'Sombrero de mago',
      'item-round-glasses': 'Gafas redondas',
      'item-shades': 'Gafas de sol',
      'item-goggles': 'Gafas de buceo',
      'try-harder': '¿Listo para este?',
      'try-easier': 'Prueba este hoy',
      'item-striped': 'Camiseta de rayas',
      'item-star-tee': 'Camiseta de estrella',
      'item-hoodie': 'Sudadera',
      'one-way': 'Una forma de hacerlo:',
      'event-earned': '¡Estuviste aquí! Has ganado:',
      'item-bobble-hat': 'Gorro con pompón',
      'item-flower-tee': 'Camiseta de flores',
      'item-spooky-glasses': 'Gafas de miedo',
      'your-progress': 'Lo lejos que has llegado',
      'answers-right': 'respuestas correctas',
      'for-grown-ups': 'Para adultos',
      'easier-ask': '¿Quieres que el resto sea un poco más fácil?',
      'easier-yes': 'Sí, más fácil',
      'easier-no': 'No, sigo así',
      'welcome-back': '¡Bienvenido de nuevo!',
      'resume-progress': 'Ibas por la pregunta {number} de {total}.',
      'resume-carry-on': 'Continuar',
      'resume-start-again': 'Empezar de nuevo',
      'carry-on': 'Sigue en {grade}',
      'or-pick-another': 'O elige otro',
      'ready-to-try': '¿Listo para probar este?',
      'put-it-on': 'Póntelo',
      'update-ready': 'Hay una nueva versión del juego lista.',
      'update-now': 'Obtenerla ahora',
      'update-later': 'Más tarde',
      'try-again': 'No es correcto, inténtalo de nuevo ',
      'answer-is': 'La respuesta es',
      'good-try': '¡Buen intento, la próxima te saldrá!',
      'money-total': 'Compras un juguete por {first} y un libro por {second}. ¿Cuánto es en total?',
      'money-change': 'Un juguete cuesta {price}. Pagas con {paid}. ¿Cuánto cambio recibes?',
      'money-count': '¿Cuánto dinero hay aquí?',
      'money-make': '¿Cuántas monedas de {coin} hacen {target}?',
      'see-result': 'Mira cómo te fue en tu última ronda',
      'see-result-line': 'Acertaste {correct} de {total}',
      'money-pick': 'Pon monedas para hacer {target}.',
      'money-purse': 'Tus monedas',
      'money-tray': 'Monedas que puedes usar',
      'money-so-far': 'Hasta ahora',
      'money-take-back': 'Quitar',
      'money-and': 'y',
      'new-best': '¡Tu mejor ronda hasta ahora!',
      'email': 'Correo electrónico',
      'forgot-password': '¿Olvidaste tu contraseña?',
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
      'lets-learn': '¡Aprendamos matemáticas!',
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