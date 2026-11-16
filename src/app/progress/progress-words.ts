import type { Words } from '../services/language.service';

/**
 * The progress screen's own words, in its lazy chunk rather than in the language
 * service: everything there is in the first load, and this screen is not.
 * The screen hands them to the service when it opens (`extend`).
 */
export type ProgressKey =
  | 'your-best'
  | 'rounds-finished'
  | 'round-finished'
  | 'questions-answered'
  | 'question-answered'
  | 'answer-right-in-all'
  | 'progress-empty'
  | 'things-earned'
  | 'more-to-win'
  | 'open-book';

// 'answer-right-in-all' says what the result screen's 'answer-right' does (question/play-words.ts):
// no two lazy screens share a key, and both singulars stay out of the first load

export const PROGRESS_WORDS: Words<ProgressKey> = {
  en: {
    'your-best': 'Your best so far',
    'rounds-finished': 'rounds finished',
    'questions-answered': 'questions answered',
    'round-finished': 'round finished',
    'question-answered': 'question answered',
    'answer-right-in-all': 'answer right',
    'progress-empty': 'Play a round and this fills up.',
    'things-earned': 'Things you have earned',
    'more-to-win': 'There is more to win — keep playing.',
    'open-book': 'Your book'
  },
  nl: {
    'your-best': 'Je beste tot nu toe',
    'rounds-finished': 'rondes gespeeld',
    'questions-answered': 'vragen beantwoord',
    'round-finished': 'ronde gespeeld',
    'question-answered': 'vraag beantwoord',
    'answer-right-in-all': 'goed antwoord',
    'progress-empty': 'Speel een ronde en dit vult zich.',
    'things-earned': 'Wat je hebt verdiend',
    'more-to-win': 'Er is meer te winnen — blijf spelen.',
    'open-book': 'Jouw boek'
  },
  es: {
    'your-best': 'Tu mejor resultado',
    'rounds-finished': 'rondas jugadas',
    'questions-answered': 'preguntas respondidas',
    'round-finished': 'ronda jugada',
    'question-answered': 'pregunta respondida',
    'answer-right-in-all': 'respuesta correcta',
    'progress-empty': 'Juega una ronda y esto se llenará.',
    'things-earned': 'Lo que has ganado',
    'more-to-win': 'Hay más por ganar: sigue jugando.',
    'open-book': 'Tu libro'
  }
};
