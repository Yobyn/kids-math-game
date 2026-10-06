import { Words } from '../services/language.service';

/**
 * The round's and its result's own words, fetched with them rather than in the first load (app-routing.module.ts).
 * Each screen that shows one of them hands them to the service as it opens
 * (`extend`, first thing in its constructor).
 */
export type PlayKey =
  | 'praise-3'
  | 'praise-2'
  | 'praise-1'
  | 'praise-0'
  | 'keep-progress-title'
  | 'keep-progress-body'
  | 'create-account'
  | 'not-now'
  | 'level-up'
  | 'unlocked'
  | 'event-earned'
  | 'put-it-on'
  | 'new-best'
  | 'one-way'
  | 'easier-ask'
  | 'easier-yes'
  | 'easier-no'
  | 'welcome-back'
  | 'resume-start-again'
  | 'answer-is'
  | 'good-try'
  | 'question'
  | 'of'
  | 'score'
  | 'try-again'
  | 'streak'
  | 'bonus-points'
  | 'check'
  | 'next'
  | 'money-total'
  | 'money-change'
  | 'money-count'
  | 'money-make'
  | 'money-pick'
  | 'money-purse'
  | 'money-tray'
  | 'money-so-far'
  | 'money-take-back'
  | 'money-and'
  | 'total'
  | 'sum-double'
  | 'sum-half'
  | 'play-again';

