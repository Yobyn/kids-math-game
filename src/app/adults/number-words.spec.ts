import { MAX_SPELLED, spellNumber } from './number-words';
import { Language, SUPPORTED_LANGUAGES } from '../services/language.service';

describe('numbers written out in English', () => {
  it('writes the ones and the teens', () => {
    expect(spellNumber(0, 'en')).toBe('zero');
    expect(spellNumber(7, 'en')).toBe('seven');
    expect(spellNumber(13, 'en')).toBe('thirteen');
    expect(spellNumber(19, 'en')).toBe('nineteen');
  });

  it('hyphenates the compound tens', () => {
    expect(spellNumber(20, 'en')).toBe('twenty');
    expect(spellNumber(42, 'en')).toBe('forty-two');
    expect(spellNumber(99, 'en')).toBe('ninety-nine');
  });

  it('puts "and" after the hundreds, the way it is read aloud', () => {
    expect(spellNumber(100, 'en')).toBe('one hundred');
    expect(spellNumber(306, 'en')).toBe('three hundred and six');
    expect(spellNumber(342, 'en')).toBe('three hundred and forty-two');
  });

  it('writes the thousands', () => {
    expect(spellNumber(1000, 'en')).toBe('one thousand');
    expect(spellNumber(4206, 'en')).toBe('four thousand two hundred and six');
    expect(spellNumber(9999, 'en')).toBe('nine thousand nine hundred and ninety-nine');
  });

  it('says "and" straight after the thousands when there are no hundreds', () => {
    expect(spellNumber(4006, 'en')).toBe('four thousand and six');
    expect(spellNumber(4060, 'en')).toBe('four thousand and sixty');
  });
});

describe('numbers written out in Dutch', () => {
  it('writes the ones and the teens', () => {
    expect(spellNumber(0, 'nl')).toBe('nul');
    expect(spellNumber(8, 'nl')).toBe('acht');
    expect(spellNumber(14, 'nl')).toBe('veertien');
  });

  it('says the unit before the ten, joined with "en"', () => {
    expect(spellNumber(21, 'nl')).toBe('eenentwintig');
    expect(spellNumber(45, 'nl')).toBe('vijfenveertig');
  });

  it('puts a trema on a unit that would otherwise run into the "en"', () => {
    // The seam has to read as two syllables: twee-en-twintig
    expect(spellNumber(22, 'nl')).toBe('tweeëntwintig');
    expect(spellNumber(23, 'nl')).toBe('drieëntwintig');
    expect(spellNumber(42, 'nl')).toBe('tweeënveertig');
  });

  it('leaves the trema off a unit that does not need one', () => {
    expect(spellNumber(24, 'nl')).toBe('vierentwintig');
    expect(spellNumber(26, 'nl')).toBe('zesentwintig');
  });

  it('drops the "een" from a bare hundred and a bare thousand', () => {
    expect(spellNumber(100, 'nl')).toBe('honderd');
    expect(spellNumber(1000, 'nl')).toBe('duizend');
    expect(spellNumber(200, 'nl')).toBe('tweehonderd');
  });

  it('runs the hundreds together and spaces the thousands', () => {
    expect(spellNumber(342, 'nl')).toBe('driehonderdtweeënveertig');
    expect(spellNumber(4206, 'nl')).toBe('vierduizend tweehonderdzes');
  });
});

describe('numbers written out in Spanish', () => {
  it('writes the ones and the teens', () => {
    expect(spellNumber(0, 'es')).toBe('cero');
    expect(spellNumber(9, 'es')).toBe('nueve');
    expect(spellNumber(15, 'es')).toBe('quince');
    expect(spellNumber(16, 'es')).toBe('dieciséis');
  });

  it('writes the twenties as one word', () => {
    expect(spellNumber(20, 'es')).toBe('veinte');
    expect(spellNumber(22, 'es')).toBe('veintidós');
    expect(spellNumber(29, 'es')).toBe('veintinueve');
  });

  it('joins the tens above thirty with "y"', () => {
    expect(spellNumber(30, 'es')).toBe('treinta');
    expect(spellNumber(42, 'es')).toBe('cuarenta y dos');
  });

  it('knows "cien" from "ciento", and the irregular hundreds', () => {
    expect(spellNumber(100, 'es')).toBe('cien');
    expect(spellNumber(101, 'es')).toBe('ciento uno');
    expect(spellNumber(500, 'es')).toBe('quinientos');
    expect(spellNumber(700, 'es')).toBe('setecientos');
    expect(spellNumber(900, 'es')).toBe('novecientos');
  });

  it('writes the thousands, with a bare "mil" for one', () => {
    expect(spellNumber(1000, 'es')).toBe('mil');
    expect(spellNumber(4206, 'es')).toBe('cuatro mil doscientos seis');
  });
});

describe('every number in range, in every language', () => {
  // Sweeps rather than remembered examples: a gate that renders one number
  // wrong is a door an adult cannot open.
  SUPPORTED_LANGUAGES.forEach((language: Language) => {
    it(`writes something for every number from 0 to ${MAX_SPELLED} in ${language}`, () => {
      for (let value = 0; value <= MAX_SPELLED; value++) {
        const words = spellNumber(value, language);
        expect(words.length).toBeGreaterThan(0);
        // Nothing half-built: no stray separators and no empty joins
        expect(words).not.toContain('undefined');
        expect(words).not.toContain('  ');
        expect(words.trim()).toBe(words);
      }
    });

    it(`gives every number its own spelling in ${language}`, () => {
      // Two numbers reading the same would make the gate ambiguous
      const seen = new Set<string>();
      for (let value = 0; value <= MAX_SPELLED; value++) {
        seen.add(spellNumber(value, language));
      }
      expect(seen.size).toBe(MAX_SPELLED + 1);
    });

    it(`never writes a digit in ${language}`, () => {
      // The whole point is that it has to be read, not copied
      for (let value = 0; value <= MAX_SPELLED; value += 7) {
        expect(spellNumber(value, language)).not.toMatch(/[0-9]/);
      }
    });
  });
});

describe('numbers it will not write', () => {
  it('returns nothing rather than throwing, out of range', () => {
    expect(spellNumber(-1, 'en')).toBe('');
    expect(spellNumber(MAX_SPELLED + 1, 'en')).toBe('');
    expect(spellNumber(1.5, 'en')).toBe('');
    expect(spellNumber(NaN, 'en')).toBe('');
  });
});
