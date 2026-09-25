'use strict';

/**
 * Draws every part of the character into one SVG sprite:
 * src/assets/avatar/parts.svg.
 *
 * WHY A GENERATED SPRITE. The art used to be path strings inside the app's
 * JavaScript, which put it in the first load on every screen (the header
 * draws the character). That was affordable at 2.6 kB, and would not be at
 * the detail the character needs: the first load had 5.05 kB of headroom.
 * An asset file costs the budget nothing, is precached for offline play by
 * the service worker, and can be as detailed as it needs to be.
 *
 * WHY GENERATED RATHER THAN HAND-EDITED. Every part is fitted to a head, and
 * the heads are functions (geometry.js). Deriving the drawing from them is
 * what makes 36 face-and-hair combinations fit, and it means a head can
 * change without redrawing 36 hair styles. `node scripts/avatar-art/build-
 * sprite.js` rewrites the file; a test fails if it is out of date, so the
 * sprite cannot drift from the geometry that is tested.
 *
 * THE RULES THE ART FOLLOWS, all of it:
 *  - LIGHT FROM THE TOP LEFT. Shade on the lower right, highlights upper left.
 *  - ONE OUTLINE WEIGHT, `var(--line-w)`, so parts look drawn by one hand.
 *  - EVERY COLOUR A CHILD CHOOSES IS NAMED EXPLICITLY — `var(--skin)`,
 *    `var(--hair)`, `var(--eye)` and their shades. MDN is plain that CSS is
 *    "not guaranteed to be inherited by the cloned DOM unless you explicitly
 *    request" it, so nothing here relies on `fill` inheriting from outside.
 *  - TWO LEVELS OF DETAIL. Five of the seven places the character appears
 *    draw it at 32-44px. Silhouettes and colour blocks carry it there; fine
 *    detail sits in groups hidden by `--detail: none` at small sizes, and a
 *    simpler eye appears via `--small`.
 *  - NO clipPath, mask or gradient inside the sprite. References inside an
 *    externally loaded <use> are where browsers disagree; plain paths are not.
 */

const fs = require('fs');
const path = require('path');
const g = require('./geometry');

const OUT = path.join(__dirname, '..', '..', 'src', 'assets', 'avatar', 'parts.svg');

// ---------------------------------------------------------------- drawing kit

const num = n => {
  const v = Math.round(n * 10) / 10;
  return Object.is(v, -0) ? '0' : String(v);
};
const pt = p => `${num(p.x)} ${num(p.y)}`;

/**
 * A list of numbers as short as SVG allows: no leading zero, no space before
 * a minus, and no space before ".4" when the number just written already has
 * a decimal point (SVG reads "1.2.4" as 1.2 then .4).
 *
 * IT MUST LOOK AT THE LAST NUMBER, NOT THE LAST RUN OF CHARACTERS. The first
 * version checked whether the trailing characters held a point: after "1.5"
 * and "-2" that run is "1.5-2", which does — so ".4" was glued on and the
 * browser read "-2.4". Every hair shape it touched grew a shard. The test
 * packs thousands of random sequences and reads them back the way SVG does.
 */
function packed(values) {
  let out = '';
  let lastHasPoint = false;
  values.forEach((v, i) => {
    let s = num(v).replace(/^(-?)0\./, '$1.');
    if (i > 0 && !s.startsWith('-') && !(s.startsWith('.') && lastHasPoint)) {
      s = ' ' + s;
    }
    out += s;
    lastHasPoint = s.includes('.');
  });
  return out;
}

/** Catmull-Rom through the points, as cubic Béziers. */
function curve(pts, closed) {
  const n = pts.length;
  const at = i => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  const segments = closed ? n : n - 1;
  // Relative to where the pen is, rounded as it goes so errors cannot pile up
  const round = v => Math.round(v * 10) / 10;
  let cx = round(at(0).x);
  let cy = round(at(0).y);
  const values = [];
  for (let i = 0; i < segments; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1 = { x: round(p1.x + (p2.x - p0.x) / 6), y: round(p1.y + (p2.y - p0.y) / 6) };
    const c2 = { x: round(p2.x - (p3.x - p1.x) / 6), y: round(p2.y - (p3.y - p1.y) / 6) };
    const e = { x: round(p2.x), y: round(p2.y) };
    values.push(c1.x - cx, c1.y - cy, c2.x - cx, c2.y - cy, e.x - cx, e.y - cy);
    cx = e.x;
    cy = e.y;
  }
  return values.length ? 'c' + packed(values) : '';
}
const closed = pts => `M${pt(pts[0])}${curve(pts, true)}Z`;
const open = pts => `M${pt(pts[0])}${curve(pts, false)}`;

/** Two smooth runs joined at hard corners, closed. For hair: shell, then hairline. */
function twoRuns(a, b) {
  return `M${pt(a[0])}${curve(a, false)}L${pt(b[0])}${curve(b, false)}Z`;
}

