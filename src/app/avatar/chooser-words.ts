import type { Words } from '../services/language.service';

/**
 * The dressing-up screen's own words, in its lazy chunk rather than in the language
 * service: everything there is in the first load, and this screen is not.
 * The screen hands them to the service when it opens (`extend`).
 */
export type ChooserKey =
  | 'body-type'
  | 'boy'
  | 'girl'
  | 'next-unlock'
  | 'events-return'
  | 'back-in'
  | 'turn-left'
  | 'turn-right'
  | 'your-face'
  | 'your-hair'
  | 'things-to-wear'
  | 'face-shape'
  | 'eye-shape'
  | 'eyes'
  | 'mouth-shape'
  | 'hair-style'
  | 'hair-texture'
  | 'hair-colour'
  | 'hats'
  | 'tops'
  | 'pets'
  | 'on-your-back';

export const CHOOSER_WORDS: Words<ChooserKey> = {
  en: {
    'body-type': 'You are a',
    'boy': 'Boy',
    'girl': 'Girl',
    'next-unlock': 'Next:',
    'events-return': 'Event items come back every year — nothing is ever gone for good.',
    'back-in': 'back in',
    'turn-left': 'Turn left',
    'turn-right': 'Turn right',
    'your-face': 'Your face',
    'your-hair': 'Your hair',
    'things-to-wear': 'Things to wear',
    'face-shape': 'Face',
    'eye-shape': 'Eyes',
    'eyes': 'Eye colour',
    'mouth-shape': 'Mouth',
    'hair-style': 'Hair',
    'hair-texture': 'Hair texture',
    'hair-colour': 'Hair colour',
    'hats': 'Hats',
    'tops': 'Tops',
    'pets': 'Pets',
    'on-your-back': 'On your back'
  },
  nl: {
    'body-type': 'Je bent een',
    'boy': 'Jongen',
    'girl': 'Meisje',
    'next-unlock': 'Hierna:',
    'events-return': 'Evenementen komen elk jaar terug — niets is ooit voorgoed weg.',
    'back-in': 'terug in',
    'turn-left': 'Draai naar links',
    'turn-right': 'Draai naar rechts',
    'your-face': 'Jouw gezicht',
    'your-hair': 'Jouw haar',
    'things-to-wear': 'Om aan te doen',
    'face-shape': 'Gezicht',
    'eye-shape': 'Ogen',
    'eyes': 'Oogkleur',
    'mouth-shape': 'Mond',
    'hair-style': 'Haar',
    'hair-texture': 'Haarstructuur',
    'hair-colour': 'Haarkleur',
    'hats': 'Hoeden',
    'tops': 'Kleding',
    'pets': 'Huisdieren',
    'on-your-back': 'Op je rug'
  },
  es: {
    'body-type': 'Eres',
    'boy': 'Chico',
    'girl': 'Chica',
    'next-unlock': 'Siguiente:',
    'events-return': 'Los eventos vuelven cada año: nada se pierde para siempre.',
    'back-in': 'vuelve en',
    'turn-left': 'Girar a la izquierda',
    'turn-right': 'Girar a la derecha',
    'your-face': 'Tu cara',
    'your-hair': 'Tu pelo',
    'things-to-wear': 'Para ponerte',
    'face-shape': 'Cara',
    'eye-shape': 'Ojos',
    'eyes': 'Color de ojos',
    'mouth-shape': 'Boca',
    'hair-style': 'Pelo',
    'hair-texture': 'Textura del pelo',
    'hair-colour': 'Color de pelo',
    'hats': 'Sombreros',
    'tops': 'Ropa',
    'pets': 'Mascotas',
    'on-your-back': 'En la espalda'
  }
};
