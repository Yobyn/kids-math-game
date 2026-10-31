/**
 * Verhaaltjessommen (docs/CURRICULUM-NL.md, build order 8), groep 3 to klas 2
 * (Yobyn, 2026-10-24: "the questions asked to the kids, lets expand make it
 * better"). Groep 5 and 6 add the tables and bigger sums in stories, sharing
 * with something left over, euros, measures, a part of an amount and area.
 * Groep 7 to klas 2 add percentages and discounts, ratio tables, scale, the
 * mean, volume, time spans, speed, temperatures below nought, prices going up
 * or down, and Pythagoras. A story of one or two short sentences a 6- or
 * 7-year-old can read, with a small picture, told around exactly the sum the
 * groep's moment already asks (groep.ts): "Er zitten 7 vogels in de boom.
 * Er komen er 5 bij. Hoeveel vogels zitten er nu in de boom?" is 7 + 5.
 *
 * The question keeps its sum, as the written forms do (question/sum-form.ts),
 * so marking, a saved round, a replay and the worked line after two tries
 * all work from the sum; the story only says how it is asked. The child sees
 * the story and the answer box, not the sum: turning the story into a sum is
 * what a verhaaltjessom teaches, and the worked line shows it after two tries.
 *
 * Each language is told in its own words, not translated word for word, with
 * "1 vogel" and "7 vogels" as each language has them. Names rather than
 * he or she, so no story has to guess. Lazy, with the round: only the
 * question screen imports this.
 */

import { Language } from '../../services/language.service';
import { StoryPick } from '../../question/story-pick';
import {
  DISCOUNT_FORMS, MEAN_FORMS, PERCENT_CHANGE_FORMS, PERCENT_FORMS, PERCENT_STEP_FORMS, PYTHAGORAS_FORMS, PercentForm,
  PercentStepForm, PythagorasForm, RATIO_FORMS, RatioForm, SCALE_FORMS, ScaleForm, SumForm, TEMPERATURE_FORMS, VOLUME_FORMS,
  VolumeForm, lastNumberOf, lengthOf, packsOf, percentOf, scaleOf, sidesOf, stepOf
} from '../../question/sum-form';
import { clock, degrees, meanList, tenths } from './written-form';
import { Moment, Random, SchoolSum } from './groep';

/** "7 vogels", "1 vogel": a count with its noun. */
function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** The story in one language: the sum's two numbers, two names, and the sum's written form when it has one. */
type Tell = (a: number, b: number, name: string, other: string, form?: SumForm) => string;

interface Story {
  id: string;
  /** The sum it tells: a + b, a − b, a groups of b, a shared out in b, what is left of a in groups of b. */
  operation: '+' | '-' | '*' | '/' | '%';
  emoji: string;
  /** The largest number it tells, of either number or the answer: no bus holds 90 children. */
  most: number;
  /** The smallest first number it tells: a bike does not cost €7. */
  least?: number;
  /**
   * The fewest groups it can tell: "1 zakje met elk 5 snoepjes", or 7
   * marbles shared "over 1 kinderen", does not read. A times story with it
   * has at least two in each group too: not "8 zakjes met elk 1 snoepje".
   */
  fewestGroups?: number;
  /** The written forms it tells (sum-form.ts); without, only a sum written as a sum. */
  forms?: SumForm[];
  /**
   * Only the first number is said: the second is what the child brings to it,
   * 100 cm in a metre, or a quarter being 4 parts.
   */
  onlyFirst?: boolean;
  /**
   * It says exactly the numbers its written form shows, "20% korting op
   * €45" for 45 − 9: the percentage, the times, the scale, not the sum's
   * own two numbers (story.spec.ts holds it to the form's layout).
   */
  asWritten?: boolean;
  /** The answer may be below nought: a temperature. */
  negative?: boolean;
  /** Any other bound it needs: no test has 200 sums. */
  fits?: (a: number, b: number) => boolean;
  tell: { [language in Language]: Tell };
}

/** A part of an amount, as a word: "een kwart" for 4 parts, as the sum ¼ van 20 is kept as 20 : 4. */
const PART: { [language in Language]: { [parts: number]: string } } = {
  nl: { 3: 'een derde', 4: 'een kwart', 5: 'een vijfde' },
  en: { 3: 'a third', 4: 'a quarter', 5: 'a fifth' },
  es: { 3: 'un tercio', 4: 'la cuarta parte', 5: 'la quinta parte' }
};

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "11, 15 en 10": a list as each language ends it. */
const AND: { [language in Language]: string } = { nl: 'en', en: 'and', es: 'y' };
function list(values: number[], language: Language): string {
  return `${values.slice(0, -1).join(', ')} ${AND[language]} ${values[values.length - 1]}`;
}

/**
 * The percentage and the amount it is of, as the form writes them: 25% van
 * 60 is kept as 60 : 4, 15% van 60 as 3 × 3 (sum-form.ts).
 */
function percentage(a: number, b: number, form?: SumForm): [number, number] {
  if (form && form.startsWith('procent-via-')) {
    const step = stepOf(form as PercentStepForm);
    return [step * b, a * 100 / step];
  }
  return [percentOf(form as PercentForm), a];
}

/** A number of hours with its comma, or point in English: 2,5 uur. */
const hours = (halfHours: number, language: Language) => tenths(halfHours * 5, language === 'en' ? '.' : ',');

