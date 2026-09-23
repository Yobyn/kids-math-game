/**
 * What the page actually says, checked against what the code believes it says.
 *
 * `src/index.html` is not compiled and no unit test reads it, so the two can
 * drift silently: `screen-fit.ts` exports VIEWPORT_CONTENT and the unit tests
 * assert things about that CONSTANT, which proves nothing about the meta tag
 * the browser reads. The roadmap has carried "what is NOT pinned: index.html
 * itself" since the viewport work landed. This is the pin.
 *
 * It matters for two decisions that are invisible until a real device runs
 * them: viewport-fit=cover is what makes env(safe-area-inset-*) return
 * anything but 0px, and the absence of user-scalable=no is what keeps pinch
 * zoom — WCAG 1.4.4 — working for a low-vision player.
 *
 * Plain Node and no dependencies, like the other script tests, so it runs in
 * CI without a browser.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function indexHtml() {
  return fs.readFileSync(path.join(ROOT, 'src', 'index.html'), 'utf8');
}

/** The constant the app's own code reasons about, read out of the TypeScript. */
function declaredViewport() {
  const source = fs.readFileSync(
    path.join(ROOT, 'src', 'app', 'layout', 'screen-fit.ts'), 'utf8');
  const match = source.match(/export const VIEWPORT_CONTENT = '([^']*)'/);
  assert.ok(match, 'screen-fit.ts no longer exports VIEWPORT_CONTENT as a literal');
  return match[1];
}

/** The content attribute of the viewport meta tag, as the browser would read it. */
function viewportMeta(html) {
  const match = html.match(/<meta\s+name="viewport"\s+content="([^"]*)"\s*\/?>/i);
  assert.ok(match, 'index.html has no viewport meta tag');
  return match[1];
}

test('the viewport meta tag says exactly what the code thinks it says', () => {
  assert.strictEqual(viewportMeta(indexHtml()), declaredViewport());
});

test('safe-area insets are asked for', () => {
  // Without viewport-fit=cover, env(safe-area-inset-*) resolves to 0px and
  // every safe-area rule in the stylesheets is dead code that looks alive
  assert.match(viewportMeta(indexHtml()), /viewport-fit=cover/);
});

test('pinch zoom is left alone', () => {
  const viewport = viewportMeta(indexHtml());

  assert.doesNotMatch(viewport, /user-scalable/);
  assert.doesNotMatch(viewport, /maximum-scale/);
});

test('there is exactly one viewport meta tag to believe', () => {
  const all = indexHtml().match(/<meta\s+name="viewport"/gi) || [];

  assert.strictEqual(all.length, 1);
});