const LINE = 'stroke="#221633" stroke-opacity=".8" stroke-linejoin="round" style="stroke-width:var(--line-w,1.3)"';
const fill = v => `style="fill:var(${v})"`;
const DETAIL = 'style="display:var(--detail,inline)"';
const SMALL = 'style="display:var(--small,none)"';

// Colours that are not a child's choice are baked in, shaded the same way the
// app shades the ones that are: toward the theme's violet, not toward black.
function mix(hex, toward, t) {
  const a = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const b = [1, 3, 5].map(i => parseInt(toward.slice(i, i + 2), 16));
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
const shade = (hex, t = 0.3) => mix(hex, '#2a1640', t);
const light = (hex, t = 0.3) => mix(hex, '#ffffff', t);

/** Points moved inward along the outline's normal, most on the lower right. */
function litInset(face, depth) {
  const pts = [];
  const n = 40;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const p = g.facePoint(face, a);
    const nn = g.normalAt(face, a);
    // Light from the top left means shadow toward a = 3π/4 (lower right)
    const d = depth * Math.pow(Math.max(0, Math.cos(a - 0.75 * Math.PI)), 1.3);
    pts.push({ x: p.x - nn.x * d, y: p.y - nn.y * d });
  }
  return pts;
}

/** A shape pulled toward the head's centre, so a rim sits inside its edge. */
function inward(shape, by) {
  return shape.map(p => {
    const dx = 50 - p.x;
    const dy = 56 - p.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: p.x + (dx / len) * by, y: p.y + (dy / len) * by };
  });
}

// ----------------------------------------------------------------------- parts

const parts = [];
const part = (id, body) => parts.push(`<g id="${id}">${body}</g>`);

// FACES: a shaded base, the lit face over it, cheeks, and a nose at large sizes
for (const face of g.FACE_SHAPES) {
  const outline = g.outline(face, 30);
  part(`face-${face}`,
    `<path d="${closed(outline)}" ${fill('--skin-shade')} ${LINE}/>`
    + `<path d="${closed(litInset(face, 3.2))}" ${fill('--skin')}/>`
    + '<ellipse cx="32.5" cy="63" rx="5.2" ry="3.2" fill="#ff6f8e" fill-opacity=".26"/>'
    + '<ellipse cx="67.5" cy="63" rx="5.2" ry="3.2" fill="#ff6f8e" fill-opacity=".26"/>'
    + `<path ${DETAIL} d="M48.4 58.2Q50.8 62.6 52.6 60.4" fill="none" stroke="#221633" stroke-opacity=".32" stroke-width="1.2" stroke-linecap="round"/>`);

  const ears = g.ears(face);
  part(`ears-${face}`, ears.map(e =>
    `<ellipse cx="${num(e.x)}" cy="${num(e.y)}" rx="${e.rx}" ry="${e.ry}" ${fill('--skin')} ${LINE}/>`
    + `<path ${DETAIL} d="M${num(e.x + (e.x < 50 ? 1.2 : -1.2))} ${num(e.y - 3.6)}q${e.x < 50 ? -2.6 : 2.6} 3.6 0 7" fill="none" stroke="#221633" stroke-opacity=".3" stroke-width="1.1" stroke-linecap="round"/>`
  ).join(''));
}

// EYES: big and bright when there is room; a simpler filled shape when small
const EYE_SHAPES = {
  round: { sclera: (x, y) => `M${num(x - 5.7)} ${y}a5.7 5.9 0 1 0 11.4 0a5.7 5.9 0 1 0 -11.4 0`, iris: 3.7, small: 4.6 },
  almond: { sclera: (x, y) => `M${num(x - 6.6)} ${y}Q${x} ${y - 6.8} ${num(x + 6.6)} ${y}Q${x} ${y + 5.8} ${num(x - 6.6)} ${y}Z`, iris: 3.4, small: 4.3 },
  wide: { sclera: (x, y) => `M${num(x - 6.4)} ${y}a6.4 6.8 0 1 0 12.8 0a6.4 6.8 0 1 0 -12.8 0`, iris: 4.3, small: 5.4 },
  narrow: { sclera: (x, y) => `M${num(x - 6.8)} ${y}Q${x} ${y - 5} ${num(x + 6.8)} ${y}Q${x} ${y + 3.8} ${num(x - 6.8)} ${y}Z`, iris: 2.9, small: 3.6 }
};
for (const [shape, e] of Object.entries(EYE_SHAPES)) {
  let big = '';
  let small = '';
  for (const { x, y } of g.EYES) {
    big += `<path d="${e.sclera(x, y)}" fill="#fbf8ff" ${LINE}/>`
      + `<circle cx="${x}" cy="${y + 0.3}" r="${e.iris}" ${fill('--eye')}/>`
      + `<circle cx="${x}" cy="${y + 0.3}" r="${num(e.iris * 0.5)}" fill="#1d1330"/>`
      + `<circle cx="${num(x - e.iris * 0.32)}" cy="${num(y - e.iris * 0.34)}" r="${num(e.iris * 0.36)}" fill="#fff"/>`
      + `<circle cx="${num(x + e.iris * 0.38)}" cy="${num(y + e.iris * 0.42)}" r="${num(e.iris * 0.16)}" fill="#fff" fill-opacity=".85"/>`;
    // Small: the shape itself in the chosen colour, so the choice still reads at 44px
    small += `<path d="${e.sclera(x, y).replace(/[\d.]+(?= |[a-zA-Z]|$)/g, m => m)}" transform="translate(${x} ${y}) scale(${num(e.small / 5.9)}) translate(${-x} ${-y})" ${fill('--eye')} stroke="#1d1330" stroke-width="1.2"/>`
      + `<circle cx="${num(x - 1.3)}" cy="${num(y - 1.5)}" r="1.5" fill="#fff"/>`;
  }
  part(`eyes-${shape}`, `<g ${DETAIL}>${big}</g><g ${SMALL}>${small}</g>`);
}