export const STORIES: Story[] = [
  {
    id: 'plus-boom', operation: '+', emoji: '🐦', most: 20,
    tell: {
      nl: (a, b) => `Er ${a === 1 ? 'zit' : 'zitten'} ${count(a, 'vogel', 'vogels')} in de boom. ` +
        `Er ${b === 1 ? 'komt' : 'komen'} er ${b} bij. Hoeveel vogels zitten er nu in de boom?`,
      en: (a, b) => `There ${a === 1 ? 'is' : 'are'} ${count(a, 'bird', 'birds')} in the tree. ` +
        `${b} more ${b === 1 ? 'bird flies' : 'birds fly'} in. How many birds are in the tree now?`,
      es: (a, b) => `Hay ${count(a, 'pájaro', 'pájaros')} en el árbol. ` +
        `${b === 1 ? 'Llega' : 'Llegan'} ${count(b, 'pájaro', 'pájaros')} más. ¿Cuántos pájaros hay ahora en el árbol?`
    }
  },
  {
    id: 'plus-stickers', operation: '+', emoji: '⭐', most: 100,
    tell: {
      nl: (a, b, name) => `${name} heeft ${count(a, 'sticker', 'stickers')}. ${name} krijgt er ${b} bij. ` +
        `Hoeveel stickers heeft ${name} nu?`,
      en: (a, b, name) => `${name} has ${count(a, 'sticker', 'stickers')}. ${name} gets ${b} more. ` +
        `How many stickers does ${name} have now?`,
      es: (a, b, name) => `${name} tiene ${count(a, 'pegatina', 'pegatinas')}. Le dan ${b} más. ` +
        `¿Cuántas pegatinas tiene ${name} ahora?`
    }
  },
  {
    id: 'plus-samen', operation: '+', emoji: '🔵', most: 100,
    tell: {
      nl: (a, b, name, other) => `${name} heeft ${count(a, 'knikker', 'knikkers')} en ${other} heeft er ${b}. ` +
        `Hoeveel knikkers hebben ze samen?`,
      en: (a, b, name, other) => `${name} has ${count(a, 'marble', 'marbles')} and ${other} has ${b}. ` +
        `How many marbles do they have together?`,
      es: (a, b, name, other) => `${name} tiene ${count(a, 'canica', 'canicas')} y ${other} tiene ${b}. ` +
        `¿Cuántas canicas tienen entre los dos?`
    }
  },
  {
    id: 'plus-bus', operation: '+', emoji: '🚌', most: 50,
    tell: {
      nl: (a, b) => `In de bus ${a === 1 ? 'zit' : 'zitten'} ${count(a, 'kind', 'kinderen')}. ` +
        `Bij de halte ${b === 1 ? 'stapt' : 'stappen'} er ${b} in. Hoeveel kinderen zitten er nu in de bus?`,
      en: (a, b) => `There ${a === 1 ? 'is' : 'are'} ${count(a, 'child', 'children')} on the bus. ` +
        `At the stop, ${b} more ${b === 1 ? 'gets' : 'get'} on. How many children are on the bus now?`,
      es: (a, b) => `En el autobús ${a === 1 ? 'va' : 'van'} ${count(a, 'niño', 'niños')}. ` +
        `En la parada ${b === 1 ? 'sube' : 'suben'} ${b} más. ¿Cuántos niños van ahora en el autobús?`
    }
  },
  {
    id: 'min-boom', operation: '-', emoji: '🐦', most: 20,
    tell: {
      nl: (a, b) => `Er zitten ${a} vogels in de boom. Er ${b === 1 ? 'vliegt' : 'vliegen'} er ${b} weg. ` +
        `Hoeveel vogels zitten er nog in de boom?`,
      en: (a, b) => `There are ${a} birds in the tree. ${b} ${b === 1 ? 'bird flies' : 'birds fly'} away. ` +
        `How many birds are still in the tree?`,
      es: (a, b) => `Hay ${a} pájaros en el árbol. Se ${b === 1 ? 'va volando' : 'van volando'} ${b}. ` +
        `¿Cuántos pájaros quedan en el árbol?`
    }
  },
  {
    id: 'min-koekjes', operation: '-', emoji: '🍪', most: 20,
    tell: {
      nl: (a, b, name) => `${name} heeft ${a} koekjes. ${name} eet er ${b} op. Hoeveel koekjes heeft ${name} nog?`,
      en: (a, b, name) => `${name} has ${a} cookies. ${name} eats ${b}. How many cookies does ${name} have left?`,
      es: (a, b, name) => `${name} tiene ${a} galletas. Se come ${b}. ¿Cuántas galletas le quedan a ${name}?`
    }
  },
  {
    id: 'min-bus', operation: '-', emoji: '🚌', most: 50,
    tell: {
      nl: (a, b) => `In de bus zitten ${a} kinderen. Bij de halte ${b === 1 ? 'stapt' : 'stappen'} er ${b} uit. ` +
        `Hoeveel kinderen zitten er nog in de bus?`,
      en: (a, b) => `There are ${a} children on the bus. At the stop, ${b} ${b === 1 ? 'gets' : 'get'} off. ` +
        `How many children are still on the bus?`,
      es: (a, b) => `En el autobús van ${a} niños. En la parada ${b === 1 ? 'se baja' : 'se bajan'} ${b}. ` +
        `¿Cuántos niños quedan en el autobús?`
    }
  },
  {
    id: 'min-ballonnen', operation: '-', emoji: '🎈', most: 20,
    tell: {
      nl: (a, b, name) => `${name} heeft ${a} ballonnen. Er ${b === 1 ? 'knapt' : 'knappen'} er ${b}. ` +
        `Hoeveel ballonnen heeft ${name} nog?`,
      en: (a, b, name) => `${name} has ${a} balloons. ${b} ${b === 1 ? 'pops' : 'pop'}. How many balloons does ${name} have left?`,
      es: (a, b, name) => `${name} tiene ${a} globos. ${b === 1 ? 'Explota' : 'Explotan'} ${b}. ¿Cuántos globos le quedan a ${name}?`
    }
  },
  {
    id: 'keer-eieren', operation: '*', emoji: '🥚', most: 100,
    tell: {
      nl: (a, b) => `Er ${a === 1 ? 'staat' : 'staan'} ${count(a, 'doosje', 'doosjes')} op tafel. ` +
        `In elk doosje ${b === 1 ? 'zit' : 'zitten'} ${count(b, 'ei', 'eieren')}. Hoeveel eieren zijn het samen?`,
      en: (a, b) => `There ${a === 1 ? 'is' : 'are'} ${count(a, 'box', 'boxes')} on the table. ` +
        `Each box has ${count(b, 'egg', 'eggs')} in it. How many eggs are there in all?`,
      es: (a, b) => `Hay ${count(a, 'caja', 'cajas')} en la mesa. ` +
        `En cada caja hay ${count(b, 'huevo', 'huevos')}. ¿Cuántos huevos hay en total?`
    }
  },
  {
    id: 'keer-snoep', operation: '*', emoji: '🍬', most: 100, fewestGroups: 2,
    tell: {
      nl: (a, b, name) => `${name} koopt ${a} zakjes met elk ${count(b, 'snoepje', 'snoepjes')}. Hoeveel snoepjes zijn het samen?`,
      en: (a, b, name) => `${name} buys ${a} bags with ${count(b, 'sweet', 'sweets')} in each. How many sweets is that in all?`,
      es: (a, b, name) => `${name} compra ${a} bolsas con ${count(b, 'caramelo', 'caramelos')} cada una. ¿Cuántos caramelos son en total?`
    }
  },
  {
    id: 'keer-bloemen', operation: '*', emoji: '🌷', most: 100, fewestGroups: 2,
    tell: {
      nl: (a, b) => `Er staan ${a} vazen met elk ${count(b, 'bloem', 'bloemen')}. Hoeveel bloemen zijn het samen?`,
      en: (a, b) => `There are ${a} vases with ${count(b, 'flower', 'flowers')} in each. How many flowers are there in all?`,
      es: (a, b) => `Hay ${a} jarrones con ${count(b, 'flor', 'flores')} cada uno. ¿Cuántas flores hay en total?`
    }
  },
  {
    id: 'deel-knikkers', operation: '/', emoji: '🔵', most: 100, fewestGroups: 2,
    tell: {
      nl: (a, b, name) => `${name} verdeelt ${a} knikkers eerlijk over ${b} kinderen. Hoeveel knikkers krijgt elk kind?`,
      en: (a, b, name) => `${name} shares ${a} marbles fairly between ${b} children. How many marbles does each child get?`,
      es: (a, b, name) => `${name} reparte ${a} canicas a partes iguales entre ${b} niños. ¿Cuántas canicas recibe cada niño?`
    }
  },
  {
    id: 'deel-appels', operation: '/', emoji: '🍎', most: 100, fewestGroups: 2,
    tell: {
      nl: (a, b) => `Er zijn ${a} appels. Ze gaan in ${b} schalen, in elke schaal evenveel. Hoeveel appels gaan er in elke schaal?`,
      en: (a, b) => `There are ${a} apples. They go into ${b} bowls, the same number in each. How many apples go in each bowl?`,
      es: (a, b) => `Hay ${a} manzanas. Se ponen en ${b} cuencos, las mismas en cada uno. ¿Cuántas manzanas van en cada cuenco?`
    }
  },

  // Groep 5 and 6: the tables and the bigger times sums (4 × 23, 25 × 8, 23 × 14)
  {
    id: 'keer-stoelen', operation: '*', emoji: '🪑', most: 1200, fewestGroups: 2,
    tell: {
      nl: (a, b) => `In de aula staan ${a} rijen met elk ${count(b, 'stoel', 'stoelen')}. Hoeveel stoelen zijn het samen?`,
      en: (a, b) => `The hall has ${a} rows with ${count(b, 'chair', 'chairs')} in each. How many chairs is that in all?`,
      es: (a, b) => `En el salón de actos hay ${a} filas de ${count(b, 'silla', 'sillas')}. ¿Cuántas sillas hay en total?`
    }
  },
  {
    id: 'keer-kaartjes', operation: '*', emoji: '🎟️', most: 1200, fewestGroups: 2,
    tell: {
      nl: (a, b) => `Een kaartje voor de dierentuin kost €${b}. De juf koopt ${a} kaartjes. Hoeveel euro kost dat samen?`,
      en: (a, b) => `A ticket for the zoo costs €${b}. The teacher buys ${a} tickets. How many euros is that altogether?`,
      es: (a, b) => `Una entrada para el zoo cuesta ${b} €. La maestra compra ${a} entradas. ¿Cuántos euros cuestan en total?`
    }
  },
  {
    id: 'keer-bladzijden', operation: '*', emoji: '📖', most: 1000, fewestGroups: 2,
    tell: {
      nl: (a, b, name) => `${name} leest elke dag ${count(b, 'bladzijde', 'bladzijden')}. Hoeveel bladzijden leest ${name} in ${a} dagen?`,
      en: (a, b, name) => `${name} reads ${count(b, 'page', 'pages')} every day. How many pages does ${name} read in ${a} days?`,
      es: (a, b, name) => `${name} lee ${count(b, 'página', 'páginas')} cada día. ¿Cuántas páginas lee ${name} en ${a} días?`
    }
  },

  // Sharing out past the tables: 96 : 4, 150 : 6
  {
    id: 'deel-teams', operation: '/', emoji: '⚽', most: 500, least: 20, fewestGroups: 2,
    tell: {
      nl: (a, b) => `Bij het toernooi spelen ${a} kinderen in ${b} even grote teams. Hoeveel kinderen zitten er in elk team?`,
      en: (a, b) => `${a} children play in the tournament, in ${b} teams of the same size. How many children are in each team?`,
      es: (a, b) => `En el torneo juegan ${a} niños en ${b} equipos iguales. ¿Cuántos niños hay en cada equipo?`
    }
  },
  {
    id: 'deel-rommelmarkt', operation: '/', emoji: '💶', most: 500, least: 20, fewestGroups: 2,
    tell: {
      nl: (a, b) => `Op de rommelmarkt verdienen ${b} kinderen samen €${a}. Ze verdelen het eerlijk. Hoeveel euro krijgt elk kind?`,
      en: (a, b) => `At the jumble sale ${b} children make €${a} together. They share it fairly. How many euros does each child get?`,
      es: (a, b) => `En el mercadillo, ${b} niños ganan ${a} € entre todos. Lo reparten a partes iguales. ¿Cuántos euros recibe cada niño?`
    }
  },

  // Sharing with something left over: 23 : 4 = 5 rest ?
  {
    id: 'rest-eieren', operation: '%', emoji: '🥚', most: 100, forms: ['rest'],
    tell: {
      nl: (a, b, name) => `${name} doet ${a} eieren in doosjes van ${b}. Hoeveel eieren blijven er over als alle doosjes vol zijn?`,
      en: (a, b, name) => `${name} packs ${a} eggs into boxes that hold ${b} each. How many eggs are left over when every box is full?`,
      es: (a, b, name) => `${name} mete ${a} huevos en cajas de ${b}. ¿Cuántos huevos sobran cuando todas las cajas están llenas?`
    }
  },
  {
    id: 'rest-gym', operation: '%', emoji: '🤸', most: 40, forms: ['rest'],
    tell: {
      nl: (a, b) => `In de gymles zijn ${a} kinderen. De juf maakt groepjes van ${b}. Hoeveel kinderen blijven er over?`,
      en: (a, b) => `There are ${a} children in the PE lesson. The teacher makes groups of ${b}. How many children are left over?`,
      es: (a, b) => `En clase de gimnasia hay ${a} niños. La maestra hace grupos de ${b}. ¿Cuántos niños sobran?`
    }
  },
  {
    id: 'rest-snoep', operation: '%', emoji: '🍬', most: 100, forms: ['rest'],
    tell: {
      nl: (a, b, name) => `${name} verdeelt ${a} snoepjes eerlijk over ${b} vrienden. Iedereen krijgt evenveel. ` +
        `Hoeveel snoepjes blijven er over?`,
      en: (a, b, name) => `${name} shares ${a} sweets fairly between ${b} friends, the same number each. How many sweets are left over?`,
      es: (a, b, name) => `${name} reparte ${a} caramelos a partes iguales entre ${b} amigos. ¿Cuántos caramelos sobran?`
    }
  },

  // Within 1000 and 10 000, in euros and in things a child counts
  {
    id: 'plus-sparen', operation: '+', emoji: '🐷', most: 1000, least: 20,
    tell: {
      nl: (a, b, name) => `${name} heeft €${a} gespaard. Oma geeft er €${b} bij. Hoeveel euro heeft ${name} nu?`,
      en: (a, b, name) => `${name} has saved €${a}. Grandma adds €${b}. How many euros does ${name} have now?`,
      es: (a, b, name) => `${name} ha ahorrado ${a} €. Su abuela le da ${b} € más. ¿Cuántos euros tiene ${name} ahora?`
    }
  },
  {
    id: 'min-fiets', operation: '-', emoji: '🚲', most: 1000, least: 100,
    tell: {
      nl: (a, b, name) => `Een fiets kost €${a}. ${name} heeft al €${b}. Hoeveel euro moet ${name} nog sparen?`,
      en: (a, b, name) => `A bike costs €${a}. ${name} already has €${b}. How many more euros does ${name} need to save?`,
      es: (a, b, name) => `Una bici cuesta ${a} €. ${name} ya tiene ${b} €. ¿Cuántos euros le faltan para comprarla?`
    }
  },
  {
    id: 'min-boek', operation: '-', emoji: '📖', most: 1000, least: 100,
    tell: {
      nl: (a, b, name) => `Een boek heeft ${a} bladzijden. ${name} heeft er ${b} gelezen. Hoeveel bladzijden moet ${name} nog lezen?`,
      en: (a, b, name) => `A book has ${a} pages. ${name} has read ${b} of them. How many pages does ${name} still have to read?`,
      es: (a, b, name) => `Un libro tiene ${a} páginas. ${name} ya ha leído ${b}. ¿Cuántas páginas le quedan por leer?`
    }
  },
  {
    id: 'plus-bieb', operation: '+', emoji: '📚', most: 10000, least: 100,
    tell: {
      nl: (a, b) => `In de bibliotheek staan ${a} boeken. Er ${b === 1 ? 'komt' : 'komen'} ${count(b, 'nieuw boek', 'nieuwe boeken')} bij. ` +
        `Hoeveel boeken staan er nu?`,
      en: (a, b) => `The library has ${a} books. ${count(b, 'new book arrives', 'new books arrive')}. How many books does it have now?`,
      es: (a, b) => `En la biblioteca hay ${a} libros. ${b === 1 ? 'Llega' : 'Llegan'} ${count(b, 'libro nuevo', 'libros nuevos')}. ` +
        `¿Cuántos libros hay ahora?`
    }
  },
  {
    id: 'min-tribune', operation: '-', emoji: '🏟️', most: 10000, least: 1000,
    tell: {
      nl: (a, b) => `Bij de wedstrijd zitten ${a} mensen op de tribune. In de rust ${b === 1 ? 'gaat' : 'gaan'} er ${b} naar huis. ` +
        `Hoeveel mensen zitten er nog?`,
      en: (a, b) => `${a} people are watching the match. At half-time ${b} ${b === 1 ? 'goes' : 'go'} home. How many people are still watching?`,
      es: (a, b) => `En el partido hay ${a} personas en la grada. En el descanso ${b === 1 ? 'se va' : 'se van'} ${b} a casa. ` +
        `¿Cuántas personas quedan?`
    }
  },
  {
    id: 'plus-stappen', operation: '+', emoji: '👟', most: 10000, least: 100,
    tell: {
      nl: (a, b, name) => `${name} loopt 's ochtends ${a} stappen en 's middags ${count(b, 'stap', 'stappen')}. Hoeveel stappen is dat samen?`,
      en: (a, b, name) => `${name} walks ${a} steps in the morning and ${count(b, 'step', 'steps')} in the afternoon. How many steps is that in all?`,
      es: (a, b, name) => `${name} camina ${a} pasos por la mañana y ${count(b, 'paso', 'pasos')} por la tarde. ¿Cuántos pasos son en total?`
    }
  },

  // Measures: 3 m = ? cm, kept as 3 × 100. Knowing the 100 is the question
  {
    id: 'maat-touw', operation: '*', emoji: '🪢', most: 1000, forms: ['m-cm'], onlyFirst: true,
    tell: {
      nl: (a, b, name) => `Het springtouw van ${name} is ${a} meter lang. Hoeveel centimeter is dat?`,
      en: (a, b, name) => `${name}'s skipping rope is ${a} metres long. How many centimetres is that?`,
      es: (a, b, name) => `La comba de ${name} mide ${a} metros. ¿Cuántos centímetros son?`
    }
  },
  {
    id: 'maat-wandelen', operation: '*', emoji: '🥾', most: 10000, forms: ['km-m'], onlyFirst: true,
    tell: {
      nl: (a, b, name) => `${name} wandelt ${a} kilometer met de klas. Hoeveel meter is dat?`,
      en: (a, b, name) => `${name} walks ${a} kilometres with the class. How many metres is that?`,
      es: (a, b, name) => `${name} camina ${a} kilómetros con su clase. ¿Cuántos metros son?`
    }
  },
  {
    id: 'maat-meel', operation: '*', emoji: '🍞', most: 10000, forms: ['kg-g'], onlyFirst: true,
    tell: {
      nl: (a, b, name) => `Om brood te bakken koopt ${name} ${a} kilo meel. Hoeveel gram is dat?`,
      en: (a, b, name) => `${name} buys ${a} kilograms of flour to bake bread. How many grams is that?`,
      es: (a, b, name) => `${name} compra ${a} kilos de harina para hacer pan. ¿Cuántos gramos son?`
    }
  },
  {
    id: 'maat-schoolreis', operation: '*', emoji: '🚍', most: 1000, forms: ['uur-min'], onlyFirst: true,
    tell: {
      nl: a => `De schoolreis duurt ${a} uur. Hoeveel minuten is dat?`,
      en: a => `The school trip lasts ${a} hours. How many minutes is that?`,
      es: a => `La excursión dura ${a} horas. ¿Cuántos minutos son?`
    }
  },

  // A part of an amount: ¼ van 20, kept as 20 : 4. The part is said as a word
  {
    id: 'deel-hond', operation: '/', emoji: '🐶', most: 30, forms: ['deel'], onlyFirst: true,
    tell: {
      nl: (a, b) => `In de klas zitten ${a} kinderen. ${capital(PART.nl[b])} van hen heeft een hond. Hoeveel kinderen hebben een hond?`,
      en: (a, b) => `There are ${a} children in the class. ${capital(PART.en[b])} of them have a dog. How many children have a dog?`,
      es: (a, b) => `En la clase hay ${a} niños. ${capital(PART.es[b])} de ellos tiene perro. ¿Cuántos niños tienen perro?`
    }
  },
  {
    id: 'deel-boek', operation: '/', emoji: '💶', most: 50, forms: ['deel'], onlyFirst: true,
    tell: {
      nl: (a, b, name) => `${name} heeft €${a}. ${name} geeft ${PART.nl[b]} ervan uit aan een boek. Hoeveel euro kost het boek?`,
      en: (a, b, name) => `${name} has €${a} and spends ${PART.en[b]} of it on a book. How many euros does the book cost?`,
      es: (a, b, name) => `${name} tiene ${a} € y gasta ${PART.es[b]} en un libro. ¿Cuántos euros cuesta el libro?`
    }
  },

  // Area: 6 m × 4 m = ? m²
  {
    id: 'opp-moestuin', operation: '*', emoji: '🌱', most: 200, forms: ['oppervlakte'],
    tell: {
      nl: (a, b) => `De moestuin van school is ${a} meter lang en ${b} meter breed. Hoeveel vierkante meter is de moestuin?`,
      en: (a, b) => `The school vegetable garden is ${a} metres long and ${b} metres wide. How many square metres is it?`,
      es: (a, b) => `El huerto del colegio mide ${a} metros de largo y ${b} metros de ancho. ¿Cuántos metros cuadrados tiene?`
    }
  },
  {
    id: 'opp-tegels', operation: '*', emoji: '🟦', most: 200, forms: ['oppervlakte'],
    tell: {
      nl: (a, b) => `Een vloer is ${a} tegels lang en ${b} tegels breed. Hoeveel tegels liggen er op de vloer?`,
      en: (a, b) => `A floor is ${a} tiles long and ${b} tiles wide. How many tiles are on the floor?`,
      es: (a, b) => `Un suelo mide ${a} baldosas de largo y ${b} de ancho. ¿Cuántas baldosas hay en el suelo?`
    }
  },

  // Groep 7: cijferend vermenigvuldigen and the staartdeling. 345 × 23, 864 : 24
  {
    id: 'keer-veiling', operation: '*', emoji: '🍏', most: 25000, least: 100, fewestGroups: 2,
    tell: {
      nl: (a, b) => `Op de veiling staan ${a} kisten met elk ${b} appels. Hoeveel appels zijn dat samen?`,
      en: (a, b) => `At the market there are ${a} crates with ${b} apples in each. How many apples is that in all?`,
      es: (a, b) => `En el mercado hay ${a} cajas con ${b} manzanas cada una. ¿Cuántas manzanas son en total?`
    }
  },
  {
    id: 'keer-concert', operation: '*', emoji: '🎫', most: 25000, least: 100, fewestGroups: 2,
    tell: {
      nl: (a, b) => `Voor het schoolconcert worden ${a} kaartjes van €${b} verkocht. Hoeveel euro is dat samen?`,
      en: (a, b) => `${a} tickets at €${b} each are sold for the school concert. How many euros is that in all?`,
      es: (a, b) => `Para el concierto del colegio se venden ${a} entradas de ${b} €. ¿Cuántos euros son en total?`
    }
  },
  {
    id: 'deel-bussen', operation: '/', emoji: '🚌', most: 3000, least: 100, fewestGroups: 10,
    tell: {
      nl: (a, b) => `Er gaan ${a} kinderen op schoolreis, ${b} in elke bus. Alle bussen zijn vol. Hoeveel bussen zijn er nodig?`,
      en: (a, b) => `${a} children go on a school trip, ${b} on each bus. Every bus is full. How many buses are needed?`,
      es: (a, b) => `Van ${a} niños de excursión, ${b} en cada autobús. Todos van llenos. ¿Cuántos autobuses hacen falta?`
    }
  },
  {
    id: 'deel-stickerboek', operation: '/', emoji: '📒', most: 3000, least: 100, fewestGroups: 10,
    tell: {
      nl: (a, b, name) => `${name} plakt ${a} stickers in een boek, ${b} op elke bladzijde. Hoeveel bladzijden worden er vol?`,
      en: (a, b, name) => `${name} sticks ${a} stickers into a book, ${b} on every page. How many pages are filled?`,
      es: (a, b, name) => `${name} pega ${a} pegatinas en un álbum, ${b} en cada página. ¿Cuántas páginas llena?`
    }
  },

  // Percentages: 25% van 60 (groep 7), 15% van 60 (groep 8 and klas 1)
  {
    id: 'procent-fiets', operation: '/', emoji: '🚲', most: 1000, forms: PERCENT_FORMS, asWritten: true,
    tell: {
      nl: (a, b, name, other, form) => {
        const [percent, whole] = percentage(a, b, form);
        return `Op school zitten ${whole} kinderen. ${percent}% van hen komt op de fiets. Hoeveel kinderen komen op de fiets?`;
      },
      en: (a, b, name, other, form) => {
        const [percent, whole] = percentage(a, b, form);
        return `There are ${whole} children at school. ${percent}% of them come by bike. How many children come by bike?`;
      },
      es: (a, b, name, other, form) => {
        const [percent, whole] = percentage(a, b, form);
        return `En el colegio hay ${whole} niños. El ${percent}% viene en bici. ¿Cuántos niños vienen en bici?`;
      }
    }
  },
  {
    id: 'procent-cadeau', operation: '*', emoji: '🎁', most: 1000, forms: PERCENT_STEP_FORMS, asWritten: true,
    tell: {
      nl: (a, b, name, other, form) => {
        const [percent, whole] = percentage(a, b, form);
        return `${name} heeft €${whole} gespaard en geeft ${percent}% uit aan een cadeau. Hoeveel euro kost het cadeau?`;
      },
      en: (a, b, name, other, form) => {
        const [percent, whole] = percentage(a, b, form);
        return `${name} has saved €${whole} and spends ${percent}% of it on a present. How many euros does the present cost?`;
      },
      es: (a, b, name, other, form) => {
        const [percent, whole] = percentage(a, b, form);
        return `${name} ha ahorrado ${whole} € y gasta el ${percent}% en un regalo. ¿Cuántos euros cuesta el regalo?`;
      }
    }
  },
  {
    id: 'procent-medaille', operation: '*', emoji: '🏅', most: 1000, forms: PERCENT_STEP_FORMS, asWritten: true,
    tell: {
      nl: (a, b, name, other, form) => {
        const [percent, whole] = percentage(a, b, form);
        return `Bij de sportdag doen ${whole} kinderen mee. ${percent}% wint een medaille. Hoeveel kinderen winnen een medaille?`;
      },
      en: (a, b, name, other, form) => {
        const [percent, whole] = percentage(a, b, form);
        return `${whole} children take part in sports day. ${percent}% win a medal. How many children win a medal?`;
      },
      es: (a, b, name, other, form) => {
        const [percent, whole] = percentage(a, b, form);
        return `En la jornada deportiva participan ${whole} niños. El ${percent}% gana una medalla. ¿Cuántos niños ganan una medalla?`;
      }
    }
  },

  // Korting: 20% korting op €45, kept as 45 − 9
  {
    id: 'korting-jas', operation: '-', emoji: '🧥', most: 1000, forms: DISCOUNT_FORMS, asWritten: true,
    tell: {
      nl: (a, b, name, other, form) => `Een jas kost €${a}. In de uitverkoop krijg je ${percentOf(form as PercentForm)}% korting. ` +
        `Hoeveel euro betaal je?`,
      en: (a, b, name, other, form) => `A coat costs €${a}. In the sale you get ${percentOf(form as PercentForm)}% off. ` +
        `How many euros do you pay?`,
      es: (a, b, name, other, form) => `Un abrigo cuesta ${a} €. En las rebajas tiene un ${percentOf(form as PercentForm)}% de descuento. ` +
        `¿Cuántos euros pagas?`
    }
  },
  {
    id: 'korting-skeelers', operation: '-', emoji: '🛼', most: 1000, forms: DISCOUNT_FORMS, asWritten: true,
    tell: {
      nl: (a, b, name, other, form) => `Skeelers kosten €${a}. Ze zijn ${percentOf(form as PercentForm)}% afgeprijsd. ` +
        `Hoeveel euro kosten ze nu?`,
      en: (a, b, name, other, form) => `Inline skates cost €${a}. They are ${percentOf(form as PercentForm)}% off. ` +
        `How many euros do they cost now?`,
      es: (a, b, name, other, form) => `Unos patines cuestan ${a} €. Tienen un ${percentOf(form as PercentForm)}% de descuento. ` +
        `¿Cuántos euros cuestan ahora?`
    }
  },

  // A ratio table: 3 pakken kosten €6, 7 pakken = €?, kept as 7 × 2
  {
    id: 'verhouding-sap', operation: '*', emoji: '🧃', most: 1000, forms: RATIO_FORMS, asWritten: true,
    tell: {
      nl: (a, b, name, other, form) => {
        const packs = packsOf(form as RatioForm);
        return `${packs} pakken sap kosten samen €${packs * b}. Hoeveel euro kosten ${a} pakken?`;
      },
      en: (a, b, name, other, form) => {
        const packs = packsOf(form as RatioForm);
        return `${packs} cartons of juice cost €${packs * b} together. How many euros do ${a} cartons cost?`;
      },
      es: (a, b, name, other, form) => {
        const packs = packsOf(form as RatioForm);
        return `${packs} bricks de zumo cuestan ${packs * b} € en total. ¿Cuántos euros cuestan ${a} bricks?`;
      }
    }
  },
  {
    id: 'verhouding-schriften', operation: '*', emoji: '📓', most: 1000, forms: RATIO_FORMS, asWritten: true,
    tell: {
      nl: (a, b, name, other, form) => {
        const packs = packsOf(form as RatioForm);
        return `In de boekwinkel kosten ${packs} schriften €${packs * b}. Hoeveel euro betaal je voor ${a} schriften?`;
      },
      en: (a, b, name, other, form) => {
        const packs = packsOf(form as RatioForm);
        return `At the shop ${packs} notebooks cost €${packs * b}. How many euros do you pay for ${a} notebooks?`;
      },
      es: (a, b, name, other, form) => {
        const packs = packsOf(form as RatioForm);
        return `En la papelería, ${packs} cuadernos cuestan ${packs * b} €. ¿Cuántos euros pagas por ${a} cuadernos?`;
      }
    }
  },

  // What percentage: 18 van 72 = ?%, kept as 1800 : 72
  {
    id: 'welk-procent-toets', operation: '/', emoji: '📝', most: 100000, forms: ['welk-procent'], asWritten: true,
    fits: (a, b) => b <= 50,
    tell: {
      nl: (a, b, name) => `${name} heeft ${a / 100} van de ${b} sommen goed. Hoeveel procent is dat?`,
      en: (a, b, name) => `${name} gets ${a / 100} of the ${b} sums right. What percentage is that?`,
      es: (a, b, name) => `${name} acierta ${a / 100} de las ${b} sumas. ¿Qué porcentaje es?`
    }
  },
  {
    id: 'welk-procent-loten', operation: '/', emoji: '🎟️', most: 100000, forms: ['welk-procent'], asWritten: true,
    tell: {
      nl: (a, b) => `Bij de loterij zijn ${b} loten verkocht. Op ${a / 100} daarvan valt een prijs. Hoeveel procent van de loten wint?`,
      en: (a, b) => `${b} raffle tickets are sold. ${a / 100} of them win a prize. What percentage of the tickets win?`,
      es: (a, b) => `Se venden ${b} papeletas para la rifa. ${a / 100} tienen premio. ¿Qué porcentaje de las papeletas tiene premio?`
    }
  },

  // Scale: Schaal 1 : 500, 4 cm = ? m, kept as 4 × 5
  {
    id: 'schaal-plattegrond', operation: '*', emoji: '🗺️', most: 1000, forms: SCALE_FORMS, asWritten: true,
    tell: {
      nl: (a, b, name, other, form) => `Op de plattegrond met schaal 1 : ${scaleOf(form as ScaleForm)} is het schoolplein ${a} cm lang. ` +
        `Hoeveel meter is het echt?`,
      en: (a, b, name, other, form) => `On a map with scale 1 : ${scaleOf(form as ScaleForm)}, the playground is ${a} cm long. ` +
        `How many metres is it really?`,
      es: (a, b, name, other, form) => `En un plano a escala 1 : ${scaleOf(form as ScaleForm)}, el patio mide ${a} cm. ` +
        `¿Cuántos metros mide de verdad?`
    }
  },

  // The mean: 11, 15 en 10, kept as 36 : 3
  {
    id: 'gemiddelde-basketbal', operation: '/', emoji: '🏀', most: 1000, forms: MEAN_FORMS, asWritten: true,
    tell: {
      nl: (a, b, name) => `${name} scoort bij basketbal ${list(meanList(a, b), 'nl')} punten. Hoeveel punten is dat gemiddeld per wedstrijd?`,
      en: (a, b, name) => `${name} scores ${list(meanList(a, b), 'en')} points at basketball. How many points is that on average per game?`,
      es: (a, b, name) => `${name} marca ${list(meanList(a, b), 'es')} puntos al baloncesto. ¿Cuántos puntos son de media por partido?`
    }
  },
  {
    id: 'gemiddelde-regen', operation: '/', emoji: '🌧️', most: 1000, forms: MEAN_FORMS, asWritten: true,
    tell: {
      nl: (a, b) => `De klas meet de regen: ${list(meanList(a, b), 'nl')} millimeter. Hoeveel millimeter is dat gemiddeld per dag?`,
      en: (a, b) => `The class measures the rain: ${list(meanList(a, b), 'en')} millimetres. How many millimetres is that on average per day?`,
      es: (a, b) => `La clase mide la lluvia: ${list(meanList(a, b), 'es')} milímetros. ¿Cuántos milímetros son de media al día?`
    }
  },

  // Volume: 10 × 5 × 4 = ? cm³, kept as 50 × 4
  {
    id: 'inhoud-doos', operation: '*', emoji: '📦', most: 1000, forms: VOLUME_FORMS, asWritten: true,
    tell: {
      nl: (a, b, name, other, form) => {
        const length = lengthOf(form as VolumeForm);
        return `Een doos is ${length} cm lang, ${a / length} cm breed en ${b} cm hoog. Hoeveel cm³ past erin?`;
      },
      en: (a, b, name, other, form) => {
        const length = lengthOf(form as VolumeForm);
        return `A box is ${length} cm long, ${a / length} cm wide and ${b} cm high. How many cm³ does it hold?`;
      },
      es: (a, b, name, other, form) => {
        const length = lengthOf(form as VolumeForm);
        return `Una caja mide ${length} cm de largo, ${a / length} cm de ancho y ${b} cm de alto. ¿Cuántos cm³ caben dentro?`;
      }
    }
  },

  // Time spans: 8:35 → 10:10 = ? minuten, kept as 610 − 515
  {
    id: 'tijd-bus', operation: '-', emoji: '🚍', most: 1440, forms: ['tijdsduur'], asWritten: true,
    tell: {
      nl: (a, b) => `De bus vertrekt om ${clock(b)} en komt om ${clock(a)} aan. Hoeveel minuten duurt de reis?`,
      en: (a, b) => `The bus leaves at ${clock(b)} and arrives at ${clock(a)}. How many minutes does the journey take?`,
      es: (a, b) => `El autobús sale a las ${clock(b)} y llega a las ${clock(a)}. ¿Cuántos minutos dura el viaje?`
    }
  },
  {
    id: 'tijd-museum', operation: '-', emoji: '🏛️', most: 1440, forms: ['tijdsduur'], asWritten: true,
    tell: {
      nl: (a, b, name) => `${name} gaat om ${clock(b)} het museum in en komt er om ${clock(a)} weer uit. Hoeveel minuten was ${name} binnen?`,
      en: (a, b, name) => `${name} goes into the museum at ${clock(b)} and comes out at ${clock(a)}. How many minutes was ${name} inside?`,
      es: (a, b, name) => `${name} entra en el museo a las ${clock(b)} y sale a las ${clock(a)}. ¿Cuántos minutos ha estado dentro?`
    }
  },

  // Speed: 60 km per uur, 2,5 uur = ? km, kept as 5 × 30
  {
    id: 'snelheid-trein', operation: '*', emoji: '🚆', most: 1000, forms: ['snelheid'], asWritten: true,
    tell: {
      nl: (a, b) => `Een trein rijdt ${b * 2} km per uur. Hoeveel km rijdt de trein in ${hours(a, 'nl')} uur?`,
      en: (a, b) => `A train goes ${b * 2} km an hour. How many km does it go in ${hours(a, 'en')} hours?`,
      es: (a, b) => `Un tren va a ${b * 2} km por hora. ¿Cuántos km recorre en ${hours(a, 'es')} horas?`
    }
  },
  {
    id: 'snelheid-auto', operation: '*', emoji: '🚗', most: 1000, forms: ['snelheid'], asWritten: true,
    tell: {
      nl: (a, b) => `Op weg naar de camping rijdt de auto ${b * 2} km per uur. Hoeveel km is dat in ${hours(a, 'nl')} uur?`,
      en: (a, b) => `On the way to the campsite the car drives ${b * 2} km an hour. How many km is that in ${hours(a, 'en')} hours?`,
      es: (a, b) => `De camino al camping, el coche va a ${b * 2} km por hora. ¿Cuántos km son en ${hours(a, 'es')} horas?`
    }
  },

  // Below nought: −3° → 5° = ? graden verschil, kept as 5 + 3
  {
    id: 'temperatuur-dag', operation: '+', emoji: '🌡️', most: 100, forms: TEMPERATURE_FORMS, asWritten: true,
    tell: {
      nl: (a, b, name, other, form) => form === 'temperatuur-af'
        ? `'s Middags was het ${degrees(a)}, 's nachts ${degrees(-b)}. Hoeveel graden is het kouder geworden?`
        : `'s Nachts was het ${degrees(-b)}, 's middags ${degrees(a)}. Hoeveel graden is het warmer geworden?`,
      en: (a, b, name, other, form) => form === 'temperatuur-af'
        ? `In the afternoon it was ${degrees(a)}, at night ${degrees(-b)}. How many degrees colder did it get?`
        : `At night it was ${degrees(-b)}, in the afternoon ${degrees(a)}. How many degrees warmer did it get?`,
      es: (a, b, name, other, form) => form === 'temperatuur-af'
        ? `Por la tarde hacía ${degrees(a)} y por la noche ${degrees(-b)}. ¿Cuántos grados ha bajado la temperatura?`
        : `Por la noche hacía ${degrees(-b)} y por la tarde ${degrees(a)}. ¿Cuántos grados ha subido la temperatura?`
    }
  },
  {
    id: 'negatief-warmer', operation: '+', emoji: '☀️', most: 100, forms: ['negatief'], asWritten: true, negative: true,
    fits: (a, b) => b > 0,
    tell: {
      nl: (a, b) => `Het is ${degrees(a)}. Het wordt ${count(b, 'graad', 'graden')} warmer. Hoeveel graden is het nu?`,
      en: (a, b) => `It is ${degrees(a)}. It gets ${count(b, 'degree', 'degrees')} warmer. What is the temperature now?`,
      es: (a, b) => `Hace ${degrees(a)}. La temperatura sube ${count(b, 'grado', 'grados')}. ¿Qué temperatura hace ahora?`
    }
  },
  {
    id: 'negatief-kouder', operation: '-', emoji: '❄️', most: 100, forms: ['negatief'], asWritten: true, negative: true,
    fits: (a, b) => b > 0,
    tell: {
      nl: (a, b) => `Het is ${degrees(a)}. Het wordt ${count(b, 'graad', 'graden')} kouder. Hoeveel graden is het nu?`,
      en: (a, b) => `It is ${degrees(a)}. It gets ${count(b, 'degree', 'degrees')} colder. What is the temperature now?`,
      es: (a, b) => `Hace ${degrees(a)}. La temperatura baja ${count(b, 'grado', 'grados')}. ¿Qué temperatura hace ahora?`
    }
  },

  // Prices up and down: €80 + 15% = €?, kept as 80 + 12 (klas 2)
  {
    id: 'prijs-omhoog', operation: '+', emoji: '🎢', most: 1000, asWritten: true,
    forms: PERCENT_CHANGE_FORMS.filter(form => form.startsWith('toename-')),
    tell: {
      nl: (a, b, name, other, form) => `Een kaartje voor het pretpark kost €${a}. Volgend jaar wordt het ${lastNumberOf(form!)}% duurder. ` +
        `Hoeveel euro kost het dan?`,
      en: (a, b, name, other, form) => `A theme park ticket costs €${a}. Next year it goes up by ${lastNumberOf(form!)}%. ` +
        `How many euros will it cost then?`,
      es: (a, b, name, other, form) => `Una entrada al parque cuesta ${a} €. El año que viene sube un ${lastNumberOf(form!)}%. ` +
        `¿Cuántos euros costará?`
    }
  },
  {
    id: 'prijs-omlaag', operation: '-', emoji: '🎮', most: 1000, asWritten: true,
    forms: PERCENT_CHANGE_FORMS.filter(form => form.startsWith('afname-')),
    tell: {
      nl: (a, b, name, other, form) => `Een spelcomputer kost €${a}. De prijs gaat ${lastNumberOf(form!)}% omlaag. ` +
        `Hoeveel euro kost de spelcomputer nu?`,
      en: (a, b, name, other, form) => `A games console costs €${a}. The price goes down by ${lastNumberOf(form!)}%. ` +
        `How many euros does it cost now?`,
      es: (a, b, name, other, form) => `Una consola cuesta ${a} €. El precio baja un ${lastNumberOf(form!)}%. ` +
        `¿Cuántos euros cuesta ahora?`
    }
  },

  // Pythagoras: a = 6, b = 8 → ?, kept as 100 : 10 (klas 2)
  {
    id: 'pythagoras-veld', operation: '/', emoji: '⚽', most: 100000, forms: PYTHAGORAS_FORMS, asWritten: true,
    tell: {
      nl: (a, b, name, other, form) => {
        const [wide, long] = sidesOf(form as PythagorasForm, b);
        return `Een grasveld is ${long} m lang en ${wide} m breed. ${name} loopt schuin van hoek naar hoek. Hoeveel meter loopt ${name}?`;
      },
      en: (a, b, name, other, form) => {
        const [wide, long] = sidesOf(form as PythagorasForm, b);
        return `A field is ${long} m long and ${wide} m wide. ${name} walks straight across from corner to corner. ` +
          `How many metres does ${name} walk?`;
      },
      es: (a, b, name, other, form) => {
        const [wide, long] = sidesOf(form as PythagorasForm, b);
        return `Un campo mide ${long} m de largo y ${wide} m de ancho. ${name} lo cruza en diagonal de esquina a esquina. ` +
          `¿Cuántos metros camina?`;
      }
    }
  }
];

