import * as THREE from 'three';
import { NO_ITEM } from '../avatar/avatar-model';
import { part, starShape, toon } from './toon';

/**
 * THE KID HERO GROWS (Yobyn, 2026-09-27: "beginner outfit / trained outfit /
 * legend outfit with cape"). The child's own clothes stay what they chose:
 * a face, hair and a wardrobe are theirs at every stage. What the stages add
 * is hero gear worn over them, in places nothing else is worn:
 *
 * - Stage 1, beginner: their own clothes, as they chose them.
 * - Stage 2, trained: a hero belt with a star on its buckle, and wristbands.
 * - Stage 3, legend: the belt, buckle and wristbands in gold, the star
 *   shining, and a legend cape — unless the child has put something on
 *   their back themselves, which wins.
 *
 * The belt and the buckle take the place of the trousers' own; the
 * wristbands go round the forearm just above the hand, over a sleeve or a
 * bare arm, and move with it.
 */

/** Hero red, and the blue for when the top is red already. */
export const HERO_RED = '#e63946';
export const HERO_BLUE = '#2f6fed';
export const GOLD = '#f4c430';
/** The buckle's star, shining at the legend stage. */
export const STAR_LIGHT = '#fff3b0';

/** Whether this stage wears hero gear at all. */
export function wearsGear(stage: number): boolean {
  return stage >= 2;
}

/** Whether it is the legend's: gold, and a cape. */
export function isLegend(stage: number): boolean {
  return stage >= 3;
}

/** How far round the colour wheel a colour is, in degrees, and how strong. */
function hueOf(colour: string): { hue: number; saturation: number } {
  const hsl = { h: 0, s: 0, l: 0 };
  new THREE.Color(colour).getHSL(hsl);
  return { hue: hsl.h * 360, saturation: hsl.s };
}

/**
 * The hero's colour: red, unless the top is red (or orange, or pink) enough
 * that the gear would vanish into it; then blue.
 */
export function heroAccent(topColour: string): string {
  const { hue, saturation } = hueOf(topColour);
  const fromRed = Math.min(hue, 360 - hue);
  return saturation > 0.35 && fromRed < 40 ? HERO_BLUE : HERO_RED;
}

/** The belt's colour at this stage, or null for the trousers' own. */
export function beltColour(stage: number, topColour: string): string | null {
  if (!wearsGear(stage)) {
    return null;
  }
  return isLegend(stage) ? GOLD : heroAccent(topColour);
}

/** A hero belt is this much taller than the trousers' own, and hangs this much lower. */
export const BELT_HEIGHT = 0.34;
export const BELT_DROP = 0.08;

/**
 * The buckle: a round plate with a star on it, facing forward at `z`.
 * Silver at the trained stage; gold, and the star shining, at the legend's.
 */
export function heroBuckle(stage: number, topColour: string): THREE.Group {
  const legend = isLegend(stage);
  const group = new THREE.Group();
  group.name = 'hero-buckle';
  const plate = part('hero-buckle-plate', new THREE.CylinderGeometry(0.3, 0.3, 0.08, 32), toon(legend ? GOLD : '#d9dde3'), 0.02);
  plate.rotation.x = Math.PI / 2;
  group.add(plate);
  // The star, just in front of the plate: shining (unlit) at the legend's stage
  const star = new THREE.Mesh(new THREE.ShapeGeometry(starShape(0.22, 0.09), 10),
    legend ? new THREE.MeshBasicMaterial({ color: STAR_LIGHT }) : toon(heroAccent(topColour)));
  star.name = 'hero-star';
  star.position.z = 0.045;
  group.add(star);
  return group;
}

/** How far up the forearm from the wrist a wristband reaches, and where it starts. */
export const BAND_FROM = 0.06;
export const BAND_TO = 0.3;

/**
 * A wristband round the forearm near the wrist: a short tube of `radius`,
 * built along the forearm from `wrist` towards `elbow`.
 */
export function wristband(stage: number, topColour: string, wrist: THREE.Vector3, elbow: THREE.Vector3, radius: number): THREE.Mesh {
  const from = wrist.clone().lerp(elbow, BAND_FROM);
  const to = wrist.clone().lerp(elbow, BAND_TO);
  const geometry = new THREE.CylinderGeometry(radius, radius, from.distanceTo(to), 24, 1, false);
  const band = part('wristband', geometry, toon(isLegend(stage) ? GOLD : heroAccent(topColour)), 0.02);
  band.position.copy(from).lerp(to, 0.5);
  band.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
  return band;
}

/**
 * The cape a legend wears: in the hero's colour, when the child has nothing
 * on their back. Null otherwise: before the legend's stage, or when the
 * child chose something for their back themselves.
 */
export function legendCape(stage: number, back: string | undefined, topColour: string): string | null {
  const empty = !back || back === NO_ITEM;
  return isLegend(stage) && empty ? heroAccent(topColour) : null;
}
