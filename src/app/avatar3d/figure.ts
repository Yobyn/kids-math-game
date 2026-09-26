/**
 * The character's figure: where everything is, for each body type, as
 * numbers a test can hold to. Nothing here imports three.js.
 *
 * THE BOY IS MEASURED FROM YOBYN'S REFERENCE (2026-09-25): a teenage game
 * character standing in an A-pose, about 7.4 heads tall. The way this was
 * done follows img2threejs (https://github.com/img2threejs/img2threejs): read
 * the reference, write down a proportion table in head heights BEFORE any
 * geometry, build in passes, and compare each pass against the reference
 * from several sides. Its landmarks, read off the reference in head heights
 * (HH, crown to chin) from the floor:
 *
 *   sole 0 · ankle 0.6 · knee 2.0 · crotch 3.45 · belt 3.95 · hoodie hem 4.05
 *   · armpit 5.2 · shoulder 5.95 · chin 6.3 · crown 7.3
 *
 * and widths: shoulders 2.2 HH over the arms, chest 1.5, waist 1.15, hips
 * 1.3, head 0.8. The girl has no reference yet; she is the same method with
 * the usual differences in proportion (narrower shoulders, a narrower waist,
 * wider hips, a slightly shorter figure and a softer, narrower head) until
 * Yobyn sends one.
 *
 * Units: the head's surface (head-surface.ts) is 2 tall, so ONE HEAD HEIGHT
 * IS 2 UNITS, and a width in HH is a half-width in units.
 */

import { BodyType } from '../avatar/avatar-model';
import { Vec3 } from './head-surface';

export { BodyType };

/** A radius (a half-width, in units) at a height (units from the floor). */
export type Profile = [number, number][];

export interface Figure {
  /** How the head, and everything built on it, is shaped: narrower than tall, less deep than wide. */
  headScale: Vec3;
  /** The head's centre, units from the floor. */
  headY: number;
  /** The torso's outline from crotch to collar, as [half-width, height]. */
  torso: Profile;
  /** How deep the torso is for its width. */
  torsoDepth: number;
  /** Where the top ends and the trousers begin. */
  hem: number;
  belt: number;
  crotch: number;
  /** Hip joint, knee and ankle, as [x, y] for the character's left leg (mirrored for the right). */
  hip: [number, number];
  knee: [number, number];
  ankle: [number, number];
  /** Leg radii at the hip, knee and hem of the trousers. */
  legRadii: [number, number, number];
  /** The shoulder joint, as [x, y]. */
  shoulder: [number, number];
  /** Upper arm and forearm lengths. */
  upperArm: number;
  forearm: number;
  /** Arm radii at the shoulder, elbow and wrist. */
  armRadii: [number, number, number];
  /** How far the arms hang out from the body, in radians from straight down. */
  armSwing: number;
  /** How far the forearms bend forward at the elbow at rest, in radians: 0 is a straight arm. */
  elbowBend: number;
  handLength: number;
  neckRadius: number;
  /** A shoe's length and width. */
  foot: [number, number];
}

export const HH = 2;

const BOY: Figure = {
  headScale: [0.8, 1, 0.9],
  headY: 6.78 * HH,
  torso: [
    [0.35, 3.3 * HH], [1.1, 3.45 * HH], [1.3, 3.7 * HH], [1.18, 3.95 * HH], [1.2, 4.3 * HH],
    [1.44, 4.75 * HH], [1.6, 5.2 * HH], [1.62, 5.55 * HH], [1.5, 5.8 * HH], [1.08, 5.97 * HH],
    [0.55, 6.05 * HH], [0.42, 6.1 * HH]
  ],
  torsoDepth: 0.68,
  hem: 4.05 * HH,
  belt: 3.95 * HH,
  crotch: 3.45 * HH,
  hip: [0.62, 3.5 * HH],
  knee: [0.6, 2 * HH],
  ankle: [0.62, 0.55 * HH],
  legRadii: [0.7, 0.52, 0.5],
  shoulder: [1.8, 5.72 * HH],
  upperArm: 1.3 * HH,
  forearm: 1.15 * HH,
  armRadii: [0.5, 0.42, 0.33],
  armSwing: 0.3,
  elbowBend: 0,
  handLength: 0.55 * HH,
  neckRadius: 0.44,
  foot: [0.95 * HH, 0.47 * HH]
};

