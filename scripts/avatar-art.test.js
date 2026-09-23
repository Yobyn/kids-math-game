const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const g = require('./avatar-art/geometry');

/**
 * The character's parts are fitted to the head by construction. These check
 * that the construction actually holds, for EVERY face-and-hair combination
 * — the failure being fixed was 32 of 36 combinations nobody had looked at.
 * Every assertion is about a RELATIONSHIP (covered, clear, attached), never
 * about a coordinate, so redrawing a style cannot pass by accident.
 */

const COMBOS = g.FACE_SHAPES.flatMap(face => g.HAIR_STYLES.map(style => ({ face, style })));

function faceOutline(face) {
  return g.outline(face, 720);
}

function hairlineAt(front, x) {
  // The hairline runs right to left; find the segment containing x
  const f = front.fringe;
  for (let i = 0; i < f.length - 1; i++) {
    const a = f[i];
    const b = f[i + 1];
    if ((x <= a.x && x >= b.x) || (x >= a.x && x <= b.x)) {
      const t = (x - a.x) / (b.x - a.x || 1);
      return a.y + (b.y - a.y) * t;
    }
  }
  return null;
}

test('there are 36 combinations, and every one is checked', () => {
  assert.strictEqual(COMBOS.length, 36);
});

test('the lists here are the lists the app offers a child', () => {
  // A style added to the app but not here would never be fitted or drawn
  const model = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'avatar', 'avatar-model.ts'), 'utf8');
  const list = name => {
    const m = new RegExp(`export const ${name}[^=]*=\\s*\\[([^\\]]*)\\]`).exec(model);
    return m[1].match(/'([^']+)'/g).map(s => s.slice(1, -1));
  };
  assert.deepStrictEqual(list('HAIR_STYLES'), g.HAIR_STYLES);
  assert.deepStrictEqual(list('FACE_SHAPES'), g.FACE_SHAPES);
});

for (const { face, style } of COMBOS) {
  test(`${style} hair on a ${face} face covers the scalp with no gap above it`, () => {
    const front = g.hairFront(face, style);
    const top = faceOutline(face).filter(p => {
      const line = hairlineAt(front, p.x);
      // The part of the skull above the hairline, between the two sideburns
      return p.y < front.def.sideY - 0.5 && line !== null && p.y < line - 0.5;
    });
    assert.ok(top.length > 40, 'there is a scalp to cover');
    for (const p of top) {
      assert.ok(g.pointInPolygon(p, front.polygon), `bare scalp at (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`);
    }
    // And just OUTSIDE the scalp too: this is what "floating" used to look like
    for (let a = -0.9; a <= 0.9; a += 0.05) {
      const p = g.facePoint(face, a);
      const n = g.normalAt(face, a);
      const just = { x: p.x + n.x * 0.6, y: p.y + n.y * 0.6 };
      assert.ok(g.pointInPolygon(just, front.polygon), `gap above the scalp at angle ${a.toFixed(2)}`);
    }
  });

  test(`${style} hair on a ${face} face sits ON the head — neither cut in nor floating`, () => {
    const front = g.hairFront(face, style);
    const hairTop = Math.min(...front.outer.map(p => p.y));
    const crown = g.crownY(face);
    const [, depth] = front.def.bumps || [0, 0];
    assert.ok(hairTop <= crown - front.def.thick + 0.01, `cut in: hair top ${hairTop.toFixed(1)} vs crown ${crown}`);
    assert.ok(hairTop >= crown - front.def.thick - depth - 0.5, `floating: hair top ${hairTop.toFixed(1)} vs crown ${crown}`);
  });

  test(`${style} hair on a ${face} face leaves the eyes and brows clear`, () => {
    const front = g.hairFront(face, style);
    const clear = [];
    for (const eye of g.EYES) {
      clear.push(eye, { x: eye.x - g.EYE_HALF_WIDTH, y: eye.y }, { x: eye.x + g.EYE_HALF_WIDTH, y: eye.y },
        { x: eye.x, y: eye.y - g.EYE_HALF_HEIGHT });
      for (let dx = -5; dx <= 5; dx += 2.5) {
        clear.push({ x: eye.x + dx, y: g.BROW_Y });
      }
    }
    for (const p of clear) {
      assert.ok(!g.pointInPolygon(p, front.polygon), `hair over the face at (${p.x}, ${p.y})`);
    }
  });

  test(`${style} hair on a ${face} face has its hairline on the face, ending on the outline`, () => {
    const front = g.hairFront(face, style);
    const body = faceOutline(face);
    front.fringe.slice(1, -1).forEach(p => {
      assert.ok(g.pointInPolygon(p, body), `hairline off the face at (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`);
    });
    for (const end of [front.fringe[0], front.fringe[front.fringe.length - 1]]) {
      const nearest = Math.min(...body.map(q => Math.hypot(q.x - end.x, q.y - end.y)));
      assert.ok(nearest < 0.35, `hairline end is ${nearest.toFixed(2)} off the outline`);
    }
  });
}

