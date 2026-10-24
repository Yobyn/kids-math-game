/**
 * Verhaaltjessommen (docs/CURRICULUM-NL.md, build order 8), first groep 3
 * and 4 (Yobyn, 2026-10-24: "the questions asked to the kids, lets expand
 * make it better"). A story of one or two short sentences a 6- or
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
import { Moment, Random, SchoolSum } from './groep';

/** "7 vogels", "1 vogel": a count with its noun. */
function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

type Tell = (a: number, b: number, name: string, other: string) => string;

interface Story {
  id: string;
  /** The sum it tells: a + b, a − b, a groups of b, a shared out in b. */
  operation: '+' | '-' | '*' | '/';
  emoji: string;
  /** The largest number it tells, of either number or the answer: no bus holds 90 children. */
  most: number;
  /** The fewest groups it can tell ("1 zakje met elk 5 snoepjes" does not read). */
  fewestGroups?: number;
  tell: { [language in Language]: Tell };
}

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
    id: 'deel-knikkers', operation: '/', emoji: '🔵', most: 100,
    tell: {
      nl: (a, b, name) => `${name} verdeelt ${a} knikkers eerlijk over ${b} kinderen. Hoeveel knikkers krijgt elk kind?`,
      en: (a, b, name) => `${name} shares ${a} marbles fairly between ${b} children. How many marbles does each child get?`,
      es: (a, b, name) => `${name} reparte ${a} canicas a partes iguales entre ${b} niños. ¿Cuántas canicas recibe cada niño?`
    }
  },
  {
    id: 'deel-appels', operation: '/', emoji: '🍎', most: 100,
    tell: {
      nl: (a, b) => `Er zijn ${a} appels. Ze gaan in ${b} schalen, in elke schaal evenveel. Hoeveel appels gaan er in elke schaal?`,
      en: (a, b) => `There are ${a} apples. They go into ${b} bowls, the same number in each. How many apples go in each bowl?`,
      es: (a, b) => `Hay ${a} manzanas. Se ponen en ${b} cuencos, las mismas en cada uno. ¿Cuántas manzanas van en cada cuenco?`
    }
  }
];

/** Names from a child's class, girls' and boys' alike, that read the same in all three languages. */
export const NAMES = ['Noor', 'Daan', 'Emma', 'Sam', 'Lotte', 'Milan', 'Sara', 'Yusuf', 'Julia', 'Finn', 'Lina', 'Luca'];

/** The groepen and moments that get stories: from the middle of groep 3, through groep 4. */
export const STORY_MOMENTS: { [groep: number]: Moment[] } = { 3: ['M', 'E'], 4: ['B', 'M', 'E'] };

/** About one question in five is a story. */
export const STORY_SHARE = 0.2;

/** Topics a story would not suit: 400 + 300 children is not a groep 4 story. */
const NOT_TOLD = ['honderdtallen'];

/** Whether this story can tell this sum: its kind, and numbers it can hold. */
export function tells(story: Story, sum: Pick<SchoolSum, 'num1' | 'num2' | 'operation' | 'form'>): boolean {
  if (sum.form || story.operation !== sum.operation) {
    return false;
  }
  const answer = sum.operation === '+' ? sum.num1 + sum.num2
    : sum.operation === '-' ? sum.num1 - sum.num2
    : sum.operation === '*' ? sum.num1 * sum.num2
    : sum.num1 / sum.num2;
  if (Math.max(sum.num1, sum.num2, answer) > story.most || answer < 0 || !Number.isInteger(answer)) {
    return false;
  }
  return !(sum.operation === '*' && story.fewestGroups && sum.num1 < story.fewestGroups);
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
export function storyText(pick: StoryPick, num1: number, num2: number, language: Language): string {
  const story = storyOf(pick);
  if (!story) {
    return '';
  }
  const tell = story.tell[language] || story.tell.en;
  return tell(num1, num2, NAMES[pick.who % NAMES.length], NAMES[pick.other % NAMES.length]);
}

/** The story's picture. */
export function storyEmoji(pick: StoryPick): string {
  const story = storyOf(pick);
  return story ? story.emoji : '';
}