const GIRL: Figure = {
  headScale: [0.78, 0.98, 0.88],
  headY: 6.55 * HH,
  torso: [
    [0.35, 3.25 * HH], [1.15, 3.4 * HH], [1.38, 3.65 * HH], [1.02, 3.95 * HH], [1.02, 4.25 * HH],
    [1.2, 4.7 * HH], [1.3, 5.05 * HH], [1.3, 5.35 * HH], [1.2, 5.6 * HH], [0.9, 5.75 * HH],
    [0.5, 5.83 * HH], [0.38, 5.88 * HH]
  ],
  torsoDepth: 0.64,
  hem: 3.95 * HH,
  belt: 3.87 * HH,
  crotch: 3.4 * HH,
  hip: [0.66, 3.45 * HH],
  knee: [0.56, 1.95 * HH],
  ankle: [0.56, 0.55 * HH],
  legRadii: [0.64, 0.46, 0.44],
  shoulder: [1.55, 5.5 * HH],
  upperArm: 1.25 * HH,
  forearm: 1.1 * HH,
  armRadii: [0.42, 0.35, 0.28],
  armSwing: 0.3,
  elbowBend: 0,
  handLength: 0.5 * HH,
  neckRadius: 0.38,
  foot: [0.86 * HH, 0.42 * HH]
};

/** The figures as measured: the boy from Yobyn's reference, the girl to match. */
export const MEASURED: { [type in BodyType]: Figure } = { boy: BOY, girl: GIRL };

/**
 * HOW STYLISED THE CHARACTER IS (Yobyn, 2026-09-26). What we had first was
 * chibi, about two and a half heads tall, all head and eyes; the reference
 * measured as it is is over seven. Yobyn asked for "in between", then, with
 * that on screen, for it "smaller again like the original look more": so
 * the character is about three and a third heads, nearer the chibi than the
 * reference, on a shorter, sturdier body, standing relaxed rather than in
 * the reference's A-pose.
 *
 * The measured figure stays the truth; the stylised one is made from it by
 * a few numbers, so the look can be moved along the line without anything
 * being re-fitted. Everything on the head (hair, hats, glasses) shares the
 * head's transform, so it grows with it and fits by construction.
 */
export interface Style {
  /** How much bigger the head is than measured. */
  head: number;
  /** How much shorter everything below the chin is. */
  body: number;
  /** How much sturdier: widths and limb thickness. */
  build: number;
  /**
   * How the character stands. The reference is an A-pose, arms held out
   * straight, which is how a model is measured and not how anyone stands;
   * a relaxed stance brings the arms in and softens the elbows.
   */
  armSwing?: number;
  elbowBend?: number;
}

export const STYLE: Style = { head: 1.8, body: 0.66, build: 1.15, armSwing: 0.24, elbowBend: 0.35 };

/** A measured figure made into the stylised one (see STYLE). */
export function stylise(measured: Figure, style: Style): Figure {
  const y = (v: number) => v * style.body;
  const w = (v: number) => v * style.build;
  const point = ([x, h]: [number, number]): [number, number] => [w(x), y(h)];
  const headScale = measured.headScale.map(v => v * style.head) as Vec3;
  // The chin stays on the collar: it comes down with the body, and the head
  // grows up from it
  const chin = y(chinY(measured));
  const stylised: Figure = {
    ...measured,
    headScale,
    headY: chin + headScale[1],
    torso: measured.torso.map(([r, h]) => [w(r), y(h)] as [number, number]),
    hem: y(measured.hem),
    belt: y(measured.belt),
    crotch: y(measured.crotch),
    hip: point(measured.hip),
    knee: point(measured.knee),
    ankle: point(measured.ankle),
    legRadii: measured.legRadii.map(w) as [number, number, number],
    // The arms thicken outwards, not into the chest: the shoulder moves out
    // by as much as the arm grew
    shoulder: [w(measured.shoulder[0]) + (style.build - 1) * measured.armRadii[0], y(measured.shoulder[1])],
    upperArm: y(measured.upperArm),
    forearm: y(measured.forearm),
    armRadii: measured.armRadii.map(w) as [number, number, number],
    handLength: y(measured.handLength) * style.build,
    armSwing: style.armSwing ?? measured.armSwing,
    elbowBend: style.elbowBend ?? measured.elbowBend,
    neckRadius: w(measured.neckRadius) * Math.sqrt(style.head),
    foot: [measured.foot[0] * style.build, w(measured.foot[1])]
  };
  return clearOfChest(stylised);
}

