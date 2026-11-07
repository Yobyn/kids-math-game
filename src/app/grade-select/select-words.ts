import { Words } from '../services/language.service';

/**
 * The grade and difficulty screens' own words, fetched with them rather than in the first load (app-routing.module.ts).
 * Each screen that shows one of them hands them to the service as it opens
 * (`extend`, first thing in its constructor).
 */
export type SelectKey =
  | 'maths-for-grade'
  | 'carry-on'
  | 'or-pick-another'
  | 'ready-to-try'
  | 'see-result'
  | 'see-result-line'
  | 'try-harder'
  | 'try-easier'
  | 'select-grade'
  | 'select-difficulty'
  | 'easy-desc'
  | 'medium-desc'
  | 'hard-desc'
  | 'climb-easy'
  | 'climb-medium'
  | 'climb-hard'
  | 'grade-coming-soon';

export const SELECT_WORDS: Words<SelectKey> = {
  en: {
    'maths-for-grade': 'Maths for grade',
    'carry-on': 'Carry on at {grade}',
    'or-pick-another': 'Or pick a different one',
    'ready-to-try': 'Ready to try this one?',
    'see-result': 'See how your last round went',
    'see-result-line': 'You got {correct} of {total}',
    'try-harder': 'Ready for this one?',
    'try-easier': 'Try this one today',
    'select-grade': 'Pick your grade',
    'select-difficulty': 'Pick your climb',
    'easy-desc': 'The start of the year: what you already know',
    'medium-desc': 'The middle of the year: what you are learning now',
    'hard-desc': 'The end of the year: the newest sums',
    'climb-easy': 'Warm-up',
    'climb-medium': 'A step further',
    'climb-hard': 'Challenge',
    'grade-coming-soon': 'Coming soon'
  },
  nl: {
    'maths-for-grade': 'Wiskunde voor groep',
    'carry-on': 'Ga verder met {grade}',
    'or-pick-another': 'Of kies een andere',
    'ready-to-try': 'Klaar om deze te proberen?',
    'see-result': 'Kijk hoe je laatste ronde ging',
    'see-result-line': 'Je had er {correct} van {total} goed',
    'try-harder': 'Klaar voor deze?',
    'try-easier': 'Probeer deze vandaag',
    'select-grade': 'Kies je groep',
    'select-difficulty': 'Kies je klim',
    'easy-desc': 'Het begin van het jaar: wat je al kent',
    'medium-desc': 'Midden in het jaar: wat je nu leert',
    'hard-desc': 'Het eind van het jaar: de nieuwste sommen',
    'climb-easy': 'Opwarmen',
    'climb-medium': 'Een stapje verder',
    'climb-hard': 'Uitdaging',
    'grade-coming-soon': 'Komt eraan'
  },
  es: {
    'maths-for-grade': 'Matemáticas para el grado',
    'carry-on': 'Sigue en {grade}',
    'or-pick-another': 'O elige otro',
    'ready-to-try': '¿Listo para probar este?',
    'see-result': 'Mira cómo te fue en tu última ronda',
    'see-result-line': 'Acertaste {correct} de {total}',
    'try-harder': '¿Listo para este?',
    'try-easier': 'Prueba este hoy',
    'select-grade': 'Elige tu curso',
    'select-difficulty': 'Elige tu subida',
    'easy-desc': 'El principio del curso: lo que ya sabes',
    'medium-desc': 'La mitad del curso: lo que aprendes ahora',
    'hard-desc': 'El final del curso: lo más nuevo',
    'climb-easy': 'Calentamiento',
    'climb-medium': 'Un paso más',
    'climb-hard': 'Desafío',
    'grade-coming-soon': 'Próximamente'
  }
};
