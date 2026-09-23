const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

/**
 * Holds the game to its own theme.
 *
 * The particle field is the one piece of art anyone has praised, and the
 * design tokens in src/styles.css already took their accents from it. But
 * the theme was adopted by six stylesheets and skipped by fourteen, which
 * carried 73 hard-coded light fills between them — so on a phone, most of
 * the game was white forms stuck to a dark starfield. Nothing ever said so,
 * because nothing checked. This checks.
 *
 * Two rules, both read from the REAL files rather than from a copy:
 *   1. No component may hard-code a LIGHT BACKGROUND. It uses a token, so
 *      one decision in styles.css governs every surface in the game.
 *   2. Every text colour the tokens pair with a surface clears WCAG AA on
 *      it. "Prettier must never mean harder to read" is a rule, so it gets
 *      a test rather than a reviewer's memory.
 */

const ROOT = path.join(__dirname, '..');
const STYLES = path.join(ROOT, 'src', 'styles.css');
const APP = path.join(ROOT, 'src', 'app');

/**
 * Stylesheets allowed light fills, each with the reason. Keep this short: an
 * entry here is a place the theme does not reach.
 */
const EXEMPT = {
  // ART, not chrome: these ARE the euro coins — bronze, gold and silver
  // faces. A silver coin is supposed to be light.
  'money/coins.component.css': 'depicts real coins',
  // Dead: nothing imports src/app/app/, so it is not in the bundle. It is on
  // the roadmap to delete; until then it is not the game.
  'app/app.component.css': 'dead code, not in the bundle'
};

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : entry.name.endsWith('.css') ? [full] : [];
  });
}

/** Channels of a colour literal, or null if it is not one we can read. */
function channels(literal) {
  const named = { white: [255, 255, 255], snow: [255, 250, 250], ivory: [255, 255, 240] };
  const lower = literal.toLowerCase();
  if (named[lower]) {
    return { rgb: named[lower], alpha: 1 };
  }
  let match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(lower);
  if (match) {
    let d = match[1];
    if (d.length === 3) d = d.split('').map(c => c + c).join('');
    return { rgb: [0, 2, 4].map(i => parseInt(d.slice(i, i + 2), 16)), alpha: 1 };
  }
  match = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(lower);
  if (match) {
    return {
      rgb: [match[1], match[2], match[3]].map(Number),
      alpha: match[4] === undefined ? 1 : Number(match[4])
    };
  }
  return null;
}

function luminance([r, g, b]) {
  const c = v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
}

/**
 * Light enough to read as a white card on the dark field. Translucent white
 * counts once it is opaque enough to dominate what is behind it: a 5% white
 * wash is a highlight, a 92% one is a white card.
 */
function isLightFill(literal) {
  const parsed = channels(literal);
  return !!parsed && parsed.alpha >= 0.5 && luminance(parsed.rgb) >= 0.75;
}

const COLOUR = /#[0-9a-fA-F]{3,6}\b|rgba?\([^)]*\)|\b(?:white|snow|ivory)\b/g;

/** Every `background*` declaration that paints a light fill, with its line. */
function lightFills(file) {
  const css = stripComments(fs.readFileSync(file, 'utf8'));
  const found = [];
  css.split('\n').forEach((line, index) => {
    const declaration = /^\s*background(?:-color|-image)?\s*:(.*)$/i.exec(line);
    if (!declaration) return;
    for (const literal of declaration[1].match(COLOUR) || []) {
      if (isLightFill(literal)) {
        found.push(`${index + 1}: ${line.trim()}`);
        break;
      }
    }
  });
  return found;
}

/** The custom properties declared in :root, as name -> value. */
function tokens() {
  const css = stripComments(fs.readFileSync(STYLES, 'utf8'));
  const root = /:root\s*\{([\s\S]*?)\}/.exec(css);
  assert.ok(root, 'styles.css has a :root block');
  const out = {};
  for (const m of root[1].matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    out[m[1]] = m[2].trim();
  }
  return out;
}

