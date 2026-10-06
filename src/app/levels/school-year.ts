/**
 * What a grade is called in a Dutch school (docs/CURRICULUM-NL.md). Grade 1
 * is groep 3, the first year of formal rekenen at age 6, so grade N is groep
 * N + 2 up to groep 8; grades 7 to 10 are secondary school, klas 1 to 4. In
 * the Netherlands "groep 1" is the first year of kindergarten: calling grade
 * 1 that told a Dutch child the sums were for four-year-olds.
 */
export function dutchYear(grade: number): { word: 'Groep' | 'Klas'; number: number; subject: 'Rekenen' | 'Wiskunde' } {
  return grade <= 6
    ? { word: 'Groep', number: grade + 2, subject: 'Rekenen' }
    : { word: 'Klas', number: grade - 6, subject: 'Wiskunde' };
}
