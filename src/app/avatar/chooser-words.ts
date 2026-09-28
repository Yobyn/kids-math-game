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
  | 'on-your-back'
  | 'shoes'
  | 'skin'
  | 'glasses'
  | 'extras'
  | 'top-colour'
  | 'own-colour'
  | 'be-a'
  | 'family-kid'
  | 'family-creature'
  | 'creature-grows'
  | 'creature-grew'
  | 'creature-stage-1'
  | 'creature-stage-2'
  | 'creature-stage-3';

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
    'on-your-back': 'On your back',
    'shoes': 'Shoes',
    'skin': 'Skin',
    'glasses': 'Glasses',
    'extras': 'Extras',
    'top-colour': 'Top colour',
    'own-colour': 'Its own colour',
    'be-a': 'Be a',
    'family-kid': 'Kid hero',
    'family-creature': 'Dragon',
    'creature-grows': 'Your dragon grows',
    'creature-grew': 'Your dragon grew!',
    'creature-stage-1': 'Baby dragon',
    'creature-stage-2': 'Young dragon',
    'creature-stage-3': 'Big dragon'
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
    'on-your-back': 'Op je rug',
    'shoes': 'Schoenen',
    'skin': 'Huid',
    'glasses': 'Brillen',
    'extras': "Extra's",
    'top-colour': 'Kleur van je shirt',
    'own-colour': 'Eigen kleur',
    'be-a': 'Wees een',
    'family-kid': 'Held',
    'family-creature': 'Draak',
    'creature-grows': 'Je draak groeit',
    'creature-grew': 'Je draak is gegroeid!',
    'creature-stage-1': 'Babydraakje',
    'creature-stage-2': 'Jonge draak',
    'creature-stage-3': 'Grote draak'
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
    'on-your-back': 'En la espalda',
    'shoes': 'Zapatos',
    'skin': 'Piel',
    'glasses': 'Gafas',
    'extras': 'Extras',
    'top-colour': 'Color de tu camiseta',
    'own-colour': 'Su propio color',
    'be-a': 'Sé un',
    'family-kid': 'Héroe',
    'family-creature': 'Dragón',
    'creature-grows': 'Tu dragón crece',
    'creature-grew': '¡Tu dragón creció!',
    'creature-stage-1': 'Dragón bebé',
    'creature-stage-2': 'Dragón joven',
    'creature-stage-3': 'Gran dragón'
  }
};