// BROWS: in the hair's shade, which is most of what makes a face read as a mood
part('brows', g.EYES.map(({ x }) =>
  `<path d="M${num(x - 5.2)} ${num(g.BROW_Y + 1.3)}Q${x} ${num(g.BROW_Y - 2.4)} ${num(x + 5.2)} ${num(g.BROW_Y + 0.6)}" fill="none" style="stroke:var(--hair-shade);stroke-width:calc(var(--line-w,1.3) * 1.6)" stroke-linecap="round"/>`
).join(''));

// MOUTHS
const MOUTH_INSIDE = '#5a2231';
part('mouth-smile', '<path d="M40.5 66.5Q50 74.8 59.5 66.5" fill="none" stroke="#7a2f35" stroke-width="2.4" stroke-linecap="round"/>');
part('mouth-grin',
  `<path d="M36.5 65.5Q50 66.6 63.5 65.5Q60 76.8 50 77Q40 76.8 36.5 65.5Z" fill="${MOUTH_INSIDE}" stroke="#7a2f35" stroke-width="1.6" stroke-linejoin="round"/>`
  + '<path d="M39 66.2Q50 67.3 61 66.2L60 69Q50 70.2 40 69Z" fill="#fff"/>');
part('mouth-soft', '<path d="M43 68.4Q50 72.4 57 68.4" fill="none" stroke="#7a2f35" stroke-width="2.2" stroke-linecap="round"/>');
part('mouth-open',
  `<path d="M41.5 65.4Q50 63 58.5 65.4Q57.6 76.8 50 77.2Q42.4 76.8 41.5 65.4Z" fill="${MOUTH_INSIDE}" stroke="#7a2f35" stroke-width="1.6" stroke-linejoin="round"/>`
  + `<path d="M44.4 73.6Q50 70.8 55.6 73.6Q53.6 76.6 50 76.6Q46.4 76.6 44.4 73.6Z" fill="#e0707f"/>`);

// HAIR: the front shell over every face, and what hangs behind
const RIM = 'fill="none" stroke-linecap="round" style="stroke:var(--hair-light);stroke-width:var(--tex-w,0);stroke-dasharray:var(--tex-dash,none)"';

