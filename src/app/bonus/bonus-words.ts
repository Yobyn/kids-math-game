import { Words } from '../services/language.service';

/** The bonus game's own words, fetched with it (app-routing.module.ts) and handed over as it opens. */
export type BonusKey =
  | 'bonus-title'
  | 'bonus-how'
  | 'bonus-start'
  | 'bonus-well-played'
  | 'bonus-points-won'
  | 'bonus-done'
  | 'bonus-board'
  | 'jump-title'
  | 'jump-how'
  | 'jump-board'
  | 'jump-finished';

export const BONUS_WORDS: Words<BonusKey> = {
  en: {
    'bonus-title': 'Ball game',
    'bonus-how': 'Slide the paddle to keep the ball up. Every bounce is a point!',
    'bonus-start': 'Start',
    'bonus-well-played': 'Well played!',
    'bonus-points-won': 'bonus points',
    'bonus-done': 'Carry on',
    'bonus-board': 'A ball bouncing above a paddle',
    'jump-title': 'Bounce ball',
    'jump-how': 'Tap to bounce over the blocks on the ground. Stay low under the ones in the air, and roll on to the flag!',
    'jump-board': 'A ball rolling past blocks on the ground and in the air',
    'jump-finished': 'You reached the flag!'
  },
  nl: {
    'bonus-title': 'Balspel',
    'bonus-how': 'Schuif het plankje en houd de bal hoog. Elke stuit is een punt!',
    'bonus-start': 'Start',
    'bonus-well-played': 'Goed gespeeld!',
    'bonus-points-won': 'bonuspunten',
    'bonus-done': 'Verder',
    'bonus-board': 'Een bal die boven een plankje stuitert',
    'jump-title': 'Springbal',
    'jump-how': 'Tik om over de blokken op de grond te springen. Blijf laag onder de blokken in de lucht en rol door naar de vlag!',
    'jump-board': 'Een rollende bal langs blokken op de grond en in de lucht',
    'jump-finished': 'Je hebt de vlag gehaald!'
  },
  es: {
    'bonus-title': 'Juego de pelota',
    'bonus-how': 'Mueve la paleta para mantener la pelota arriba. ¡Cada rebote es un punto!',
    'bonus-start': 'Empezar',
    'bonus-well-played': '¡Bien jugado!',
    'bonus-points-won': 'puntos extra',
    'bonus-done': 'Seguir',
    'bonus-board': 'Una pelota que rebota sobre una paleta',
    'jump-title': 'Pelota saltarina',
    'jump-how': '¡Toca para saltar los bloques del suelo. Quédate abajo bajo los del aire y rueda hasta la bandera!',
    'jump-board': 'Una pelota que rueda entre bloques en el suelo y en el aire',
    'jump-finished': '¡Llegaste a la bandera!'
  }
};