for (const face of g.FACE_SHAPES) {
  test(`the eyes fit inside a ${face} face with room to spare`, () => {
    const body = faceOutline(face);
    for (const eye of g.EYES) {
      for (const dx of [-g.EYE_HALF_WIDTH - 3, g.EYE_HALF_WIDTH + 3]) {
        assert.ok(g.pointInPolygon({ x: eye.x + dx, y: eye.y }, body), `${face}: eye too close to the edge`);
      }
    }
  });

  test(`the ears join a ${face} face rather than hovering beside it`, () => {
    for (const ear of g.ears(face)) {
      const side = ear.x < 50 ? 'left' : 'right';
      const edge = g.sidePoint(face, ear.y, side);
      assert.ok(Math.abs(ear.x - edge.x) < 2, `${face}: ear is ${Math.abs(ear.x - edge.x).toFixed(1)} from the head`);
      // Tucked behind the outline, so the face covers the join
      assert.ok(side === 'left' ? ear.x > edge.x : ear.x < edge.x, `${face}: ear sits outside the head`);
    }
  });

  test(`a hat on a ${face} face sits below the crown and above the brows`, () => {
    const line = g.hatLine(face);
    assert.ok(line >= g.crownY(face) + 10, 'too high to hold');
    assert.ok(line <= g.BROW_Y - 3, 'over the brows');
  });
}

test('a bun sits on the crown rather than above it', () => {
  for (const face of g.FACE_SHAPES) {
    const [bun] = g.hairBack(face, 'bun');
    const bottom = Math.max(...bun.map(p => p.y));
    const front = g.hairFront(face, 'bun');
    const hairTop = Math.min(...front.outer.map(p => p.y));
    assert.ok(bottom > hairTop + 1, `${face}: bun does not touch the hair`);
  }
});

test('braids and locs start at the head and hang below the chin', () => {
  for (const face of g.FACE_SHAPES) {
    for (const style of ['braids', 'locs']) {
      for (const strand of g.hairBack(face, style)) {
        const topPt = strand.reduce((a, b) => (b.y < a.y ? b : a));
        const side = topPt.x < 50 ? 'left' : 'right';
        const edge = g.sidePoint(face, topPt.y, side);
        assert.ok(Math.abs(topPt.x - edge.x) < 6, `${face} ${style}: strand starts ${Math.abs(topPt.x - edge.x).toFixed(1)} from the head`);
      }
      const lowest = Math.max(...g.hairBack(face, style).flat().map(p => p.y));
      assert.ok(lowest > g.chinY(face) - 8, `${face} ${style}: too short to read as ${style}`);
    }
  }
});

// ------------------------------------------------------------- the sprite file

const sprite = require('./avatar-art/build-sprite');
const SPRITE_FILE = sprite.OUT;

/** Numbers the way an SVG path parser reads them. */
function svgNumbers(s) {
  return (s.match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) || []).map(Number);
}

