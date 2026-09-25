import type { Words } from '../services/language.service';

/**
 * The progress screen's own words, in its lazy chunk rather than in the language
 * service: everything there is in the first load, and this screen is not.
 * The screen hands them to the service when it opens (`extend`).
 */
export type ProgressKey =
  | 'your-best'
  | 'rounds-finished'
  | 'questions-answered'
  | 'progress-empty'
  | 'things-earned'
  | 'more-to-win'
  | 'open-book';

export const PROGRESS_WORDS: Words<ProgressKey> = {
  en: {
    'your-best': 'Your best so far',
    'rounds-finished': 'rounds finished',
    'questions-answered': 'questions answered',
    'progress-empty': 'Play a round and this fills up.',
    'things-earned': 'Things you have earned',
    'more-to-win': 'There is more to win — keep playing.',
    'open-book': 'Your book'
  },
  nl: {
    'your-best': 'Je beste tot nu toe',
    'rounds-finished': 'rondes gespeeld',
    'questions-answered': 'vragen beantwoord',
    'progress-empty': 'Speel een ronde en dit vult zich.',
    'things-earned': 'Wat je hebt verdiend',
    'more-to-win': 'Er is meer te winnen — blijf spelen.',
    'open-book': 'Jouw boek'
  },
  es: {
    'your-best': 'Tu mejor resultado',
    'rounds-finished': 'rondas jugadas',
    'questions-answered': 'preguntas respondidas',
    'progress-empty': 'Juega una ronda y esto se llenará.',
    'things-earned': 'Lo que has ganado',
    'more-to-win': 'Hay más por ganar: sigue jugando.',
    'open-book': 'Tu libro'
  }
};
