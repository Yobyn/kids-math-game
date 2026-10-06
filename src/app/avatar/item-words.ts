import { Words } from '../services/language.service';

/**
 * The names of the things a child can win and wear, fetched with them rather than in the first load (app-routing.module.ts).
 * Each screen that shows one of them hands them to the service as it opens
 * (`extend`, first thing in its constructor).
 */
export type ItemKey =
  | 'item-none'
  | 'item-cap'
  | 'item-beanie'
  | 'item-crown'
  | 'item-wizard'
  | 'item-round-glasses'
  | 'item-shades'
  | 'item-goggles'
  | 'item-striped'
  | 'item-star-tee'
  | 'item-hoodie'
  | 'item-kitten'
  | 'item-puppy'
  | 'item-dragon'
  | 'item-backpack'
  | 'item-cape'
  | 'item-high-tops'
  | 'item-boots'
  | 'item-light-up'
  | 'item-bobble-hat'
  | 'item-flower-tee'
  | 'item-spooky-glasses';

export const ITEM_WORDS: Words<ItemKey> = {
  en: {
    'item-none': 'Nothing',
    'item-cap': 'Cap',
    'item-beanie': 'Beanie',
    'item-crown': 'Crown',
    'item-wizard': 'Wizard hat',
    'item-round-glasses': 'Round glasses',
    'item-shades': 'Sunglasses',
    'item-goggles': 'Goggles',
    'item-striped': 'Striped shirt',
    'item-star-tee': 'Star shirt',
    'item-hoodie': 'Hoodie',
    'item-kitten': 'Kitten',
    'item-puppy': 'Puppy',
    'item-dragon': 'Baby dragon',
    'item-backpack': 'Backpack',
    'item-cape': 'Cape',
    'item-high-tops': 'High-tops',
    'item-boots': 'Boots',
    'item-light-up': 'Light-up shoes',
    'item-bobble-hat': 'Bobble hat',
    'item-flower-tee': 'Flower shirt',
    'item-spooky-glasses': 'Spooky glasses'
  },
  nl: {
    'item-none': 'Niets',
    'item-cap': 'Pet',
    'item-beanie': 'Muts',
    'item-crown': 'Kroon',
    'item-wizard': 'Tovenaarshoed',
    'item-round-glasses': 'Ronde bril',
    'item-shades': 'Zonnebril',
    'item-goggles': 'Duikbril',
    'item-striped': 'Gestreept shirt',
    'item-star-tee': 'Sterrenshirt',
    'item-hoodie': 'Hoodie',
    'item-kitten': 'Poesje',
    'item-puppy': 'Puppy',
    'item-dragon': 'Draakje',
    'item-backpack': 'Rugzak',
    'item-cape': 'Cape',
    'item-high-tops': 'Hoge sneakers',
    'item-boots': 'Laarzen',
    'item-light-up': 'Lichtschoenen',
    'item-bobble-hat': 'Muts met pompon',
    'item-flower-tee': 'Bloemenshirt',
    'item-spooky-glasses': 'Griezelbril'
  },
  es: {
    'item-none': 'Nada',
    'item-cap': 'Gorra',
    'item-beanie': 'Gorro',
    'item-crown': 'Corona',
    'item-wizard': 'Sombrero de mago',
    'item-round-glasses': 'Gafas redondas',
    'item-shades': 'Gafas de sol',
    'item-goggles': 'Gafas de buceo',
    'item-striped': 'Camiseta de rayas',
    'item-star-tee': 'Camiseta de estrella',
    'item-hoodie': 'Sudadera',
    'item-kitten': 'Gatito',
    'item-puppy': 'Cachorro',
    'item-dragon': 'Dragoncito',
    'item-backpack': 'Mochila',
    'item-cape': 'Capa',
    'item-high-tops': 'Zapatillas altas',
    'item-boots': 'Botas',
    'item-light-up': 'Zapatillas con luz',
    'item-bobble-hat': 'Gorro con pompón',
    'item-flower-tee': 'Camiseta de flores',
    'item-spooky-glasses': 'Gafas de miedo'
  }
};
