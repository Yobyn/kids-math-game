import { FloatUp, floatAt } from './game-feel';

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
