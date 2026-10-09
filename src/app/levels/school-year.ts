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

/**
 * The grades whose sums follow the Dutch curriculum (teaching/school/groep.ts).
 * The others are locked on the grade screen until their groep or klas is
 * built (Yobyn, 2026-10-09): until then they would get the old generic sums,
 * which asked klas 4 for 12 : 4. Raise this in the same change that builds
 * the next one; groep.spec.ts holds the two together.
 */
export const LAST_READY_GRADE = 5;

export function isGradeReady(grade: number): boolean {
  return grade >= 1 && grade <= LAST_READY_GRADE;
}