for (const face of g.FACE_SHAPES) {
  for (const style of g.HAIR_STYLES) {
    const front = g.hairFront(face, style);
    const outer = front.outer;
    const n = outer.length - 1;

    // Shade: the right-hand third of the shell, from its outer edge halfway in
    const from = Math.round(n * 0.62);
    const every2 = (a) => a.filter((_, i) => i % 2 === 0 || i === a.length - 1);
    const shadeOuter = every2(outer.slice(from));
    const shadeInner = shadeOuter.map(p => ({
      x: p.base.x + (p.x - p.base.x) * 0.35,
      y: p.base.y + (p.y - p.base.y) * 0.35
    })).reverse();
    // Highlight: a soft band across the upper left of the crown
    const hl = every2(outer.slice(Math.round(n * 0.2), Math.round(n * 0.44) + 1));
    const hlOuter = hl.map(p => ({ x: p.base.x + (p.x - p.base.x) * 0.78, y: p.base.y + (p.y - p.base.y) * 0.78 }));
    const hlInner = hl.map(p => ({ x: p.base.x + (p.x - p.base.x) * 0.5, y: p.base.y + (p.y - p.base.y) * 0.5 })).reverse();

    // Strands: a few curves from the crown down to the hairline, at large sizes
    let strands = '';
    const strandCount = front.def.bumps ? 0 : 4;
    for (let k = 1; k <= strandCount; k++) {
      const t = k / (strandCount + 1);
      const top = outer[Math.round(n * (0.3 + 0.4 * t))];
      const s0 = { x: top.base.x + (top.x - top.base.x) * 0.45, y: top.base.y + (top.y - top.base.y) * 0.45 };
      const f = front.fringe[Math.round((front.fringe.length - 1) * (1 - t))];
      const mid = { x: (s0.x + f.x) / 2 + (t - 0.5) * 4, y: (s0.y + f.y) / 2 - 1.5 };
      strands += `M${pt(s0)}Q${pt(mid)} ${num(f.x)} ${num(f.y - 1.4)}`;
    }
    // A parting line from the crown to the hairline, where the style has one
    if (['long', 'braids', 'locs'].includes(style)) {
      const crownOuter = outer[Math.round(n / 2)];
      const lineTop = Math.min(...front.fringe.map(p => p.y));
      strands += `M50 ${num(crownOuter.y + front.def.thick * 0.35)}Q49.2 ${num((crownOuter.y + lineTop) / 2)} 50 ${num(lineTop + 0.6)}`;
    }
    // Curls: little arcs inside the shell instead of strands
    if (front.def.bumps) {
      const [count] = front.def.bumps;
      for (let k = 1; k < count; k += 2) {
        const p = outer[Math.round((n * k) / count)];
        const c = { x: p.base.x + (p.x - p.base.x) * 0.5, y: p.base.y + (p.y - p.base.y) * 0.5 };
        strands += `M${num(c.x - 1.6)} ${num(c.y + 0.6)}a1.9 1.9 0 1 1 3 -1.4`;
      }
    }

    part(`hair-${style}-${face}`,
      `<path d="${twoRuns(outer, front.fringe)}" ${fill('--hair')} ${LINE}${style === 'buzz' ? ' fill-opacity=".7"' : ''}/>`
      + `<path d="M${pt(shadeOuter[0])}${curve(shadeOuter, false)}L${pt(shadeInner[0])}${curve(shadeInner, false)}Z" ${fill('--hair-shade')}/>`
      + `<path ${DETAIL} d="M${pt(hlOuter[0])}${curve(hlOuter, false)}L${pt(hlInner[0])}${curve(hlInner, false)}Z" ${fill('--hair-light')} fill-opacity=".55"/>`
      + (strands ? `<path ${DETAIL} d="${strands}" fill="none" stroke-linecap="round" style="stroke:var(--hair-shade);stroke-width:.9"/>` : '')
      + `<path d="${open(every2(outer).map(p => ({ x: p.base.x + (p.x - p.base.x) * 0.72, y: p.base.y + (p.y - p.base.y) * 0.72 })))}" ${RIM}/>`);

    const back = g.hairBack(face, style);
    if (back.length) {
      let body = '';
      const strands = style === 'braids' || style === 'locs';
      for (const shape of back) {
        // A strand is a simple shape; a curve through every point is wasted bytes
        const d = strands
          ? (() => {
            const r = shape.map(p => ({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 }));
            return 'M' + pt(r[0]) + 'l' + packed(r.slice(1).flatMap((p, i) => [p.x - r[i].x, p.y - r[i].y])) + 'Z';
          })()
          : closed(shape);
        body += `<path d="${d}" ${fill('--hair-shade')} ${LINE}/>`;
      }
      // Braids get their weave, locs their bands, a bun its twist: detail only
      let detail = '';
      if (style === 'braids') {
        for (const strand of back) {
          const side = strand[0].x < 50 ? -1 : 1;
          const half = Math.floor(strand.length / 2);
          for (let i = 1; i < half - 1; i++) {
            const a = strand[i];
            const b = strand[strand.length - 1 - i];
            detail += `M${pt(a)}L${num((a.x + b.x) / 2)} ${num(a.y + 3 * side * 0 + 3)}L${pt(b)}`;
          }
        }
      }
      if (style === 'locs') {
        for (const strand of back) {
          const half = Math.floor(strand.length / 2);
          const line = strand.slice(1, half - 1).map((a, i) => {
            const b = strand[strand.length - 2 - i];
            return { x: a.x + (b.x - a.x) * 0.35, y: (a.y + b.y) / 2 };
          });
          detail += 'M' + line.map(pt).join('L');
        }
      }
      if (style === 'bun') {
        const cy = g.crownY(face) - 6.5;
        detail += `M44.6 ${num(cy - 1)}Q50 ${num(cy - 6)} 55 ${num(cy + 0.6)}M46.6 ${num(cy + 2.6)}Q51.4 ${num(cy + 0.4)} 53.4 ${num(cy + 4)}`;
      }
      // A hair tie in the field's own magenta, where a tie would be
      let ties = '';
      if (style === 'braids') {
        for (const strand of back) {
          const bottom = strand.reduce((a, b) => (b.y > a.y ? b : a));
          ties += `<rect x="${num(bottom.x - 4.4)}" y="${num(bottom.y - 7)}" width="8.8" height="3.4" rx="1.6" fill="#d633eb" stroke="#221633" stroke-opacity=".6" stroke-width=".8"/>`;
        }
      }
      if (style === 'bun') {
        const cy = g.crownY(face) - 6.5;
        ties += `<path d="M42.6 ${num(cy + 7.2)}Q50 ${num(cy + 10.4)} 57.4 ${num(cy + 7.2)}" fill="none" stroke="#d633eb" stroke-width="2.6" stroke-linecap="round"/>`;
      }
      part(`hair-back-${style}-${face}`,
        body
        + (detail ? `<path ${DETAIL} d="${detail}" fill="none" stroke-linecap="round" stroke-linejoin="round" style="stroke:var(--hair);stroke-width:1"/>` : '')
        + ties
        + (['braids', 'locs', 'bun'].includes(style) ? '' : back.map(shape => `<path d="${closed(inward(shape, 2.2))}" ${RIM}/>`).join('')));
    }
  }
}