/** Names from a child's class, girls' and boys' alike, that read the same in all three languages. */
export const NAMES = ['Noor', 'Daan', 'Emma', 'Sam', 'Lotte', 'Milan', 'Sara', 'Yusuf', 'Julia', 'Finn', 'Lina', 'Luca'];

/** The groepen and moments that get stories: from the middle of groep 3 through klas 2 (groep 10 in groep.ts). */
export const STORY_MOMENTS: { [groep: number]: Moment[] } = {
  3: ['M', 'E'], 4: ['B', 'M', 'E'], 5: ['B', 'M', 'E'], 6: ['B', 'M', 'E'], 7: ['B', 'M', 'E'], 8: ['B', 'M', 'E'],
  9: ['B', 'M', 'E'], 10: ['B', 'M', 'E']
};

/** About one question in five is a story. */
export const STORY_SHARE = 0.2;

/** Topics a story would not suit: 400 + 300 children is not a groep 4 story. */
const NOT_TOLD = ['honderdtallen'];

/** Whether this story can tell this sum: its kind, and numbers it can hold. */
export function tells(story: Story, sum: Pick<SchoolSum, 'num1' | 'num2' | 'operation' | 'form'>): boolean {
  if (story.operation !== sum.operation || (sum.form ? !(story.forms || []).includes(sum.form) : story.forms)) {
    return false;
  }
  const answer = sum.operation === '+' ? sum.num1 + sum.num2
    : sum.operation === '-' ? sum.num1 - sum.num2
    : sum.operation === '*' ? sum.num1 * sum.num2
    : sum.operation === '%' ? sum.num1 % sum.num2
    : sum.num1 / sum.num2;
  if (Math.max(sum.num1, sum.num2, answer) > story.most || sum.num1 < (story.least || 0)
      || (answer < 0 && !story.negative) || !Number.isInteger(answer) || (story.fits && !story.fits(sum.num1, sum.num2))) {
    return false;
  }
  // A times sum told as groups has two of them at least, and two in each: "1 doosje met 7 eieren"
  // or "in elk doosje 1 ei" is no story, only the table of 1 dressed up (a measure, an area or a
  // ratio says its numbers otherwise, and keeps them)
  if (sum.operation === '*' && !story.forms && (sum.num1 < 2 || sum.num2 < 2)) {
    return false;
  }
  // The groups: the first number of a times sum, the second of a share
  const groups = sum.operation === '*' ? sum.num1 : sum.num2;
  return !(story.fewestGroups && (groups < story.fewestGroups || (sum.operation === '*' && sum.num2 < 2)));
}

