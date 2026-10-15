import { FloatUp, floatAt } from './game-feel';
import { BACKDROP_ALPHA, Cloud, courtLines, hillLine } from './backdrops';

/** Drawing helpers the bonus games share (bonus, jump and balloons components). */

export function rgb({ r, g, b }: { r: number; g: number; b: number }): string {
  return `rgb(${r}, ${g}, ${b})`;
}

export function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** The "+1"s floating up where points were scored (game-feel.ts), in white with the field's glow. */
export function drawFloats(context: CanvasRenderingContext2D, floats: FloatUp[], calm: boolean, glow: string) {
  if (!floats.length) {
    return;
  }
  context.save();
  context.font = 'bold 22px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.shadowColor = glow;
  context.shadowBlur = 10;
  floats.forEach(float => {
    const { x, y, alpha } = floatAt(float, calm);
    context.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
    context.fillText(float.text, x, y);
  });
  context.restore();
}

/** The shine all three games' balls share: a soft white catch of light on the top left. */
export function drawShine(context: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  context.save();
  context.shadowBlur = 0;
  context.fillStyle = 'rgba(255, 255, 255, 0.6)';
  context.beginPath();
  context.ellipse(x - radius * 0.35, y - radius * 0.38, radius * 0.28, radius * 0.18, -0.6, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

/** Springbal's far-off hills: two faint rows, the far one paler (backdrops.ts). */
export function drawHills(context: CanvasRenderingContext2D, width: number, ground: number, travelled: number, colour: string) {
  context.save();
  [0, 1].forEach(layer => {
    const line = hillLine(width, ground, travelled, layer);
    context.globalAlpha = BACKDROP_ALPHA * (layer === 0 ? 0.7 : 1.2);
    context.fillStyle = colour;
    context.beginPath();
    context.moveTo(0, ground);
    line.forEach(point => context.lineTo(point.x, point.y));
    context.lineTo(width, ground);
    context.closePath();
    context.fill();
  });
  context.restore();
}

/** Balspel's court, marked out faintly under the play. */
export function drawCourt(context: CanvasRenderingContext2D, width: number, height: number, colour: string) {
  const { inset, middle, circle } = courtLines(width, height);
  context.save();
  context.globalAlpha = BACKDROP_ALPHA * 1.5;
  context.strokeStyle = colour;
  context.lineWidth = 2;
  roundRect(context, inset, inset, width - inset * 2, height - inset * 2, 10);
  context.stroke();
  context.beginPath();
  context.moveTo(inset, middle);
  context.lineTo(width - inset, middle);
  context.stroke();
  context.beginPath();
  context.arc(width / 2, middle, circle, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

/** Ballonnen's soft clouds drifting behind the balloons. */
export function drawClouds(context: CanvasRenderingContext2D, clouds: Cloud[], colour: string) {
  context.save();
  context.globalAlpha = BACKDROP_ALPHA;
  context.fillStyle = colour;
  clouds.forEach(({ x, y, size }) => {
    context.beginPath();
    context.ellipse(x, y, size * 0.6, size * 0.22, 0, 0, Math.PI * 2);
    context.ellipse(x - size * 0.22, y - size * 0.1, size * 0.26, size * 0.2, 0, 0, Math.PI * 2);
    context.ellipse(x + size * 0.18, y - size * 0.14, size * 0.3, size * 0.24, 0, 0, Math.PI * 2);
    context.fill();
  });
  context.restore();
}