// BODY: neck, shoulders and the top, per top. Tops are not a child's colour
// choice, so they are baked here, shaded the same way the rest is.
const torsoHalf = y => 7.5 + 31 * Math.pow(Math.max(0, (y - 90) / 42), 0.55);
function torso() {
  const pts = [];
  for (let y = 132; y >= 90; y -= 3) pts.push({ x: 50 - torsoHalf(y), y });
  for (let y = 90; y <= 132; y += 3) pts.push({ x: 50 + torsoHalf(y), y });
  return pts;
}
function band(y1, y2) {
  // A horizontal stripe that follows the torso's own edges
  const pts = [];
  for (let y = y1; y <= y2; y += 1) pts.push({ x: 50 - torsoHalf(y) + 0.6, y });
  for (let y = y2; y >= y1; y -= 1) pts.push({ x: 50 + torsoHalf(y) - 0.6, y });
  return 'M' + pts.map(pt).join('L') + 'Z';
}
const TORSO = torso();
const TORSO_D = `M${pt(TORSO[0])}L${TORSO.slice(1).map(pt).join('L')}Z`;
const TORSO_SHADE = (() => {
  const pts = [];
  for (let y = 132; y >= 96; y -= 3) pts.push({ x: 50 + torsoHalf(y) * 0.55, y });
  for (let y = 96; y <= 132; y += 3) pts.push({ x: 50 + torsoHalf(y) - 0.4, y });
  return 'M' + pts.map(pt).join('L') + 'Z';
})();

const TOPS = {
  none: { colour: '#5b679a' },
  striped: { colour: '#c1442e', deco: '#f5ece0' },
  'star-tee': { colour: '#3f8fd6', deco: '#ffd34d' },
  hoodie: { colour: '#1f96d2', deco: '#155f86' },
  'flower-tee': { colour: '#8ab84f', deco: '#f5d6e8' }
};
for (const [id, top] of Object.entries(TOPS)) {
  let deco = '';
  if (id === 'striped') {
    deco = `<path d="${band(104, 110)}${band(118, 124)}" fill="${top.deco}"/>`;
  }
  if (id === 'star-tee') {
    deco = `<path d="M50 102.5L54.4 111.8L64.6 112.6L56.8 119.2L59.4 129.2L50 123.8L40.6 129.2L43.2 119.2L35.4 112.6L45.6 111.8Z" fill="${top.deco}" stroke="${shade(top.deco, 0.35)}" stroke-width="1" stroke-linejoin="round"/>`;
  }
  if (id === 'hoodie') {
    deco = `<path d="M50 88C38.5 88 33 94.5 33.6 103.4Q41 97.6 50 97.6Q59 97.6 66.4 103.4C67 94.5 61.5 88 50 88Z" fill="${shade(top.colour, 0.18)}" ${LINE}/>`
      + `<path ${DETAIL} d="M46.4 99.6V112M53.6 99.6V112" stroke="#f5ece0" stroke-width="1.3" stroke-linecap="round"/>`
      + `<path ${DETAIL} d="M38.5 118.5H61.5L59 130H41Z" fill="${shade(top.colour, 0.12)}" stroke="${top.deco}" stroke-width="1"/>`;
  }
  if (id === 'flower-tee') {
    const flower = (cx, cy) => [0, 72, 144, 216, 288].map(a => {
      const r = (a * Math.PI) / 180;
      return `<circle cx="${num(cx + 3.2 * Math.sin(r))}" cy="${num(cy - 3.2 * Math.cos(r))}" r="2.6" fill="${top.deco}"/>`;
    }).join('') + `<circle cx="${cx}" cy="${cy}" r="1.9" fill="#ffd34d"/>`;
    deco = flower(50, 107) + flower(38, 118) + flower(62, 118) + `<g ${DETAIL}>${flower(50, 128)}</g>`;
  }
  part(`body-${id}`,
    `<path d="M42.8 74H57.2L57.8 95H42.2Z" ${fill('--skin')} ${LINE}/>`
    + `<ellipse cx="50" cy="80.5" rx="7.4" ry="3.8" ${fill('--skin-shade')}/>`
    + `<path d="${TORSO_D}" fill="${top.colour}" ${LINE}/>`
    + `<path d="${TORSO_SHADE}" fill="${shade(top.colour, 0.28)}" fill-opacity=".7"/>`
    + deco
    // Arms read as arms because of the seam where they meet the shoulder
    + `<path ${DETAIL} d="M${num(50 - torsoHalf(104) + 5)} 104Q${num(50 - torsoHalf(118) + 7)} 118 ${num(50 - torsoHalf(132) + 9)} 132M${num(50 + torsoHalf(104) - 5)} 104Q${num(50 + torsoHalf(118) - 7)} 118 ${num(50 + torsoHalf(132) - 9)} 132" fill="none" stroke="${shade(top.colour, 0.4)}" stroke-width="1.1" stroke-linecap="round"/>`
    + `<path d="M42.4 91Q50 98.4 57.6 91" fill="none" stroke="${shade(top.colour, 0.38)}" stroke-width="2.4" stroke-linecap="round"/>`);
}