/**
 * The story to tell this sum as, or null for a plain sum: for a groep and
 * moment that has stories, about one sum in five, never a story already told
 * this round (`told`, their ids).
 */
export function pickStory(sum: SchoolSum, groep: number, moment: Moment, told: string[],
                          random: Random = Math.random): StoryPick | null {
  if (!(STORY_MOMENTS[groep] || []).includes(moment) || NOT_TOLD.includes(sum.topic) || random() >= STORY_SHARE) {
    return null;
  }
  const fitting = STORIES.filter(story => tells(story, sum) && !told.includes(story.id));
  if (!fitting.length) {
    return null;
  }
  const story = fitting[Math.floor(random() * fitting.length)];
  const who = Math.floor(random() * NAMES.length);
  const other = (who + 1 + Math.floor(random() * (NAMES.length - 1))) % NAMES.length;
  return { id: story.id, who, other };
}

function storyOf(pick: StoryPick): Story | undefined {
  return STORIES.find(story => story.id === pick.id);
}

/** The story in the child's language, or '' for one this version does not know (an old saved round). */
export function storyText(pick: StoryPick, num1: number, num2: number, language: Language, form?: SumForm): string {
  const story = storyOf(pick);
  if (!story) {
    return '';
  }
  const tell = story.tell[language] || story.tell.en;
  return tell(num1, num2, NAMES[pick.who % NAMES.length], NAMES[pick.other % NAMES.length], form);
}

/** The story's picture. */
export function storyEmoji(pick: StoryPick): string {
  const story = storyOf(pick);
  return story ? story.emoji : '';
}