test('packed path numbers read back exactly as written, for any sequence', () => {
  // The shard bug: "1.5" then "-2" then ".4" was written "1.5-2.4" and read as -2.4
  assert.deepStrictEqual(svgNumbers(sprite.packed([1.5, -2, 0.4])), [1.5, -2, 0.4]);
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let run = 0; run < 5000; run++) {
    const values = Array.from({ length: 1 + Math.floor(rand() * 12) }, () => {
      const v = (rand() - 0.5) * (rand() < 0.3 ? 2 : 60);
      return Math.round(v * 10) / 10;
    });
    const back = svgNumbers(sprite.packed(values));
    assert.deepStrictEqual(back, values.map(v => (Object.is(v, -0) ? 0 : v)), `packed ${JSON.stringify(values)}`);
  }
});

test('the sprite on disk is exactly what the generator draws', () => {
  // Nobody hand-edits the art out of step with the geometry that is tested
  assert.strictEqual(fs.readFileSync(SPRITE_FILE, 'utf8'), sprite.render(),
    'parts.svg is stale: run node scripts/avatar-art/build-sprite.js');
});

test('the sprite is one well-formed document — one bad attribute blanks every character', () => {
  const svg = fs.readFileSync(SPRITE_FILE, 'utf8');
  for (const tag of svg.match(/<[a-z]+\b[^>]*>/g)) {
    const names = (tag.match(/\s([a-z:-]+)=/g) || []).map(n => n.trim());
    assert.strictEqual(new Set(names).size, names.length, `duplicate attribute in ${tag.slice(0, 80)}`);
  }
  const opens = (svg.match(/<g\b/g) || []).length;
  const closes = (svg.match(/<\/g>/g) || []).length;
  assert.strictEqual(opens, closes, 'unbalanced groups');
});

// ------------------------------------------------------- the app and the art agree

const APP = path.join(__dirname, '..', 'src');
const read = rel => fs.readFileSync(path.join(APP, rel), 'utf8');
const MODEL = read('app/avatar/avatar-model.ts');
const PARTS = read('app/avatar/avatar-parts.ts');
const SVG = fs.readFileSync(SPRITE_FILE, 'utf8');
const PART_IDS = new Set([...SVG.matchAll(/<g id="([^"]+)"/g)].map(m => m[1]));

function tsList(source, name) {
  const m = new RegExp(`export const ${name}[^=]*=\\s*\\[([^\\]]*)\\]`).exec(source);
  assert.ok(m, `${name} not found`);
  return m[1].match(/'([^']+)'/g).map(s => s.slice(1, -1));
}

