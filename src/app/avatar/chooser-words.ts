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
  | 'family-robot'
  | 'family-animal'
  | 'animal-grows'
  | 'animal-grew'
  | 'animal-stage-1'
  | 'animal-stage-2'
  | 'animal-stage-3'
  | 'family-space'
  | 'space-grows'
  | 'space-grew'
  | 'space-stage-1'
  | 'space-stage-2'
  | 'space-stage-3'
  | 'family-pizza'
  | 'pizza-grows'
  | 'pizza-grew'
  | 'pizza-stage-1'
  | 'pizza-stage-2'
  | 'pizza-stage-3'
  | 'robot-grows'
  | 'robot-grew'
  | 'robot-stage-1'
  | 'robot-stage-2'
  | 'robot-stage-3'
  | 'kid-grows'
  | 'kid-grew'
  | 'kid-stage-1'
  | 'kid-stage-2'
  | 'kid-stage-3'
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
    'family-robot': 'Robot',
    'family-animal': 'Bear',
    'animal-grows': 'Your bear grows',
    'animal-grew': 'Your bear levelled up!',
    'animal-stage-1': 'Cub',
    'animal-stage-2': 'Footballer',
    'animal-stage-3': 'Champion',
    'family-space': 'Alien',
    'space-grows': 'Your alien grows',
    'space-grew': 'Your alien levelled up!',
    'space-stage-1': 'Pod',
    'space-stage-2': 'Space ranger',
    'space-stage-3': 'Captain',
    'family-pizza': 'Pizza',
    'pizza-grows': 'Your pizza grows',
    'pizza-grew': 'Your pizza levelled up!',
    'pizza-stage-1': 'Slice',
    'pizza-stage-2': 'Caped pizza',
    'pizza-stage-3': 'Super pizza',
    'robot-grows': 'Your robot grows',
    'robot-grew': 'Your robot powered up!',
    'robot-stage-1': 'Round bot',
    'robot-stage-2': 'Robot',
    'robot-stage-3': 'Mech',
    'kid-grows': 'Your hero grows',
    'kid-grew': 'Your hero got stronger!',
    'kid-stage-1': 'Beginner',
    'kid-stage-2': 'Trained',
    'kid-stage-3': 'Legend',
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
    'family-robot': 'Robot',
    'family-animal': 'Beer',
    'animal-grows': 'Je beer groeit',
    'animal-grew': 'Je beer is een level hoger!',
    'animal-stage-1': 'Welpje',
    'animal-stage-2': 'Voetballer',
    'animal-stage-3': 'Kampioen',
    'family-space': 'Alien',
    'space-grows': 'Je alien groeit',
    'space-grew': 'Je alien is een level hoger!',
    'space-stage-1': 'Capsule',
    'space-stage-2': 'Ruimteranger',
    'space-stage-3': 'Kapitein',
    'family-pizza': 'Pizza',
    'pizza-grows': 'Je pizza groeit',
    'pizza-grew': 'Je pizza is een level hoger!',
    'pizza-stage-1': 'Punt',
    'pizza-stage-2': 'Met cape',
    'pizza-stage-3': 'Superpizza',
    'robot-grows': 'Je robot groeit',
    'robot-grew': 'Je robot is opgewaardeerd!',
    'robot-stage-1': 'Rondbot',
    'robot-stage-2': 'Robot',
    'robot-stage-3': 'Mecha',
    'kid-grows': 'Je held groeit',
    'kid-grew': 'Je held is sterker geworden!',
    'kid-stage-1': 'Beginner',
    'kid-stage-2': 'Getraind',
    'kid-stage-3': 'Legende',
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
    'family-robot': 'Robot',
    'family-animal': 'Oso',
    'animal-grows': 'Tu oso crece',
    'animal-grew': '¡Tu oso subió de nivel!',
    'animal-stage-1': 'Osezno',
    'animal-stage-2': 'Futbolista',
    'animal-stage-3': 'Campeón',
    'family-space': 'Alienígena',
    'space-grows': 'Tu alienígena crece',
    'space-grew': '¡Tu alienígena subió de nivel!',
    'space-stage-1': 'Cápsula',
    'space-stage-2': 'Guardián espacial',
    'space-stage-3': 'Capitán',
    'family-pizza': 'Pizza',
    'pizza-grows': 'Tu pizza crece',
    'pizza-grew': '¡Tu pizza subió de nivel!',
    'pizza-stage-1': 'Porción',
    'pizza-stage-2': 'Con capa',
    'pizza-stage-3': 'Superpizza',
    'robot-grows': 'Tu robot crece',
    'robot-grew': '¡Tu robot se mejoró!',
    'robot-stage-1': 'Bot redondo',
    'robot-stage-2': 'Robot',
    'robot-stage-3': 'Meca',
    'kid-grows': 'Tu héroe crece',
    'kid-grew': '¡Tu héroe se hizo más fuerte!',
    'kid-stage-1': 'Principiante',
    'kid-stage-2': 'Entrenado',
    'kid-stage-3': 'Leyenda',
    'creature-grew': '¡Tu dragón creció!',
    'creature-stage-1': 'Dragón bebé',
    'creature-stage-2': 'Dragón joven',
    'creature-stage-3': 'Gran dragón'
  }
};
