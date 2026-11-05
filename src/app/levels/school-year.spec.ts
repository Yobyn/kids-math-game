import { dutchYear, spanishYear } from './school-year';

describe('dutchYear: what a grade is called at a Dutch school', () => {
  it('makes grade 1 groep 3, the first year of rekenen, up to grade 6 as groep 8', () => {
    expect(dutchYear(1)).toEqual({ word: 'Groep', number: 3, subject: 'Rekenen' });
    expect(dutchYear(6)).toEqual({ word: 'Groep', number: 8, subject: 'Rekenen' });
  });

  it('carries on into secondary school: grade 7 is klas 1, grade 10 klas 4, and it is wiskunde there', () => {
    expect(dutchYear(7)).toEqual({ word: 'Klas', number: 1, subject: 'Wiskunde' });
    expect(dutchYear(10)).toEqual({ word: 'Klas', number: 4, subject: 'Wiskunde' });
  });
});

describe('spanishYear: what a grade is called at a Spanish school (2026-11-05)', () => {
  it('makes grade 1 to 6 primero to sexto de Primaria, the same ages as groep 3 to 8', () => {
    expect(spanishYear(1)).toEqual({ stage: 'Primaria', number: 1 });
    expect(spanishYear(6)).toEqual({ stage: 'Primaria', number: 6 });
  });

  it('carries on into secondary school: grade 7 is 1º de ESO, grade 10 4º de ESO', () => {
    expect(spanishYear(7)).toEqual({ stage: 'ESO', number: 1 });
    expect(spanishYear(10)).toEqual({ stage: 'ESO', number: 4 });
  });
});