/** Wardrobe ids by slot, read from the objects themselves. */
function wardrobe(slot) {
  return [...MODEL.matchAll(/\{\s*id:\s*'([^']+)',\s*slot:\s*'(hat|glasses|top)'/g)]
    .filter(m => m[2] === slot).map(m => m[1]);
}

test('every part the app can ask for is drawn, for every face', () => {
  const missing = [];
  const need = id => { if (!PART_IDS.has(id)) missing.push(id); };
  need('brows');
  tsList(MODEL, 'EYE_SHAPES').forEach(e => need(`eyes-${e}`));
  tsList(MODEL, 'MOUTH_SHAPES').forEach(m => need(`mouth-${m}`));
  need('body-none');
  wardrobe('top').forEach(t => need(`body-${t}`));
  for (const face of g.FACE_SHAPES) {
    need(`face-${face}`);
    need(`ears-${face}`);
    g.HAIR_STYLES.forEach(s => need(`hair-${s}-${face}`));
    tsList(PARTS, 'HAIR_WITH_BACK').forEach(s => need(`hair-back-${s}-${face}`));
    wardrobe('hat').forEach(h => need(`hat-${h}-${face}`));
    wardrobe('glasses').forEach(x => need(`glasses-${x}-${face}`));
  }
  assert.ok(wardrobe('hat').length >= 5 && wardrobe('top').length >= 4, 'the wardrobe was read');
  assert.deepStrictEqual(missing, [], 'drawn nowhere — the character would have a hole');
});

test('the styles the app draws a back layer for are exactly the ones that have one', () => {
  const withBack = g.HAIR_STYLES.filter(s => g.hairBack('round', s).length > 0);
  assert.deepStrictEqual(tsList(PARTS, 'HAIR_WITH_BACK'), withBack);
});

test('the app hides hair at the same hat line the art fits hats to', () => {
  for (const face of g.FACE_SHAPES) {
    const m = new RegExp(`${face}:\\s*([\\d.]+)`).exec(PARTS.slice(PARTS.indexOf('HAT_LINE')));
    assert.strictEqual(Number(m[1]), g.hatLine(face), `${face}: app ${m[1]} vs art ${g.hatLine(face)}`);
  }
});

test('only hats worn OVER the head hide the hair; a crown is worn in it', () => {
  const over = tsList(PARTS, 'HATS_OVER_HAIR');
  over.forEach(h => assert.ok(wardrobe('hat').includes(h), `${h} is not a hat`));
  assert.ok(!over.includes('crown'));
});

test('no colour a child chooses is baked into the art', () => {
  // Every one must arrive as a variable, or changing it would do nothing
  // Scoped to the child's OWN parts. Items may share a colour with a choice —
  // the cap is the red of the red hair — and that is baked in on purpose.
  const chosen = [...tsList(MODEL, 'SKIN_TONES'), ...tsList(MODEL, 'HAIR_COLOURS'), ...tsList(MODEL, 'EYE_COLOURS')];
  const own = [...SVG.matchAll(/<g id="((?:face|ears|hair|hair-back|eyes|brows)[^"]*)">([\s\S]*?)<\/g>\n/g)];
  assert.ok(own.length > 40, 'the child\'s own parts were found');
  const baked = [];
  for (const [, id, body] of own) {
    chosen.filter(c => body.toLowerCase().includes(c.toLowerCase())).forEach(c => baked.push(`${id}: ${c}`));
  }
  assert.deepStrictEqual(baked, [], 'a child-chosen colour is hard-coded in their own parts');
  for (const face of g.FACE_SHAPES) {
    const group = SVG.slice(SVG.indexOf(`<g id="face-${face}"`), SVG.indexOf('</g>', SVG.indexOf(`<g id="face-${face}"`)));
    assert.ok(group.includes('var(--skin)'), `face-${face} is not coloured by --skin`);
  }
  assert.ok(SVG.includes('var(--hair)') && SVG.includes('var(--eye)'));
});

test('the service worker precaches the parts at install', () => {
  const sw = read('service-worker.js');
  const shell = /const SHELL = \[([\s\S]*?)\];/.exec(sw)[1];
  assert.ok(shell.includes('./assets/avatar/parts.svg'), 'parts.svg is only cached on first use');
});

test('nothing but the sprite lives in assets/avatar', () => {
  // A preview page left here would ship to every child
  const files = fs.readdirSync(path.join(APP, 'assets', 'avatar'));
  assert.deepStrictEqual(files, ['parts.svg']);
});


test('every hair style has a silhouette of its own on every face', () => {
  for (const face of g.FACE_SHAPES) {
    const prints = g.HAIR_STYLES.map(style => {
      const shapes = [g.hairFront(face, style).polygon, ...g.hairBack(face, style)];
      const all = shapes.flat();
      const box = [Math.min(...all.map(p => p.x)), Math.min(...all.map(p => p.y)),
        Math.max(...all.map(p => p.x)), Math.max(...all.map(p => p.y))];
      return box.map(v => Math.round(v)).join(',') + '/' + shapes.length + '/' + g.hairFront(face, style).fringe.map(p => Math.round(p.y)).join('');
    });
    assert.strictEqual(new Set(prints).size, g.HAIR_STYLES.length, `${face}: two styles draw the same shape`);
  }
});

test('all hair stays on the canvas the character is drawn in', () => {
  for (const { face, style } of COMBOS) {
    const all = [g.hairFront(face, style).polygon, ...g.hairBack(face, style)].flat();
    for (const p of all) {
      assert.ok(p.x > -6 && p.x < 106 && p.y > -6, `${style} on ${face} leaves the canvas at (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`);
    }
  }
});
