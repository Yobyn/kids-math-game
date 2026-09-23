// A second entry point for the same suite, run with the clock moved forward.
// See src/testing/shift-clock.ts for why, and `npm run test:future`.
//
// The import order is the point: the clock has to be moved before the specs
// are loaded, so this module must come first and must not be merged into
// test.ts, whose own imports would otherwise be hoisted above the shift.
import './testing/shift-clock-apply';
import './test';
