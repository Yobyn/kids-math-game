import { dutchYear } from './school-year';

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