/**
 * How far an arm's inside edge may reach past the torso's outline (where
 * the sleeve brushes the side), and how clear the stylised arm is kept.
 */
export const ARM_TOUCH = 0.1;
const ARM_CLEARANCE = 0.05;

/**
 * The figure with its shoulders moved out, if they must be, so that each arm
 * hangs clear of the chest all the way down: from a third of the way down
 * the upper arm (above that it joins the shoulder) to the wrist. A short,
 * sturdy body puts the widest chest right under the arm, so the stylised
 * figure may need this; the measured one does not, and comes back as it is.
 */
export function clearOfChest(figure: Figure): Figure {
  let need = 0;
  const elbow = hang(figure.shoulder, figure.upperArm, figure.armSwing, 1);
  const [wx, wy] = wrist(figure);
  const [rShoulder, rElbow, rWrist] = figure.armRadii;
  for (let t = 0.3; t <= 2; t += 0.05) {
    const upper = t <= 1;
    const k = upper ? t : t - 1;
    const x = upper ? figure.shoulder[0] + (elbow[0] - figure.shoulder[0]) * k : elbow[0] + (wx - elbow[0]) * k;
    const y = upper ? figure.shoulder[1] + (elbow[1] - figure.shoulder[1]) * k : elbow[1] + (wy - elbow[1]) * k;
    const r = upper ? rShoulder + (rElbow - rShoulder) * k : rElbow + (rWrist - rElbow) * k;
    need = Math.max(need, torsoRadius(figure, y) - ARM_TOUCH + ARM_CLEARANCE - (x - r));
  }
  return need > ARM_CLEARANCE ? { ...figure, shoulder: [figure.shoulder[0] + need, figure.shoulder[1]] } : figure;
}

/** The figures the character is drawn in: the measured ones, stylised. */
export const FIGURES: { [type in BodyType]: Figure } = {
  boy: stylise(BOY, STYLE),
  girl: stylise(GIRL, STYLE)
};

export function figureFor(type: BodyType | undefined): Figure {
  return FIGURES[type as BodyType] || FIGURES.boy;
}

/** The torso's half-width at a height (straight between the profile's points), or 0 outside it. */
export function torsoRadius(figure: Figure, y: number): number {
  const p = figure.torso;
  if (y < p[0][1] || y > p[p.length - 1][1]) {
    return 0;
  }
  for (let i = 1; i < p.length; i++) {
    if (y <= p[i][1]) {
      const t = (y - p[i - 1][1]) / (p[i][1] - p[i - 1][1] || 1);
      return p[i - 1][0] + (p[i][0] - p[i - 1][0]) * t;
    }
  }
  return p[p.length - 1][0];
}

/** Where the chin is: the bottom of the scaled head. */
export function chinY(figure: Figure): number {
  return figure.headY - figure.headScale[1];
}

/** The top of the head, before any hair. */
export function crownY(figure: Figure): number {
  return figure.headY + figure.headScale[1];
}

/** Head heights tall, sole to crown. */
export function headsTall(figure: Figure): number {
  return crownY(figure) / (2 * figure.headScale[1]);
}

/** A point `length` along from `from`, hanging at `angle` from straight down, out to the side `side`. */
export function hang(from: [number, number], length: number, angle: number, side: number): [number, number] {
  return [from[0] + side * Math.sin(angle) * length, from[1] - Math.cos(angle) * length];
}

/** The wrist of the character's left arm (mirror x for the right). */
export function wrist(figure: Figure): [number, number] {
  const elbow = hang(figure.shoulder, figure.upperArm, figure.armSwing, 1);
  return hang(elbow, figure.forearm, figure.armSwing * 0.8, 1);
}
