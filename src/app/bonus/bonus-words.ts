import { Words } from '../services/language.service';

/** The bonus game's own words, fetched with it (app-routing.module.ts) and handed over as it opens. */
export type BonusKey =
  | 'bonus-title'
  | 'bonus-how'
  | 'bonus-start'
  | 'bonus-well-played'
  | 'bonus-points-won'
  | 'bonus-done'
  | 'bonus-board';

export const BONUS_WORDS: Words<BonusKey> = {
  en: {
    'bonus-title': 'Ball game',
    'bonus-how': 'Slide the paddle to keep the ball up. Every bounce is a point!',
    'bonus-start': 'Start',
    'bonus-well-played': 'Well played!',
    'bonus-points-won': 'bonus points',
    'bonus-done': 'Carry on',
    'bonus-board': 'A ball bouncing above a paddle'
  },
  nl: {
    'bonus-title': 'Balspel',
    'bonus-how': 'Schuif het plankje en houd de bal hoog. Elke stuit is een punt!',
    'bonus-start': 'Start',
    'bonus-well-played': 'Goed gespeeld!',
    'bonus-points-won': 'bonuspunten',
    'bonus-done': 'Verder',
    'bonus-board': 'Een bal die boven een plankje stuitert'
  },
  es: {
    'bonus-title': 'Juego de pelota',
    'bonus-how': 'Mueve la paleta para mantener la pelota arriba. ¡Cada rebote es un punto!',
    'bonus-start': 'Empezar',
    'bonus-well-played': '¡Bien jugado!',
    'bonus-points-won': 'puntos extra',
    'bonus-done': 'Seguir',
    'bonus-board': 'Una pelota que rebota sobre una paleta'
  }
};
