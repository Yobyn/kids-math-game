// The game's layers, read from the REAL stylesheets: the particle field under
// every screen, and the tap layer over every screen. A unit test cannot see
// this — a component spec renders the layer alone, outside `app-root`, where
// the global rule that once pushed it under the whole game does not apply.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function cssFiles(dir) {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) return cssFiles(rel);
    return entry.name.endsWith('.css') ? [rel] : [];
  });
}

const TAP_CSS = 'src/app/particles/tap-sparks.component.css';
const hostRule = css => (css.match(/:host\s*{([^}]*)}/) || [])[1] || '';
const zIndexOf = rule => Number((rule.match(/z-index:\s*(-?\d+)/) || [])[1]);

test('the tap layer is above every other layer in the game', () => {
  const tapZ = zIndexOf(hostRule(read(TAP_CSS)));
  assert.ok(Number.isFinite(tapZ), 'tap layer declares a z-index');
  const others = cssFiles('src').filter(file => path.normalize(file) !== path.normalize(TAP_CSS));
  for (const file of others) {
    for (const match of read(file).matchAll(/z-index:\s*(-?\d+)/g)) {
      assert.ok(Number(match[1]) < tapZ, `${file} has z-index ${match[1]}, at or above the tap layer's ${tapZ}`);
    }
  }
});

test('the tap layer never takes a tap, and neither does the field', () => {
  assert.match(hostRule(read(TAP_CSS)), /pointer-events:\s*none/);
  assert.match(hostRule(read('src/app/particles/particles.component.css')), /pointer-events:\s*none/);
  assert.match(hostRule(read(TAP_CSS)), /position:\s*fixed/);
});

test('the global "screens above the field" rule leaves both layers alone', () => {
  const styles = read('src/styles.css');
  const rules = [...styles.matchAll(/(app-root\s*>\s*\*[^{]*){([^}]*)}/g)];
  assert.ok(rules.length > 0, 'the rule still exists');
  for (const [, selector, body] of rules) {
    if (!/z-index|position/.test(body)) continue;
    assert.match(selector, /:not\(app-particles\)/, `${selector.trim()} would lift the field over the game`);
    assert.match(selector, /:not\(app-tap-sparks\)/, `${selector.trim()} would push the tap layer under the game`);
  }
});

test('the field is drawn first and the tap layer last', () => {
  const html = read('src/app/app.component.html').replace(/<!--[\s\S]*?-->/g, '');
  const tags = [...html.matchAll(/<(app-[a-z-]+|router-outlet|header|div|ng-container)\b[^>]*>/g)].map(m => m[0]);
  assert.match(tags[0], /^<app-particles/);
  // The tap layer is loaded into this placeholder, so it lands after everything
  assert.match(tags[tags.length - 1], /^<ng-container #tapLayer/);
});

test('the tap layer is not in the first load: nothing eager imports it', () => {
  const eager = ['src/app/app.module.ts', 'src/app/shared/shared.module.ts']
    .filter(file => fs.existsSync(path.join(root, file)));
  for (const file of eager) {
    assert.doesNotMatch(read(file), /tap-sparks/, `${file} would put the tap layer in the first load`);
  }
  const shell = read('src/app/app.component.ts');
  assert.match(shell, /import\(\s*'\.\/particles\/tap-sparks\.module'\s*\)/);
  assert.doesNotMatch(shell, /^import .*tap-sparks/m);
});