// HATS: fitted to each face at its hat line. Those that cover the head hide
// the hair above that line (the app clips it), so a hat never floats on hair.
function dome(face, lift) {
  // The top of the head, offset outward, down to the hat line on both sides
  const line = g.hatLine(face);
  const l = g.sidePoint(face, line, 'left');
  const r = g.sidePoint(face, line, 'right');
  const pts = [];
  const steps = 22;
  const aFrom = l.a - Math.PI * 2;
  for (let i = 0; i <= steps; i++) {
    const a = aFrom + ((r.a - aFrom) * i) / steps;
    const p = g.facePoint(face, a);
    const nn = g.normalAt(face, a);
    pts.push({ x: p.x + nn.x * lift, y: p.y + nn.y * lift });
  }
  return { pts, line, halfW: r.x - 50 + lift };
}

const HATS = {
  cap: (face) => {
    const { pts, line, halfW } = dome(face, 3.2);
    const c = '#c1442e';
    return `<path d="M${num(50 - halfW - 2)} ${num(line + 1)}Q${num(50 - halfW - 15)} ${num(line + 2.6)} ${num(50 - halfW - 16)} ${num(line + 5.6)}Q${num(50 - halfW + 2)} ${num(line + 6)} 52 ${num(line + 2.4)}Z" fill="${shade(c, 0.25)}" ${LINE}/>`
      + `<path d="${open(pts)}Z" fill="${c}" ${LINE}/>`
      + `<path d="M${pt(pts[Math.round(pts.length * 0.62)])}${curve(pts.slice(Math.round(pts.length * 0.62)), false)}L${num(50 + halfW * 0.5)} ${num(line)}Z" fill="${shade(c, 0.22)}"/>`
      + `<path ${DETAIL} d="M50 ${num(pts[11].y)}V${num(line)}" stroke="${shade(c, 0.3)}" stroke-width="1"/>`
      + `<circle cx="50" cy="${num(pts[11].y + 0.4)}" r="2" fill="${shade(c, 0.3)}"/>`;
  },
  beanie: (face) => beanie(face, '#3f8fd6', false),
  'bobble-hat': (face) => beanie(face, '#c1442e', true),
  wizard: (face) => {
    const line = g.hatLine(face);
    const halfW = g.halfWidthAt(face, line) + 9;
    const tipY = g.crownY(face) - 30;
    const c = '#6b4bb8';
    return `<path d="M${num(50 - halfW + 7)} ${num(line)}Q46 ${num(line - 16)} 54 ${num(tipY)}Q58 ${num(line - 18)} ${num(50 + halfW - 7)} ${num(line)}Z" fill="${c}" ${LINE}/>`
      + `<path d="M54 ${num(tipY)}Q58 ${num(line - 18)} ${num(50 + halfW - 7)} ${num(line)}L${num(50 + halfW * 0.25)} ${num(line)}Q56 ${num(line - 16)} 54 ${num(tipY)}Z" fill="${shade(c, 0.25)}"/>`
      + `<ellipse cx="50" cy="${num(line)}" rx="${num(halfW)}" ry="4" fill="${shade(c, 0.12)}" ${LINE}/>`
      + `<path d="M${num(50 - halfW + 7.4)} ${num(line - 2.4)}Q50 ${num(line + 1.2)} ${num(50 + halfW - 7.4)} ${num(line - 2.4)}" fill="none" stroke="#ffd34d" stroke-width="2.2"/>`
      + `<path ${DETAIL} d="M46 ${num(line - 12)}l1 2.4 2.6.2-2 1.7.6 2.5-2.2-1.4-2.2 1.4.6-2.5-2-1.7 2.6-.2z" fill="#ffd34d"/>`;
  },
  crown: (face) => {
    const line = g.hatLine(face);
    const halfW = g.halfWidthAt(face, line) + 1.4;
    const x0 = 50 - halfW;
    const x1 = 50 + halfW;
    const base = line - 1;
    const top = line - 16;
    const w = x1 - x0;
    const spikes = [0, 0.25, 0.5, 0.75, 1].map(t => x0 + w * t);
    let d = `M${num(x0)} ${num(base)}`;
    spikes.forEach((x, i) => {
      d += `L${num(x)} ${num(i % 2 ? top + 4 : top)}`;
      if (i < spikes.length - 1) d += `L${num(x + w / 8)} ${num(base - 7)}`;
    });
    d += `L${num(x1)} ${num(base)}Z`;
    const c = '#e0b35a';
    return `<path d="${d}" fill="${c}" ${LINE}/>`
      + `<path d="M${num(x0 + 1)} ${num(base - 5)}H${num(x1 - 1)}V${num(base)}H${num(x0 + 1)}Z" fill="${shade(c, 0.18)}"/>`
      + spikes.map((x, i) => `<circle cx="${num(x)}" cy="${num((i % 2 ? top + 4 : top) - 1.4)}" r="1.9" fill="${light(c, 0.35)}" ${LINE}/>`).join('')
      + `<g ${DETAIL}><circle cx="50" cy="${num(base - 2.5)}" r="2" fill="#c1442e"/><circle cx="${num(50 - w * 0.25)}" cy="${num(base - 2.5)}" r="1.6" fill="#3f8fd6"/><circle cx="${num(50 + w * 0.25)}" cy="${num(base - 2.5)}" r="1.6" fill="#3f8fd6"/></g>`;
  }
};
function beanie(face, c, bobble) {
  const { pts, line, halfW } = dome(face, 4);
  const top = Math.min(...pts.map(p => p.y));
  const band = `M${num(50 - halfW - 1.4)} ${num(line - 6.5)}Q50 ${num(line - 8.5)} ${num(50 + halfW + 1.4)} ${num(line - 6.5)}L${num(50 + halfW + 1.4)} ${num(line + 1.5)}Q50 ${num(line - 0.5)} ${num(50 - halfW - 1.4)} ${num(line + 1.5)}Z`;
  let ribs = '';
  for (let x = 50 - halfW + 2; x < 50 + halfW - 1; x += 4) {
    ribs += `M${num(x)} ${num(line - 6)}V${num(line + 0.6)}`;
  }
  let out = `<path d="${open(pts)}Z" fill="${c}" ${LINE}/>`
    + `<path d="M${pt(pts[Math.round(pts.length * 0.6)])}${curve(pts.slice(Math.round(pts.length * 0.6)), false)}L${num(50 + halfW * 0.4)} ${num(line - 4)}Z" fill="${shade(c, 0.22)}"/>`
    + `<path d="${band}" fill="${bobble ? '#f3e9e2' : shade(c, 0.12)}" ${LINE}/>`
    + `<path ${DETAIL} d="${ribs}" stroke="${bobble ? '#d8c8c0' : shade(c, 0.3)}" stroke-width=".9"/>`;
  if (bobble) {
    const cy = top - 3.2;
    out += `<circle cx="50" cy="${num(cy)}" r="6.2" fill="#f3e9e2" ${LINE}/>`
      + `<path ${DETAIL} d="M46.4 ${num(cy - 1)}q2 -2.6 4.6 -1M47.2 ${num(cy + 2.6)}q3 1 5.8 -1.4" fill="none" stroke="#d8c8c0" stroke-width="1" stroke-linecap="round"/>`;
  }
  return out;
}
for (const face of g.FACE_SHAPES) {
  for (const [id, draw] of Object.entries(HATS)) {
    part(`hat-${id}-${face}`, draw(face));
  }
}

