import { Language } from '../../services/language.service';
import { CURRICULUM, Moment, SchoolSum, TOPICS } from './groep';
import { NAMES, STORIES, STORY_MOMENTS, STORY_SHARE, pickStory, storyEmoji, storyText, tells } from './story';

/** Always the same "random", so a test can be run twice the same way. */
function seeded(seed = 7): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

const LANGUAGES: Language[] = ['nl', 'en', 'es'];

/** Every sum the groepen and moments with stories ask, a good many of each topic. */
function storySums(): SchoolSum[] {
  const random = seeded(3);
  const sums: SchoolSum[] = [];
  Object.keys(STORY_MOMENTS).map(Number).forEach(groep => {
    STORY_MOMENTS[groep].forEach(moment => {
      Object.keys(CURRICULUM[groep][moment]).forEach(topic => {
        for (let i = 0; i < 40; i++) {
          sums.push({ ...TOPICS[topic](random), topic });
        }
      });
    });
  });
  return sums;
}

function answerOf(sum: Pick<SchoolSum, 'num1' | 'num2' | 'operation'>): number {
  return sum.operation === '+' ? sum.num1 + sum.num2
    : sum.operation === '-' ? sum.num1 - sum.num2
    : sum.operation === '*' ? sum.num1 * sum.num2
    : sum.num1 / sum.num2;
}

