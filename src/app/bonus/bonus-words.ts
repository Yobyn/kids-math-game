import { Words } from '../services/language.service';

/** The bonus game's own words, fetched with it (app-routing.module.ts) and handed over as it opens. */
export type BonusKey =
  | 'bonus-title'
  | 'bonus-how'
  | 'bonus-start'
  | 'bonus-well-played'
  | 'bonus-points-won'
  | 'bonus-point-won'
  | 'bonus-done'
  | 'bonus-board'
  | 'jump-title'
  | 'jump-how'
  | 'jump-board'
  | 'jump-finished'
  | 'jump-hearts'
  | 'pong-hearts'
  | 'balloons-title'
  | 'balloons-how'
  | 'balloons-board'
  | 'balloons-hearts'
  | 'balloons-finished'
  | 'bonus-best'
  | 'bonus-new-best';

export const BONUS_WORDS: Words<BonusKey> = {
  en: {
    'bonus-title': 'Ball game',
    'bonus-how': 'Slide the paddle to keep the ball up. Every bounce is a point!',
    'bonus-start': 'Start',
    'bonus-well-played': 'Well played!',
    'bonus-points-won': 'bonus points',
    'bonus-point-won': 'bonus point',
    'bonus-done': 'Carry on',
    'bonus-board': 'A ball bouncing above a paddle',
    'jump-title': 'Bounce ball',
    'jump-how': 'Tap to bounce over the blocks on the ground. Stay low under the ones in the air, and roll on to the flag!',
    'jump-board': 'A ball rolling past blocks on the ground and in the air',
    'jump-finished': 'You reached the flag!',
    'balloons-title': 'Balloons',
    'balloons-how': 'Tap the balloons to pop them. Do not let three float away!',
    'balloons-board': 'Balloons floating up to be popped',
    'balloons-hearts': 'balloons may still float away',
    'jump-hearts': 'bumps to spare',
    'pong-hearts': 'misses to spare',
    'balloons-finished': 'That was the last balloon!',
    'bonus-best': 'Best so far',
    'bonus-new-best': 'New best!'
  },
  nl: {
    'bonus-title': 'Balspel',
    'bonus-how': 'Schuif het plankje en houd de bal hoog. Elke stuit is een punt!',
    'bonus-start': 'Start',
    'bonus-well-played': 'Goed gespeeld!',
    'bonus-points-won': 'bonuspunten',
    'bonus-point-won': 'bonuspunt',
    'bonus-done': 'Verder',
    'bonus-board': 'Een bal die boven een plankje stuitert',
    'jump-title': 'Springbal',
    'jump-how': 'Tik om over de blokken op de grond te springen. Blijf laag onder de blokken in de lucht en rol door naar de vlag!',
    'jump-board': 'Een rollende bal langs blokken op de grond en in de lucht',
    'jump-finished': 'Je hebt de vlag gehaald!',
    'balloons-title': 'Ballonnen',
    'balloons-how': 'Tik op de ballonnen om ze te laten knallen. Laat er geen drie wegvliegen!',
    'balloons-board': 'Ballonnen die omhoog zweven om te knallen',
    'balloons-hearts': 'ballonnen mogen nog wegvliegen',
    'jump-hearts': 'keer botsen mag nog',
    'pong-hearts': 'keer missen mag nog',
    'balloons-finished': 'Dat was de laatste ballon!',
    'bonus-best': 'Beste tot nu toe',
    'bonus-new-best': 'Nieuw record!'
  },
  es: {
    'bonus-title': 'Juego de pelota',
    'bonus-how': 'Mueve la paleta para mantener la pelota arriba. ¡Cada rebote es un punto!',
    'bonus-start': 'Empezar',
    'bonus-well-played': '¡Bien jugado!',
    'bonus-points-won': 'puntos extra',
    'bonus-point-won': 'punto extra',
    'bonus-done': 'Seguir',
    'bonus-board': 'Una pelota que rebota sobre una paleta',
    'jump-title': 'Pelota saltarina',
    'jump-how': '¡Toca para saltar los bloques del suelo. Quédate abajo bajo los del aire y rueda hasta la bandera!',
    'jump-board': 'Una pelota que rueda entre bloques en el suelo y en el aire',
    'jump-finished': '¡Llegaste a la bandera!',
    'balloons-title': 'Globos',
    'balloons-how': 'Toca los globos para reventarlos. ¡Que no se escapen tres!',
    'balloons-board': 'Globos que suben para reventarlos',
    'balloons-hearts': 'globos pueden escaparse todavía',
    'jump-hearts': 'choques de sobra',
    'pong-hearts': 'fallos de sobra',
    'balloons-finished': '¡Era el último globo!',
    'bonus-best': 'Mejor hasta ahora',
    'bonus-new-best': '¡Nuevo récord!'
  }
};
