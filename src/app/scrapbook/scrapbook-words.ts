import type { Words } from '../services/language.service';

/**
 * The scrapbook's own words, in its lazy chunk rather than in the language
 * service: everything there is in the first load, and this screen is not.
 * The screen hands them to the service when it opens (`extend`).
 */
export type ScrapbookKey =
  | 'your-book'
  | 'book-empty'
  | 'book-back'
  | 'book-won'
  | 'book-from-event'
  | 'book-long-ago'
  | 'book-best'
  | 'book-first';

export const SCRAPBOOK_WORDS: Words<ScrapbookKey> = {
  en: {
    'your-book': 'Your book',
    'book-empty': 'Play a round and this book starts filling up.',
    'book-back': 'Back to your progress',
    'book-won': 'You won this',
    'book-from-event': 'You were here for this',
    'book-long-ago': 'A while ago',
    'book-best': 'Your best round: {percent}%',
    'book-first': 'The earliest round in here'
  },
  nl: {
    'your-book': 'Jouw boek',
    'book-empty': 'Speel een ronde en dit boek loopt vol.',
    'book-back': 'Terug naar je voortgang',
    'book-won': 'Dit heb je verdiend',
    'book-from-event': 'Hier was je bij',
    'book-long-ago': 'Een tijdje geleden',
    'book-best': 'Je beste ronde: {percent}%',
    'book-first': 'De oudste ronde hierin'
  },
  es: {
    'your-book': 'Tu libro',
    'book-empty': 'Juega una ronda y este libro empezará a llenarse.',
    'book-back': 'Volver a tu progreso',
    'book-won': 'Esto lo ganaste',
    'book-from-event': 'Aquí estuviste',
    'book-long-ago': 'Hace un tiempo',
    'book-best': 'Tu mejor ronda: {percent}%',
    'book-first': 'La ronda más antigua de aquí'
  }
};