describe('verhaaltjessommen, groep 3 and 4 (Yobyn, 2026-10-24)', () => {
  it('tells every sum it takes with exactly that sum\'s numbers, as a question, in all three languages', () => {
    const sums = storySums();
    let told = 0;
    sums.forEach(sum => STORIES.filter(story => tells(story, sum)).forEach(story => {
      told++;
      LANGUAGES.forEach(language => {
        const text = storyText({ id: story.id, who: 0, other: 1 }, sum.num1, sum.num2, language);
        const numbers = (text.match(/\d+/g) || []).map(Number);
        // Both numbers of the sum, and no other number: the answer is not given away
        expect(numbers.sort((a, b) => a - b)).toEqual([sum.num1, sum.num2].sort((a, b) => a - b));
        expect(text.trim().endsWith('?')).toBeTrue();
        expect(text).not.toContain('{');
        expect(text).not.toContain('undefined');
      });
    }));
    expect(told).toBeGreaterThan(500);
  });

  it('has stories for adding, taking away, groups of and sharing out, in every language', () => {
    ['+', '-', '*', '/'].forEach(operation => {
      expect(STORIES.filter(story => story.operation === operation).length).toBeGreaterThanOrEqual(2);
    });
    STORIES.forEach(story => LANGUAGES.forEach(language => expect(story.tell[language]).toBeDefined()));
    expect(new Set(STORIES.map(story => story.id)).size).toBe(STORIES.length);
  });

  it('says "1 vogel" and "7 vogels", as each language has them', () => {
    const one = { id: 'plus-boom', who: 0, other: 1 };
    expect(storyText(one, 1, 1, 'nl')).toContain('Er zit 1 vogel in de boom. Er komt er 1 bij.');
    expect(storyText(one, 7, 5, 'nl')).toContain('Er zitten 7 vogels in de boom. Er komen er 5 bij.');
    expect(storyText(one, 1, 3, 'en')).toContain('There is 1 bird in the tree. 3 more birds fly in.');
    expect(storyText(one, 4, 1, 'en')).toContain('There are 4 birds in the tree. 1 more bird flies in.');
    expect(storyText(one, 1, 2, 'es')).toContain('Hay 1 pájaro en el árbol. Llegan 2 pájaros más.');
    const eggs = { id: 'keer-eieren', who: 0, other: 1 };
    expect(storyText(eggs, 1, 1, 'nl')).toContain('Er staat 1 doosje op tafel. In elk doosje zit 1 ei.');
    expect(storyText(eggs, 3, 4, 'en')).toContain('There are 3 boxes on the table. Each box has 4 eggs in it.');
  });

  it('only tells a sum a story can hold: no bus of 90 children, nothing written another way, nothing in hundreds', () => {
    const bus = STORIES.find(story => story.id === 'plus-bus')!;
    expect(tells(bus, { num1: 30, num2: 15, operation: '+' })).toBeTrue();
    expect(tells(bus, { num1: 45, num2: 45, operation: '+' })).toBeFalse();
    expect(tells(bus, { num1: 3, num2: 5, operation: '-' })).toBeFalse();
    expect(tells(bus, { num1: 7, num2: 3, operation: '+', form: 'aanvullen' })).toBeFalse();
    const sweets = STORIES.find(story => story.id === 'keer-snoep')!;
    expect(tells(sweets, { num1: 1, num2: 5, operation: '*' })).toBeFalse();
    expect(tells(sweets, { num1: 3, num2: 5, operation: '*' })).toBeTrue();
    const hundreds: SchoolSum = { num1: 300, num2: 200, operation: '+', topic: 'honderdtallen' };
    expect(pickStory(hundreds, 4, 'E', [], () => 0)).toBeNull();
    storySums().forEach(sum => STORIES.filter(story => tells(story, sum)).forEach(story => {
      expect(Math.max(sum.num1, sum.num2, answerOf(sum))).toBeLessThanOrEqual(story.most);
      expect(Number.isInteger(answerOf(sum))).toBeTrue();
    }));
  });

  it('tells about one sum in five from the middle of groep 3 through groep 4, and none before or after', () => {
    const random = seeded(11);
    const share = (groep: number, moment: Moment) => {
      const topics = Object.keys(CURRICULUM[groep][moment]).filter(topic => topic !== 'honderdtallen');
      let stories = 0;
      let tellable = 0;
      for (let i = 0; i < 3000; i++) {
        const topic = topics[i % topics.length];
        const sum = { ...TOPICS[topic](random), topic };
        if (!STORIES.some(story => tells(story, sum))) {
          continue;
        }
        tellable++;
        if (pickStory(sum, groep, moment, [], random)) {
          stories++;
        }
      }
      return tellable ? stories / tellable : 0;
    };
    expect(share(3, 'B')).toBe(0);
    [[3, 'M'], [3, 'E'], [4, 'B'], [4, 'M'], [4, 'E']].forEach(([groep, moment]) => {
      const seen = share(groep as number, moment as Moment);
      expect(seen).toBeGreaterThan(STORY_SHARE - 0.05);
      expect(seen).toBeLessThan(STORY_SHARE + 0.05);
    });
    expect(share(5, 'B')).toBe(0);
  });

  it('never tells a story already told this round, and gives two different names', () => {
    const sum: SchoolSum = { num1: 7, num2: 5, operation: '+', topic: 'plus-tot-20-over' };
    const told: string[] = [];
    const always = seeded(5);
    const pickNow = () => pickStory(sum, 3, 'E', told, () => (always() * 0.19));
    for (let i = 0; i < STORIES.length; i++) {
      const story = pickNow();
      if (!story) {
        break;
      }
      expect(told).not.toContain(story.id);
      expect(story.who).not.toBe(story.other);
      expect(NAMES[story.who]).toBeDefined();
      told.push(story.id);
    }
    // every adding story told once, and then no more
    expect(told.length).toBe(STORIES.filter(story => tells(story, sum)).length);
    expect(pickNow()).toBeNull();
  });

  it('tells nothing for a story this version does not know, as from an old saved round', () => {
    expect(storyText({ id: 'gone-story', who: 0, other: 1 }, 3, 4, 'nl')).toBe('');
    expect(storyEmoji({ id: 'gone-story', who: 0, other: 1 })).toBe('');
    expect(storyEmoji({ id: 'plus-boom', who: 0, other: 1 })).toBe('🐦');
  });
});
