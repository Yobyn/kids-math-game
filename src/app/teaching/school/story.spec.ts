import { Language } from '../../services/language.service';
import { CURRICULUM, Moment, SchoolSum, TOPICS } from './groep';
import { NAMES, STORIES, STORY_MOMENTS, STORY_SHARE, pickStory, storyEmoji, storyText, tells } from './story';
import { FormWords, sumLayout } from './written-form';

/** Every word a written form puts round its numbers: none has a figure in it, so only the sum's numbers are left. */
const WORDS: FormWords = {
  double: 'dubbel', half: 'de helft van', of: 'van', remainder: 'rest', hours: 'uur', minutes: 'minuten', toTens: 'tientallen',
  toHundreds: 'honderdtallen', area: 'Oppervlakte', point: ',', toThousands: 'duizendtallen', packs: 'pakken', cost: 'kosten',
  discount: 'korting', scale: 'Schaal', mean: 'gemiddelde', minutesBetween: 'minuten', degreesBetween: 'graden', perHour: 'per uur',
  volume: 'Inhoud', toOneDecimal: 'decimaal', hypotenuse: 'schuine zijde', triangleArea: 'driehoek', largestX: 'grootste x',
  totalFactor: 'groeifactor'
};

/** The figures in a text, in order: "8:35" is 8 and 35, "−3°" is 3, "2,5" is 2 and 5. */
const figures = (text: string) => (text.match(/\d+/g) || []).map(Number).sort((a, b) => a - b);

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
    : sum.operation === '%' ? sum.num1 % sum.num2
    : sum.num1 / sum.num2;
}