// GLASSES: lenses over the eyes, arms that stop at this face's edge
const GLASSES = {
  'round-glasses': (face, reach) => g.EYES.map(({ x, y }) =>
    `<circle cx="${x}" cy="${y}" r="7.4" fill="#fff" fill-opacity=".14" stroke="#2b2118" stroke-width="1.9"/>`).join('')
    + `<path d="M46.4 ${g.EYE_Y - 1}Q50 ${g.EYE_Y - 3.4} 53.6 ${g.EYE_Y - 1}" fill="none" stroke="#2b2118" stroke-width="1.8"/>`
    + reach(32.1, 67.9, '#2b2118', 1.8),
  shades: (face, reach) => g.EYES.map(({ x, y }) =>
    `<path d="M${num(x - 8)} ${y - 4.6}H${num(x + 8)}Q${num(x + 7.4)} ${y + 6.4} ${x} ${y + 6.4}Q${num(x - 7.4)} ${y + 6.4} ${num(x - 8)} ${y - 4.6}Z" fill="#241b33" stroke="#140e1f" stroke-width="1.4"/>`
    + `<path ${DETAIL} d="M${num(x - 5.4)} ${y - 1.8}l3.4 -1.2" stroke="#fff" stroke-opacity=".7" stroke-width="1.3" stroke-linecap="round"/>`).join('')
    + `<path d="M47.5 ${g.EYE_Y - 3.6}H52.5" stroke="#140e1f" stroke-width="2"/>`
    + reach(31.5, 68.5, '#140e1f', 1.8, -3.6),
  goggles: (face, reach) => reach(31.6, 68.4, '#2f6b44', 3.4)
    + g.EYES.map(({ x, y }) =>
      `<circle cx="${x}" cy="${y}" r="8" fill="#9fe0b6" fill-opacity=".38" stroke="#3f8f5a" stroke-width="2.6"/>`
      + `<path ${DETAIL} d="M${num(x - 4.6)} ${y - 2}a5 5 0 0 1 3.6 -3.4" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="1.3" stroke-linecap="round"/>`).join('')
    + `<path d="M47.4 ${g.EYE_Y}H52.6" stroke="#3f8f5a" stroke-width="2.4"/>`,
  'spooky-glasses': (face, reach) => g.EYES.map(({ x, y }) =>
    `<path d="M${num(x - 7.6)} ${y}Q${num(x - 7.6)} ${y - 6.8} ${x} ${y - 6.8}Q${num(x + 7.6)} ${y - 6.8} ${num(x + 7.6)} ${y}Q${num(x + 7.6)} ${y + 6.8} ${x} ${y + 6.8}Q${num(x - 7.6)} ${y + 6.8} ${num(x - 7.6)} ${y}Z" fill="#e07b2a" fill-opacity=".92" stroke="#8a3f12" stroke-width="1.5"/>`
    + `<path ${DETAIL} d="M${x} ${y - 6.6}V${y + 6.6}M${num(x - 3.8)} ${y - 5.8}Q${num(x - 5.4)} ${y} ${num(x - 3.8)} ${y + 5.8}M${num(x + 3.8)} ${y - 5.8}Q${num(x + 5.4)} ${y} ${num(x + 3.8)} ${y + 5.8}" fill="none" stroke="#8a3f12" stroke-opacity=".6" stroke-width=".9"/>`
    + `<path d="M${num(x - 0.8)} ${y - 6.8}q.4 -2.6 2.4 -3.2" fill="none" stroke="#3f8f5a" stroke-width="1.6" stroke-linecap="round"/>`).join('')
    + `<path d="M47.6 ${g.EYE_Y - 1}H52.4" stroke="#8a3f12" stroke-width="1.8"/>`
    + reach(31.9, 68.1, '#8a3f12', 1.6)
};
for (const face of g.FACE_SHAPES) {
  const edge = g.halfWidthAt(face, g.EYE_Y - 1);
  // An arm runs from the lens to where THIS face ends, and no further
  const reach = (xl, xr, colour, width, dy = -1) =>
    `<path d="M${num(xl)} ${g.EYE_Y + dy}L${num(50 - edge + 0.4)} ${g.EYE_Y + dy - 0.6}M${num(xr)} ${g.EYE_Y + dy}L${num(50 + edge - 0.4)} ${g.EYE_Y + dy - 0.6}" stroke="${colour}" stroke-width="${width}" stroke-linecap="round"/>`;
  for (const [id, draw] of Object.entries(GLASSES)) {
    part(`glasses-${id}-${face}`, draw(face, reach));
  }
}