export const PLAY_WORDS: Words<PlayKey> = {
  en: {
    'praise-3': 'Brilliant work!',
    'praise-2': 'Great work!',
    'praise-1': 'Good work — keep going!',
    'praise-0': 'You kept going — that counts!',
    'keep-progress-title': 'Want to keep your scores?',
    'keep-progress-body': 'Right now they are only on this device. With an account they are yours on any phone or tablet you sign in on.',
    'create-account': 'Create an account',
    'not-now': 'Not now',
    'level-up': 'Level up!',
    'unlocked': 'You unlocked the',
    'event-earned': 'You were here for the event! You earned the',
    'put-it-on': 'Put it on',
    'new-best': 'Your best round yet!',
    'one-way': 'One way to do it:',
    'easier-ask': 'Would you like the rest a bit easier?',
    'easier-yes': 'Yes, easier',
    'easier-no': 'No, keep going',
    'welcome-back': 'Welcome back!',
    'resume-start-again': 'Start again',
    'answer-is': 'The answer is',
    'good-try': "Good try — you'll get the next one!",
    'question': 'Question',
    'of': 'of',
    'score': 'Score',
    'try-again': 'Not quite right, try one more time! ',
    'streak': 'Streak',
    'bonus-points': 'bonus points',
    'check': 'Check Answer',
    'next': 'Next Question',
    'money-total': 'You buy a toy for {first} and a book for {second}. How much altogether?',
    'money-change': 'A toy costs {price}. You pay with {paid}. How much change do you get?',
    'money-count': 'How much money is this?',
    'money-make': 'How many {coin} coins make {target}?',
    'money-pick': 'Put down coins to make {target}.',
    'money-purse': 'Your coins',
    'money-tray': 'Coins you can use',
    'money-so-far': 'So far',
    'money-take-back': 'Take back',
    'money-and': 'and',
    'total': 'Total',
    'play-again': 'Play Again',
    'sum-double': 'double',
    'sum-half': 'half of'
  },
  nl: {
    'praise-3': 'Knap gewerkt!',
    'praise-2': 'Goed gewerkt!',
    'praise-1': 'Goed bezig — ga zo door!',
    'praise-0': 'Je bent blijven doorgaan — dat telt!',
    'keep-progress-title': 'Wil je je scores bewaren?',
    'keep-progress-body': 'Nu staan ze alleen op dit apparaat. Met een account zijn ze van jou op elke telefoon of tablet waarop je inlogt.',
    'create-account': 'Account aanmaken',
    'not-now': 'Niet nu',
    'level-up': 'Niveau omhoog!',
    'unlocked': 'Je hebt verdiend:',
    'event-earned': 'Je was erbij! Je hebt verdiend:',
    'put-it-on': 'Doe het aan',
    'new-best': 'Je beste ronde tot nu toe!',
    'one-way': 'Zo kan het ook:',
    'easier-ask': 'Wil je de rest wat makkelijker?',
    'easier-yes': 'Ja, makkelijker',
    'easier-no': 'Nee, ga door',
    'welcome-back': 'Welkom terug!',
    'resume-start-again': 'Opnieuw beginnen',
    'answer-is': 'Het antwoord is',
    'good-try': 'Goed geprobeerd — de volgende lukt je!',
    'question': 'Vraag',
    'of': 'van',
    'score': 'Score',
    'try-again': 'Niet helemaal goed, probeer nog een keer! ',
    'streak': 'Streak',
    'bonus-points': 'bonus punten',
    'check': 'Controleer antwoord',
    'next': 'Volgende vraag',
    'money-total': 'Je koopt speelgoed voor {first} en een boek voor {second}. Hoeveel is dat samen?',
    'money-change': 'Speelgoed kost {price}. Je betaalt met {paid}. Hoeveel krijg je terug?',
    'money-count': 'Hoeveel geld is dit?',
    'money-make': 'Hoeveel munten van {coin} maken {target}?',
    'money-pick': 'Leg munten neer om {target} te maken.',
    'money-purse': 'Jouw munten',
    'money-tray': 'Munten die je kunt gebruiken',
    'money-so-far': 'Tot nu toe',
    'money-take-back': 'Terugnemen',
    'money-and': 'en',
    'total': 'Totaal',
    'play-again': 'Opnieuw Spelen',
    'sum-double': 'dubbel',
    'sum-half': 'de helft van'
  },
  es: {
    'praise-3': '¡Un trabajo brillante!',
    'praise-2': '¡Buen trabajo!',
    'praise-1': '¡Bien hecho, sigue así!',
    'praise-0': '¡Seguiste adelante, eso cuenta!',
    'keep-progress-title': '¿Quieres guardar tus puntuaciones?',
    'keep-progress-body': 'Ahora solo están en este dispositivo. Con una cuenta son tuyas en cualquier móvil o tableta donde inicies sesión.',
    'create-account': 'Crear una cuenta',
    'not-now': 'Ahora no',
    'level-up': '¡Subiste de nivel!',
    'unlocked': 'Has desbloqueado:',
    'event-earned': '¡Estuviste aquí! Has ganado:',
    'put-it-on': 'Póntelo',
    'new-best': '¡Tu mejor ronda hasta ahora!',
    'one-way': 'Una forma de hacerlo:',
    'easier-ask': '¿Quieres que el resto sea un poco más fácil?',
    'easier-yes': 'Sí, más fácil',
    'easier-no': 'No, sigo así',
    'welcome-back': '¡Bienvenido de nuevo!',
    'resume-start-again': 'Empezar de nuevo',
    'answer-is': 'La respuesta es',
    'good-try': '¡Buen intento, la próxima te saldrá!',
    'question': 'Pregunta',
    'of': 'de',
    'score': 'Puntuación',
    'try-again': 'No es correcto, inténtalo de nuevo ',
    'streak': 'Racha',
    'bonus-points': 'puntos extra',
    'check': 'Comprobar',
    'next': 'Siguiente',
    'money-total': 'Compras un juguete por {first} y un libro por {second}. ¿Cuánto es en total?',
    'money-change': 'Un juguete cuesta {price}. Pagas con {paid}. ¿Cuánto cambio recibes?',
    'money-count': '¿Cuánto dinero hay aquí?',
    'money-make': '¿Cuántas monedas de {coin} hacen {target}?',
    'money-pick': 'Pon monedas para hacer {target}.',
    'money-purse': 'Tus monedas',
    'money-tray': 'Monedas que puedes usar',
    'money-so-far': 'Hasta ahora',
    'money-take-back': 'Quitar',
    'money-and': 'y',
    'total': 'Total',
    'play-again': 'Jugar de nuevo',
    'sum-double': 'el doble de',
    'sum-half': 'la mitad de'
  }
};