describe('verhaaltjessommen, groep 3 to klas 2 (Yobyn, 2026-10-24)', () => {
  it('tells every sum it takes with exactly that sum\'s numbers, as a question, in all three languages', () => {
    const sums = storySums();
    let told = 0;
    sums.forEach(sum => STORIES.filter(story => tells(story, sum)).forEach(story => {
      told++;
      LANGUAGES.forEach(language => {
        const text = storyText({ id: story.id, who: 0, other: 1 }, sum.num1, sum.num2, language, sum.form);
        // Both numbers of the sum, and no other number: the answer is not given away. A
        // measure or a part says only the first: 100 cm in a metre is what is asked. A
        // story told as written says what its form shows the child: 20% korting op €45
        const shown = sumLayout({ num1: sum.num1, num2: sum.num2, sign: '+', form: sum.form }, WORDS);
        const said = story.asWritten ? figures([...shown.before, ...shown.after].map(part => part.text).join(' '))
          : figures((story.onlyFirst ? [sum.num1] : [sum.num1, sum.num2]).map(Math.abs).join(' '));
        expect(figures(text)).withContext(`${story.id} ${language}: ${text}`).toEqual(said);
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

  it('tells about one sum in five from the middle of groep 3 through klas 2, and none before or after', () => {
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
    [[3, 'M'], [3, 'E'], [4, 'B'], [4, 'M'], [4, 'E'], [5, 'B'], [5, 'M'], [5, 'E'], [6, 'B'], [6, 'M'], [6, 'E'],
     [7, 'B'], [7, 'M'], [7, 'E'], [8, 'B'], [8, 'M'], [8, 'E'], [9, 'B'], [9, 'M'], [10, 'M'], [10, 'E']]
      .forEach(([groep, moment]) => {
      const seen = share(groep as number, moment as Moment);
      expect(seen).toBeGreaterThan(STORY_SHARE - 0.05);
      expect(seen).toBeLessThan(STORY_SHARE + 0.05);
    });
    // Klas 1's end is brackets, the order of operations and fractions: nothing a story tells
    expect(share(9, 'E')).toBe(0);
    expect(share(11, 'B')).toBe(0);
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

  it('tells what groep 5 and 6 learn: tables, bigger sums, a remainder, euros, measures, a part and area', () => {
    // Not stories: a double, a half, rounding, tenths and fractions as such are written sums
    const notStories = ['honderdtallen', 'dubbel-van-tot-100', 'helft-van-tot-100', 'afronden', 'tienden', 'breuk-van',
      'gelijke-breuken'];
    const random = seeded(17);
    [5, 6].forEach(groep => (['B', 'M', 'E'] as Moment[]).forEach(moment => {
      Object.keys(CURRICULUM[groep][moment]).filter(topic => !notStories.includes(topic)).forEach(topic => {
        let told = 0;
        for (let i = 0; i < 60; i++) {
          const sum = { ...TOPICS[topic](random), topic };
          told += STORIES.some(story => tells(story, sum)) ? 1 : 0;
        }
        expect(told).withContext(`groep ${groep}${moment} ${topic}`).toBeGreaterThan(0);
      });
    }));
    ['rest', 'deel', 'oppervlakte', 'm-cm', 'km-m', 'kg-g', 'uur-min'].forEach(form => {
      expect(STORIES.some(story => (story.forms || []).includes(form as any))).withContext(form).toBeTrue();
    });
  });

  it('asks what is left over, the measure in the smaller unit, and the part as a word', () => {
    const pick = (id: string) => ({ id, who: 0, other: 1 });
    expect(storyText(pick('rest-snoep'), 23, 4, 'nl'))
      .toBe('Noor verdeelt 23 snoepjes eerlijk over 4 vrienden. Iedereen krijgt evenveel. Hoeveel snoepjes blijven er over?');
    expect(storyText(pick('maat-touw'), 3, 100, 'nl')).toBe('Het springtouw van Noor is 3 meter lang. Hoeveel centimeter is dat?');
    expect(storyText(pick('deel-hond'), 20, 4, 'nl')).toContain('Een kwart van hen heeft een hond.');
    expect(storyText(pick('deel-hond'), 15, 3, 'en')).toContain('A third of them have a dog.');
    expect(storyText(pick('deel-boek'), 20, 5, 'es')).toContain('gasta la quinta parte en un libro');
    expect(storyText(pick('opp-moestuin'), 8, 5, 'nl')).toContain('8 meter lang en 5 meter breed');
  });

  it('never tells a share over 1, a bag of 1, a bike for €7 or a remainder as a plain share', () => {
    const story = (id: string) => STORIES.find(each => each.id === id)!;
    // "verdeelt 7 knikkers eerlijk over 1 kinderen" (the 1 table, groep 4 and 5)
    expect(tells(story('deel-knikkers'), { num1: 7, num2: 1, operation: '/' })).toBeFalse();
    expect(tells(story('deel-knikkers'), { num1: 14, num2: 2, operation: '/' })).toBeTrue();
    expect(tells(story('min-fiets'), { num1: 7, num2: 3, operation: '-' })).toBeFalse();
    expect(tells(story('min-fiets'), { num1: 345, num2: 180, operation: '-' })).toBeTrue();
    expect(tells(story('rest-snoep'), { num1: 23, num2: 4, operation: '%' })).toBeFalse();
    expect(tells(story('rest-snoep'), { num1: 23, num2: 4, operation: '%', form: 'rest' })).toBeTrue();
    expect(tells(story('maat-touw'), { num1: 3, num2: 1000, operation: '*', form: 'km-m' })).toBeFalse();
    expect(tells(story('keer-stoelen'), { num1: 23, num2: 14, operation: '*' })).toBeTrue();
    // "8 zakjes met elk 1 snoepje" (the 1 table)
    expect(tells(story('keer-snoep'), { num1: 8, num2: 1, operation: '*' })).toBeFalse();
  });

  it('tells what groep 7 to klas 2 learn: big sums, percentages, discounts, ratios, scale, the mean, time, speed, below nought', () => {
    const told = ['cijferend-keer', 'staartdeling', 'procenten', 'korting', 'verhoudingen', 'procent-van', 'welk-procent', 'schaal',
      'gemiddelde', 'inhoud', 'tijdsduur', 'snelheid', 'temperatuur', 'negatief-plus-min', 'procent-erbij-eraf', 'pythagoras'];
    const random = seeded(23);
    told.forEach(topic => {
      let tellable = 0;
      for (let i = 0; i < 60; i++) {
        const sum = { ...TOPICS[topic](random), topic };
        tellable += STORIES.some(story => tells(story, sum)) ? 1 : 0;
      }
      expect(tellable).withContext(topic).toBeGreaterThan(0);
    });
  });

  it('tells a discount, a ratio, a time span, speed and a temperature as the workbook writes them', () => {
    const pick = (id: string) => ({ id, who: 0, other: 1 });
    expect(storyText(pick('korting-jas'), 45, 9, 'nl', 'korting-20'))
      .toBe('Een jas kost €45. In de uitverkoop krijg je 20% korting. Hoeveel euro betaal je?');
    expect(storyText(pick('verhouding-sap'), 7, 2, 'nl', 'verhouding-3'))
      .toBe('3 pakken sap kosten samen €6. Hoeveel euro kosten 7 pakken?');
    expect(storyText(pick('tijd-bus'), 610, 515, 'nl', 'tijdsduur'))
      .toBe('De bus vertrekt om 8:35 en komt om 10:10 aan. Hoeveel minuten duurt de reis?');
    expect(storyText(pick('snelheid-trein'), 5, 30, 'nl', 'snelheid')).toContain('60 km per uur');
    expect(storyText(pick('snelheid-trein'), 5, 30, 'nl', 'snelheid')).toContain('2,5 uur');
    expect(storyText(pick('snelheid-trein'), 5, 30, 'en', 'snelheid')).toContain('2.5 hours');
    expect(storyText(pick('temperatuur-dag'), 5, 3, 'nl', 'temperatuur-op')).toContain("'s Nachts was het \u22123°, 's middags 5°.");
    expect(storyText(pick('negatief-kouder'), 4, 9, 'es', 'negatief')).toBe('Hace 4°. La temperatura baja 9 grados. ¿Qué temperatura hace ahora?');
    expect(storyText(pick('gemiddelde-basketbal'), 36, 3, 'en', 'gemiddelde-3')).toMatch(/scores \d+, \d+ and \d+ points/);
    expect(storyText(pick('procent-medaille'), 6, 3, 'nl', 'procent-via-5')).toContain('Bij de sportdag doen 120 kinderen mee. 15% wint');
  });

  it('lets only a temperature come out below nought, and only when the degrees go one way', () => {
    const story = (id: string) => STORIES.find(each => each.id === id)!;
    expect(tells(story('negatief-kouder'), { num1: 4, num2: 9, operation: '-', form: 'negatief' })).toBeTrue();
    // "it gets −5 degrees colder" does not read
    expect(tells(story('negatief-kouder'), { num1: 4, num2: -5, operation: '-', form: 'negatief' })).toBeFalse();
    expect(tells(story('min-fiets'), { num1: 100, num2: 180, operation: '-' })).toBeFalse();
    expect(tells(story('welk-procent-toets'), { num1: 1800, num2: 72, operation: '/', form: 'welk-procent' })).toBeFalse();
    expect(tells(story('welk-procent-toets'), { num1: 1800, num2: 20, operation: '/', form: 'welk-procent' })).toBeTrue();
  });
});