// ---------------------------------------------------------------------- output

/**
 * One element may be given a fill and a line weight, each as a `style`. Two
 * `style` attributes on one element is invalid XML, and ONE invalid attribute
 * makes a browser reject the whole sprite — every part of every character
 * blank, with no error anywhere. Merged here, and the test parses the file.
 */
function mergeStyles(markup) {
  return markup.replace(/<[a-z]+\b[^>]*>/g, tag => {
    const styles = [];
    const rest = tag.replace(/\sstyle="([^"]*)"/g, (_, css) => {
      styles.push(css);
      return '';
    });
    if (styles.length === 0) return tag;
    const merged = ` style="${styles.join(';')}"`;
    return rest.replace(/(\/?>)$/, merged + '$1');
  });
}

function render() {
  return mergeStyles('<svg xmlns="http://www.w3.org/2000/svg">\n'
    + '<!-- GENERATED by scripts/avatar-art/build-sprite.js from scripts/avatar-art/geometry.js.\n'
    + '     Do not edit by hand: a test fails if this file and the generator disagree. -->\n'
    + '<defs>\n' + parts.join('\n') + '\n</defs>\n</svg>\n');
}

module.exports = { render, packed, OUT, HATS: Object.keys(HATS), GLASSES: Object.keys(GLASSES), TOPS: Object.keys(TOPS) };

if (require.main === module) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, render());
  const bytes = fs.statSync(OUT).size;
  const gz = require('zlib').gzipSync(fs.readFileSync(OUT)).length;
  console.log(`wrote ${path.relative(process.cwd(), OUT)}: ${parts.length} parts, ${(bytes / 1024).toFixed(1)} kB (${(gz / 1024).toFixed(1)} kB gzipped)`);
}
