// Applying the shift is its own module so that the import of the real test
// entry point cannot be hoisted above it. See shift-clock.ts.
import { shiftClock, SHIFT_DAYS } from './shift-clock';

shiftClock(SHIFT_DAYS);
