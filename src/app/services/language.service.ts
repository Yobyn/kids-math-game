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
  | 'answer-is'
  | 'good-try'
  | 'money-total'
  | 'money-change'
  | 'money-count'
  | 'money-make'
  | 'money-and'
  | 'new-best'
  | 'your-best'
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
  | 'lets-learn'
  | 'sound-on'
  | 'sound-off'
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
  | 'update-later';

export type Language = 'en' | 'nl' | 'es';

export const SUPPORTED_LANGUAGES: Language[] = ['en', 'nl', 'es'];
const STORAGE_KEY = 'language';

type TranslationSet = {
  [key in Language]: {
    [key in TranslationKeys]: string;
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
      'sound-on': 'Sound on',
      'sound-off': 'Sound off',
      'play-as-guest': 'Play without an account',
      'guest-player': 'Player',
      'sign-in': 'Sign in',
      'keep-progress-title': 'Want to keep your scores?',
      'keep-progress-body': 'Right now they are saved on this device. An account keeps them under your own name.',
      'create-account': 'Create an account',
      'not-now': 'Not now',
      'xp': 'XP',
      'xp-to-next': 'XP to the next level',
      'level-up': 'Level up!',
      'your-character': 'Your character',
      'skin': 'Skin',
      'hair-style': 'Hair',
      'hair-colour': 'Hair colour',
      'eyes': 'Eye colour',
      'done': 'Done',
      'hats': 'Hats',
      'glasses': 'Glasses',
      'unlocked': 'You unlocked the',
      'next-unlock': 'Next:',
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
      'tops': 'Tops',
      'item-striped': 'Striped shirt',
      'item-star-tee': 'Star shirt',
      'item-hoodie': 'Hoodie',
      'one-way': 'One way to do it:',
      'event-earned': 'You were here for the event! You earned the',
      'back-in': 'back in',
      'events-return': 'Event items come back every year — nothing is ever gone for good.',
      'item-bobble-hat': 'Bobble hat',
      'item-flower-tee': 'Flower shirt',
      'item-spooky-glasses': 'Spooky glasses',
      'your-progress': 'How far you have come',
      'progress-empty': 'Play a round and this fills up.',
      'rounds-finished': 'rounds finished',
      'questions-answered': 'questions answered',
      'answers-right': 'answers right',
      'things-earned': 'Things you have earned:',
      'more-to-win': 'There is more to win — keep playing.',
      'for-grown-ups': 'For grown-ups',
      'gate-note': 'This page is for the grown-up, not the player.',
      'gate-ask': 'Type this number in digits.',
      'gate-continue': 'Continue',
      'adults-for': 'How {name} is getting on',
      'adults-rounds': 'Rounds played',
      'adults-questions': 'Questions answered',
      'adults-accuracy': 'Answers right',
      'adults-practise': 'Three things to practise',
      'adults-answer': 'Answer',
      'adults-nothing-missed': 'Nothing is being missed at the moment.',
      'adults-weakest': 'Most of the missed questions are about {operation}.',
      'op-plus': 'adding',
      'op-minus': 'taking away',
      'op-times': 'times tables',
      'op-divide': 'dividing',
      'adults-how-title': 'How to use this',
      'adults-how': 'Keep it to these three, keep it short, and stop while it is still going well. Each one is already worked out, so you never have to explain it on the spot — read the line, then ask for the answer. Sounding relaxed about maths matters more than being good at it: children pick up how an adult feels about it long before they pick up the method.',
      'adults-trend': 'Every round, oldest first',
      'adults-no-rounds': 'No rounds finished yet, so there is nothing to show.',
      'adults-trend-note': 'The player never sees this line. A score that can go down is discouraging to read about yourself, and useful to you.',
      'easier-ask': 'Would you like the rest a bit easier?',
      'easier-yes': 'Yes, easier',
      'easier-no': 'No, keep going',
      'welcome-back': 'Welcome back!',
      'resume-progress': 'You were on question {number} of {total}.',
      'resume-carry-on': 'Carry on',
      'resume-start-again': 'Start again',
      'adults-right-so-far': 'Right so far:',
      'adults-waiting': '{count} more are waiting for their day to come round.',
      'adults-spacing': 'Facts come back a day apart, not the same afternoon — the gap is what makes them stick. One answered right on three separate days is done with and drops off this list.',
      'carry-on': 'Carry on at {grade}',
      'or-pick-another': 'Or pick a different one',
      'ready-to-try': 'Ready to try this one?',
      'put-it-on': 'Put it on',
      'face-shape': 'Face',
      'eye-shape': 'Eyes',
      'mouth-shape': 'Mouth',
      'hair-texture': 'Hair texture',
      'your-face': 'Your face',
      'your-hair': 'Your hair',
      'things-to-wear': 'Things to wear',
      'update-ready': 'A new version of the game is ready.',
      'update-now': 'Get it now',
      'update-later': 'Later',
      'correct-answer': 'The correct answer is',
      'try-again': 'Not quite right, try one more time! ',
      'answer-is': 'The answer is',
      'good-try': "Good try — you'll get the next one!",
      'money-total': 'You buy a toy for {first} and a book for {second}. How much altogether?',
      'money-change': 'A toy costs {price}. You pay with {paid}. How much change do you get?',
      'money-count': 'How much money is this?',
      'money-make': 'How many {coin} coins make {target}?',
      'money-and': 'and',
      'new-best': 'Your best round yet!',
      'your-best': 'Your best so far',
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
      'sound-on': 'Geluid aan',
      'sound-off': 'Geluid uit',
      'play-as-guest': 'Spelen zonder account',
      'guest-player': 'Speler',
      'sign-in': 'Inloggen',
      'keep-progress-title': 'Wil je je scores bewaren?',
      'keep-progress-body': 'Nu staan ze op dit apparaat. Met een account blijven ze onder je eigen naam bewaard.',
      'create-account': 'Account aanmaken',
      'not-now': 'Niet nu',
      'xp': 'XP',
      'xp-to-next': 'XP tot het volgende niveau',
      'level-up': 'Niveau omhoog!',
      'your-character': 'Jouw figuur',
      'skin': 'Huid',
      'hair-style': 'Haar',
      'hair-colour': 'Haarkleur',
      'eyes': 'Oogkleur',
      'done': 'Klaar',
      'hats': 'Hoeden',
      'glasses': 'Brillen',
      'unlocked': 'Je hebt verdiend:',
      'next-unlock': 'Hierna:',
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
      'tops': 'Kleding',
      'item-striped': 'Gestreept shirt',
      'item-star-tee': 'Sterrenshirt',
      'item-hoodie': 'Hoodie',
      'one-way': 'Zo kan het ook:',
      'event-earned': 'Je was erbij! Je hebt verdiend:',
      'back-in': 'terug in',
      'events-return': 'Evenementen komen elk jaar terug — niets is ooit voorgoed weg.',
      'item-bobble-hat': 'Muts met pompon',
      'item-flower-tee': 'Bloemenshirt',
      'item-spooky-glasses': 'Griezelbril',
      'your-progress': 'Hoe ver je al bent',
      'progress-empty': 'Speel een ronde en dit vult zich.',
      'rounds-finished': 'rondes gespeeld',
      'questions-answered': 'vragen beantwoord',
      'answers-right': 'goede antwoorden',
      'things-earned': 'Wat je hebt verdiend:',
      'more-to-win': 'Er is meer te winnen — blijf spelen.',
      'for-grown-ups': 'Voor volwassenen',
      'gate-note': 'Deze pagina is voor de volwassene, niet voor de speler.',
      'gate-ask': 'Typ dit getal in cijfers.',
      'gate-continue': 'Verder',
      'adults-for': 'Hoe het met {name} gaat',
      'adults-rounds': 'Gespeelde rondes',
      'adults-questions': 'Beantwoorde vragen',
      'adults-accuracy': 'Goede antwoorden',
      'adults-practise': 'Drie dingen om te oefenen',
      'adults-answer': 'Antwoord',
      'adults-nothing-missed': 'Er gaat op dit moment niets mis.',
      'adults-weakest': 'De meeste fouten gaan over {operation}.',
      'op-plus': 'optellen',
      'op-minus': 'aftrekken',
      'op-times': 'tafels',
      'op-divide': 'delen',
      'adults-how-title': 'Hoe je dit gebruikt',
      'adults-how': 'Houd het bij deze drie, houd het kort, en stop zolang het nog goed gaat. Elke som is al uitgewerkt, zodat je het nooit ter plekke hoeft uit te leggen — lees de regel voor en vraag daarna om het antwoord. Ontspannen klinken over rekenen telt zwaarder dan er goed in zijn: kinderen pikken op hoe een volwassene zich erbij voelt, lang voordat ze de methode oppikken.',
      'adults-trend': 'Elke ronde, oudste eerst',
      'adults-no-rounds': 'Nog geen rondes afgerond, dus er is nog niets te zien.',
      'adults-trend-note': 'De speler ziet deze lijn nooit. Een score die omlaag kan gaan is ontmoedigend om over jezelf te lezen, en nuttig voor jou.',
      'easier-ask': 'Wil je de rest wat makkelijker?',
      'easier-yes': 'Ja, makkelijker',
      'easier-no': 'Nee, ga door',
      'welcome-back': 'Welkom terug!',
      'resume-progress': 'Je was bij vraag {number} van {total}.',
      'resume-carry-on': 'Ga verder',
      'resume-start-again': 'Opnieuw beginnen',
      'adults-right-so-far': 'Tot nu toe goed:',
      'adults-waiting': 'Er wachten er nog {count} op hun beurt.',
      'adults-spacing': 'Sommen komen een dag later terug, niet dezelfde middag — die tussentijd zorgt dat ze blijven hangen. Een som die op drie verschillende dagen goed gaat, is klaar en verdwijnt van deze lijst.',
      'carry-on': 'Ga verder met {grade}',
      'or-pick-another': 'Of kies een andere',
      'ready-to-try': 'Klaar om deze te proberen?',
      'put-it-on': 'Doe het aan',
      'face-shape': 'Gezicht',
      'eye-shape': 'Ogen',
      'mouth-shape': 'Mond',
      'hair-texture': 'Haarstructuur',
      'your-face': 'Jouw gezicht',
      'your-hair': 'Jouw haar',
      'things-to-wear': 'Om aan te doen',
      'update-ready': 'Er is een nieuwe versie van het spel klaar.',
      'update-now': 'Nu ophalen',
      'update-later': 'Later',
      'correct-answer': 'Het juiste antwoord is',
      'try-again': 'Niet helemaal goed, probeer nog een keer! ',
      'answer-is': 'Het antwoord is',
      'good-try': 'Goed geprobeerd — de volgende lukt je!',
      'money-total': 'Je koopt speelgoed voor {first} en een boek voor {second}. Hoeveel is dat samen?',
      'money-change': 'Speelgoed kost {price}. Je betaalt met {paid}. Hoeveel krijg je terug?',
      'money-count': 'Hoeveel geld is dit?',
      'money-make': 'Hoeveel munten van {coin} maken {target}?',
      'money-and': 'en',
      'new-best': 'Je beste ronde tot nu toe!',
      'your-best': 'Je beste tot nu toe',
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
      'sound-on': 'Sonido activado',
      'sound-off': 'Sonido desactivado',
      'play-as-guest': 'Jugar sin cuenta',
      'guest-player': 'Jugador',
      'sign-in': 'Iniciar sesión',
      'keep-progress-title': '¿Quieres guardar tus puntuaciones?',
      'keep-progress-body': 'Ahora se guardan en este dispositivo. Con una cuenta se conservan a tu propio nombre.',
      'create-account': 'Crear una cuenta',
      'not-now': 'Ahora no',
      'xp': 'XP',
      'xp-to-next': 'XP para el siguiente nivel',
      'level-up': '¡Subiste de nivel!',
      'your-character': 'Tu personaje',
      'skin': 'Piel',
      'hair-style': 'Pelo',
      'hair-colour': 'Color de pelo',
      'eyes': 'Color de ojos',
      'done': 'Listo',
      'hats': 'Sombreros',
      'glasses': 'Gafas',
      'unlocked': 'Has desbloqueado:',
      'next-unlock': 'Siguiente:',
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
      'tops': 'Ropa',
      'item-striped': 'Camiseta de rayas',
      'item-star-tee': 'Camiseta de estrella',
      'item-hoodie': 'Sudadera',
      'one-way': 'Una forma de hacerlo:',
      'event-earned': '¡Estuviste aquí! Has ganado:',
      'back-in': 'vuelve en',
      'events-return': 'Los eventos vuelven cada año: nada se pierde para siempre.',
      'item-bobble-hat': 'Gorro con pompón',
      'item-flower-tee': 'Camiseta de flores',
      'item-spooky-glasses': 'Gafas de miedo',
      'your-progress': 'Lo lejos que has llegado',
      'progress-empty': 'Juega una ronda y esto se llenará.',
      'rounds-finished': 'rondas jugadas',
      'questions-answered': 'preguntas respondidas',
      'answers-right': 'respuestas correctas',
      'things-earned': 'Lo que has ganado:',
      'more-to-win': 'Hay más por ganar: sigue jugando.',
      'for-grown-ups': 'Para adultos',
      'gate-note': 'Esta página es para el adulto, no para quien juega.',
      'gate-ask': 'Escribe este número en cifras.',
      'gate-continue': 'Continuar',
      'adults-for': 'Cómo le va a {name}',
      'adults-rounds': 'Rondas jugadas',
      'adults-questions': 'Preguntas respondidas',
      'adults-accuracy': 'Respuestas correctas',
      'adults-practise': 'Tres cosas para practicar',
      'adults-answer': 'Respuesta',
      'adults-nothing-missed': 'Por ahora no falla nada.',
      'adults-weakest': 'La mayoría de los fallos son de {operation}.',
      'op-plus': 'sumar',
      'op-minus': 'restar',
      'op-times': 'tablas de multiplicar',
      'op-divide': 'dividir',
      'adults-how-title': 'Cómo usar esto',
      'adults-how': 'Quédate con estas tres, que sea corto, y para mientras todavía va bien. Cada una ya está resuelta, así que nunca tienes que explicarla sobre la marcha: lee la línea y luego pregunta la respuesta. Sonar tranquilo con las matemáticas importa más que dárselas bien: los niños captan cómo se siente un adulto mucho antes de captar el método.',
      'adults-trend': 'Cada ronda, de la más antigua a la más reciente',
      'adults-no-rounds': 'Todavía no hay rondas terminadas, así que no hay nada que mostrar.',
      'adults-trend-note': 'Quien juega nunca ve esta línea. Una puntuación que puede bajar desanima si es sobre ti, y es útil para ti.',
      'easier-ask': '¿Quieres que el resto sea un poco más fácil?',
      'easier-yes': 'Sí, más fácil',
      'easier-no': 'No, sigo así',
      'welcome-back': '¡Bienvenido de nuevo!',
      'resume-progress': 'Ibas por la pregunta {number} de {total}.',
      'resume-carry-on': 'Continuar',
      'resume-start-again': 'Empezar de nuevo',
      'adults-right-so-far': 'Aciertos hasta ahora:',
      'adults-waiting': 'Quedan {count} esperando su turno.',
      'adults-spacing': 'Las operaciones vuelven un día después, no la misma tarde: ese intervalo es lo que hace que se fijen. La que se acierta en tres días distintos ya está lista y sale de esta lista.',
      'carry-on': 'Sigue en {grade}',
      'or-pick-another': 'O elige otro',
      'ready-to-try': '¿Listo para probar este?',
      'put-it-on': 'Póntelo',
      'face-shape': 'Cara',
      'eye-shape': 'Ojos',
      'mouth-shape': 'Boca',
      'hair-texture': 'Textura del pelo',
      'your-face': 'Tu cara',
      'your-hair': 'Tu pelo',
      'things-to-wear': 'Para ponerte',
      'update-ready': 'Hay una nueva versión del juego lista.',
      'update-now': 'Obtenerla ahora',
      'update-later': 'Más tarde',
      'correct-answer': 'La respuesta correcta es',
      'try-again': 'No es correcto, inténtalo de nuevo ',
      'answer-is': 'La respuesta es',
      'good-try': '¡Buen intento, la próxima te saldrá!',
      'money-total': 'Compras un juguete por {first} y un libro por {second}. ¿Cuánto es en total?',
      'money-change': 'Un juguete cuesta {price}. Pagas con {paid}. ¿Cuánto cambio recibes?',
      'money-count': '¿Cuánto dinero hay aquí?',
      'money-make': '¿Cuántas monedas de {coin} hacen {target}?',
      'money-and': 'y',
      'new-best': '¡Tu mejor ronda hasta ahora!',
      'your-best': 'Tu mejor resultado',
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

  translate(key: TranslationKeys): string {
    return this.translations[this.currentLanguage.value][key];
  }
}