function contrast(a, b) {
  const la = luminance(channels(a).rgb);
  const lb = luminance(channels(b).rgb);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

test('no component paints a light background of its own', () => {
  const offenders = {};
  for (const file of walk(APP)) {
    const relative = path.relative(APP, file).split(path.sep).join('/');
    if (EXEMPT[relative]) continue;
    const found = lightFills(file);
    if (found.length) offenders[relative] = found;
  }
  assert.deepStrictEqual(
    offenders,
    {},
    'these stylesheets hard-code a light fill instead of using a token from src/styles.css:\n'
      + JSON.stringify(offenders, null, 2)
  );
});

/** Every `color:` declaration that hard-codes DARK text, with its line. */
function darkText(file) {
  const css = stripComments(fs.readFileSync(file, 'utf8'));
  const found = [];
  css.split('\n').forEach((line, index) => {
    const declaration = /^\s*color\s*:\s*(#[0-9a-fA-F]{3,6}\b|rgba?\([^)]*\))/i.exec(line);
    if (!declaration) return;
    const parsed = channels(declaration[1]);
    if (parsed && parsed.alpha >= 0.5 && luminance(parsed.rgb) < 0.2) {
      found.push(`${index + 1}: ${line.trim()}`);
    }
  });
  return found;
}

test('no component hard-codes dark text either', () => {
  // The other half of the same failure. Darkening a background leaves any
  // dark text on it INVISIBLE, and the fill check above cannot see that.
  // This caught a live one: the "Deleted" confirmation on the grown-ups'
  // screen was #1f6b3a on a dark panel. Dark text belongs on a reading face,
  // and there it comes from --text-read, so a literal here is always a bug.
  const offenders = {};
  for (const file of walk(APP)) {
    const relative = path.relative(APP, file).split(path.sep).join('/');
    if (EXEMPT[relative]) continue;
    const found = darkText(file);
    if (found.length) offenders[relative] = found;
  }
  assert.deepStrictEqual(offenders, {}, 'hard-coded dark text:\n' + JSON.stringify(offenders, null, 2));
});

test('every exemption still names a file that exists', () => {
  // An exemption for a deleted file is a hole nobody can see
  for (const relative of Object.keys(EXEMPT)) {
    assert.ok(fs.existsSync(path.join(APP, relative)), `exempt file is gone: ${relative}`);
  }
});

test('the detector itself tells light from dark', () => {
  // A guard that cannot fail proves nothing, so prove it can
  for (const light of ['white', '#fff', '#ffffff', '#eef0ff', '#fdf2ff', 'rgba(255, 255, 255, 0.92)']) {
    assert.ok(isLightFill(light), `${light} should read as a light fill`);
  }
  for (const dark of ['#1b1733', '#241f42', 'transparent', 'rgba(255, 255, 255, 0.05)', '#3880ff']) {
    assert.ok(!isLightFill(dark), `${dark} should not read as a light fill`);
  }
});

test('text on the dark chrome clears WCAG AA', () => {
  const t = tokens();
  for (const surface of ['surface', 'surface-raised']) {
    for (const text of ['text', 'text-dim']) {
      const ratio = contrast(t[text], t[surface]);
      assert.ok(ratio >= 4.5, `--${text} on --${surface} is ${ratio.toFixed(2)}:1, needs 4.5`);
    }
  }
});

test('text on a reading face clears WCAG AA — the sum stays legible', () => {
  const t = tokens();
  for (const surface of ['surface-read', 'surface-read-press']) {
    for (const text of ['text-read', 'text-read-dim', 'good', 'bad']) {
      const ratio = contrast(t[text], t[surface]);
      assert.ok(ratio >= 4.5, `--${text} on --${surface} is ${ratio.toFixed(2)}:1, needs 4.5`);
    }
  }
});

test('the magentas each clear AA where they are used as words', () => {
  const t = tokens();
  // On the dark chrome: a suggestion line under a grade or difficulty card
  for (const surface of ['surface', 'surface-raised']) {
    const ratio = contrast(t['accent-magenta-text'], t[surface]);
    assert.ok(ratio >= 4.5, `--accent-magenta-text on --${surface} is ${ratio.toFixed(2)}:1`);
  }
  // On a reading face: the minus and delete keys
  for (const surface of ['surface-read', 'surface-read-action', 'surface-read-press']) {
    const ratio = contrast(t['accent-magenta-read'], t[surface]);
    assert.ok(ratio >= 4.5, `--accent-magenta-read on --${surface} is ${ratio.toFixed(2)}:1`);
  }
});

test('the sum itself clears AA — numbers, operator and equals sign', () => {
  // The line a child actually reads. Before this the equals sign was green at
  // 2.78:1 and the operator orange at 3.16:1: both failed AA, the first even
  // as large text. Pinned so no restyle can quietly bring that back.
  const t = tokens();
  for (const part of ['accent-blue-read', 'accent-magenta-read', 'text-read-dim']) {
    const ratio = contrast(t[part], t['surface-read']);
    assert.ok(ratio >= 4.5, `--${part} on --surface-read is ${ratio.toFixed(2)}:1`);
  }
});

test('links, and right and wrong, read as words on the dark chrome', () => {
  const t = tokens();
  for (const text of ['accent-blue-text', 'good-on-dark', 'bad-on-dark']) {
    for (const surface of ['surface', 'surface-raised']) {
      const ratio = contrast(t[text], t[surface]);
      assert.ok(ratio >= 4.5, `--${text} on --${surface} is ${ratio.toFixed(2)}:1`);
    }
  }
});

test('right and wrong each read on their own tinted face', () => {
  const t = tokens();
  assert.ok(contrast(t.good, t['good-read-surface']) >= 4.5, 'correct feedback');
  assert.ok(contrast(t.bad, t['bad-read-surface']) >= 4.5, 'wrong feedback');
});

test('the field\'s own magenta would NOT have been enough as text, which is why the others exist', () => {
  // Pins the reason. If someone "simplifies" back to the accent, this says why not
  const t = tokens();
  assert.ok(contrast(t['accent-magenta'], t['surface-read-action']) < 4.5);
});

test('a reading face is light and chrome is dark, so the two never swap', () => {
  const t = tokens();
  assert.ok(luminance(channels(t['surface-read']).rgb) > 0.75, 'a reading face stays light');
  assert.ok(luminance(channels(t.surface).rgb) < 0.05, 'chrome stays dark');
});

module.exports = { isLightFill, lightFills, contrast };
