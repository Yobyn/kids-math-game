/**
 * Klokkijken (groep 3 to 5): where the hands of an analogue clock stand for
 * a time. The geometry lives here, apart from the drawing, so it can be held
 * to what a child reads off a real clock (clock-face.spec.ts).
 */

/** The hands in degrees, clockwise from the 12. */
export interface Hands {
  hour: number;
  minute: number;
}

/**
 * The minute hand moves 6° a minute. The hour hand moves 30° an hour and
 * creeps on between them, as a real one does: at 3:30 it stands halfway
 * between the 3 and the 4, which is how a child tells "half 4" from "half 3".
 */
export function handsAt(hours: number, minutes: number): Hands {
  return { hour: (hours % 12) * 30 + minutes / 2, minute: minutes * 6 };
}

/**
 * Zetten: a finger on the face as a time (2026-11-25). The angle of a point on a 100-wide face,
 * clockwise from the 12, 0 to 360.
 */
export function angleAt(x: number, y: number): number {
  const degrees = Math.atan2(x - 50, 50 - y) * 180 / Math.PI;
  return (degrees + 360) % 360;
}

/** The long hand pointing at an angle, as minutes, snapped to `step` (5 or 1): 270° is 45. */
export function minutesAt(degrees: number, step: number): number {
  return (Math.round(degrees / 6 / step) * step) % 60;
}

/**
 * The short hand pointing at an angle, as the hour it stands for, 1 to 12. It creeps on with the
 * minutes, as handsAt draws it, so at 45 minutes past, a hand nearly on the 4 is still 3 o'clock.
 */
export function hoursAt(degrees: number, minutes: number): number {
  return ((Math.round((degrees - minutes / 2) / 30) % 12) + 12) % 12 || 12;
}

/** Which hand a finger at an angle takes: the nearer, the long one when they are as near. */
export function nearerHand(degrees: number, hours: number, minutes: number): 'hour' | 'minute' {
  const apart = (a: number, b: number) => Math.min(Math.abs(a - b) % 360, 360 - Math.abs(a - b) % 360);
  const hands = handsAt(hours, minutes);
  return apart(degrees, hands.hour) + 10 < apart(degrees, hands.minute) ? 'hour' : 'minute';
}

/** A point on the face: the angle clockwise from the 12, at a distance from the middle of a 100-wide face. */
export function onFace(degrees: number, distance: number): { x: number; y: number } {
  const radians = degrees * Math.PI / 180;
  return { x: 50 + distance * Math.sin(radians), y: 50 - distance * Math.cos(radians) };
}
