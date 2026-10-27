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

/** A point on the face: the angle clockwise from the 12, at a distance from the middle of a 100-wide face. */
export function onFace(degrees: number, distance: number): { x: number; y: number } {
  const radians = degrees * Math.PI / 180;
  return { x: 50 + distance * Math.sin(radians), y: 50 - distance * Math.cos(radians) };
}
