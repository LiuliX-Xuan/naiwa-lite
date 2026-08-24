import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getElasticDisplacements, getSpectacleScrollState } from '../src/interactive-effects.js';
import { mountOriginComponents, mountPointerResponses, mountTextInteractions } from '../src/text-interactions.js';

test('elastic displacement keeps the dragged glyph strongest and fades across neighbours', () => {
  const offsets = getElasticDisplacements({ length: 5, activeIndex: 2, dragX: 42, dragY: -18, follow: 10 });

  assert.equal(offsets.length, 5);
  assert.equal(offsets[2].x, 42);
  assert.equal(offsets[2].y, -18);
  assert.ok(Math.abs(offsets[1].x) > Math.abs(offsets[0].x));
  assert.ok(Math.abs(offsets[3].y) > Math.abs(offsets[4].y));
});

test('spectacle scroll state reserves the tunnel for the release range', () => {
  const hero = getSpectacleScrollState(0);
  const signal = getSpectacleScrollState(0.7);
  const release = getSpectacleScrollState(0.94);

  assert.ok(hero.ripple > 0.4);
  assert.ok(hero.ripple <= 0.5);
  assert.equal(hero.grid, 0);
  assert.ok(signal.grid > 0.5);
  assert.equal(signal.tunnel, 0);
  assert.ok(release.tunnel > 0.7);
});

test('story exposes elastic words and magnetic targets without a pointer ripple layer', async () => {
  const page = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(page, /data-elastic-text/);
  assert.match(page, /data-magnetic/);
  assert.match(page, /data-trail-target/);
  assert.match(page, /fluid-trail/);
  assert.doesNotMatch(page, /ripple-field/);
  assert.equal((page.match(/data-elastic-text/g) || []).length, 13);
});

test('text interaction module exposes elastic and pointer mounts', () => {
  assert.equal(typeof mountTextInteractions, 'function');
  assert.equal(typeof mountPointerResponses, 'function');
});

test('origin chapter uses linked profile tabs and trait cards as interactive content components', async () => {
  const page = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const interactions = await readFile(new URL('../src/text-interactions.js', import.meta.url), 'utf8');

  assert.match(page, /class="origin-profile"/);
  assert.match(page, /class="origin-traits"/);
  assert.equal((page.match(/data-origin-tab=/g) || []).length, 6);
  assert.match(page, /role="tablist"/);
  assert.equal(typeof mountOriginComponents, 'function');
  assert.match(interactions, /origin-profile-detail/);
});

test('GSAP entrance layer sequences hero reveal and reversible chapter entry', async () => {
  const motion = await readFile(new URL('../src/motion-effects.js', import.meta.url), 'utf8').catch(() => '');

  assert.match(motion, /gsap\.timeline/);
  assert.match(motion, /ScrollTrigger/);
  assert.match(motion, /playIntro/);
  assert.match(motion, /prefers-reduced-motion/);
});

test('text and hover interactions use GSAP for responsive transform motion', async () => {
  const interactions = await readFile(new URL('../src/text-interactions.js', import.meta.url), 'utf8');

  assert.match(interactions, /gsap\.quickTo/);
  assert.match(interactions, /elastic\.out/);
});

test('elastic drag uses synchronous GSAP setters and blocks native text selection', async () => {
  const interactions = await readFile(new URL('../src/text-interactions.js', import.meta.url), 'utf8');
  const pointerdownStart = interactions.indexOf("element.addEventListener('pointerdown'");
  const pointermoveStart = interactions.indexOf("element.addEventListener('pointermove'");
  const pointerupStart = interactions.indexOf("element.addEventListener('pointerup', release)");
  const pointerdown = interactions.slice(pointerdownStart, pointermoveStart);
  const pointermove = interactions.slice(pointermoveStart, pointerupStart);

  assert.ok(pointerdownStart >= 0);
  assert.match(interactions, /gsap\.quickSetter/);
  assert.doesNotMatch(pointerdown, /gsap\.killTweensOf\(glyphs\)/);
  assert.match(pointerdown, /event\.preventDefault\(\)/);
  assert.match(interactions, /function resolveElasticGlyph[\s\S]*getBoundingClientRect/);
  assert.match(pointerdown, /event\.clientX/);
  assert.match(pointermove, /event\.preventDefault\(\)/);
});

test('style layer keeps the kinetic grid and cursor trail without a pointer ripple', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.match(styles, /\.kinetic-grid/);
  assert.match(styles, /\.fluid-trail/);
  assert.doesNotMatch(styles, /\.ripple-field/);
  assert.doesNotMatch(styles, /--pointer-x/);
  assert.doesNotMatch(styles, /--pointer-y/);
  assert.match(styles, /\.elastic-text\.is-returning/);
  assert.match(styles, /\[data-reading-sweep\]/);
  assert.match(styles, /\.type-line\s*\{[^}]*overflow:\s*visible/);
});

test('chapter display keeps the editorial art layer visible before scroll reveal', async () => {
  const motion = await readFile(new URL('../src/motion-effects.js', import.meta.url), 'utf8');

  assert.match(motion, /'--chapter-display-opacity':\s*0\.24/);
  assert.match(motion, /'--chapter-display-opacity':\s*displayOpacity/);
});

test('pointer responses retain cursor trail and reading interactions without CSS coordinate state', async () => {
  const interactions = await readFile(new URL('../src/text-interactions.js', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.match(interactions, /fluid-trail/);
  assert.match(interactions, /gsap\.quickTo/);
  assert.match(interactions, /data-trail-target/);
  assert.match(interactions, /\[data-reading-sweep\]/);
  assert.doesNotMatch(interactions, /--trail-x/);
  assert.doesNotMatch(interactions, /--trail-y/);
  assert.doesNotMatch(interactions, /--pointer-x/);
  assert.doesNotMatch(interactions, /--pointer-y/);
  assert.doesNotMatch(styles, /--trail-x/);
  assert.doesNotMatch(styles, /--trail-y/);
});

test('elastic text styling follows the mounted data attribute', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.match(styles, /\[data-elastic-text\]\.is-returning/);
  assert.match(styles, /\[data-elastic-text\]\[data-trail-target\]\s*\{[^}]*cursor:\s*grab/);
  assert.match(styles, /\[data-elastic-text\]\.is-returning\s+\.elastic-glyph\s*\{[^}]*transition-duration:\s*\.78s/);
});

test('major supporting readouts remain interactive alongside the display text', async () => {
  const page = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  for (const className of ['hero-note', 'hero-side-note', 'scroll-cue', 'material-orbit', 'signal-footer', 'release-footer', 'hud']) {
    assert.match(page, new RegExp(`class="${className}"[^>]*data-(?:magnetic|trail-target)`));
  }
  assert.match(page, /class="origin-trait is-active"[^>]*data-magnetic[^>]*data-trail-target/);
});

test('HUD removes the floating scroll value and progress meter', async () => {
  const page = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const entry = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.doesNotMatch(page, /id="scroll-label"/);
  assert.doesNotMatch(page, /id="meter-fill"/);
  assert.doesNotMatch(entry, /scrollLabel/);
  assert.doesNotMatch(entry, /meterFill/);
  assert.doesNotMatch(styles, /\.hud-meter/);
  assert.doesNotMatch(styles, /#meter-fill/);
});

test('initial loading guard prevents the raw story flash before GSAP takes over', async () => {
  const page = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const entry = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.match(page, /document\.documentElement\.classList\.add\('app-loading'\)/);
  assert.match(entry, /classList\.remove\('app-loading'\)/);
  assert.match(styles, /html\.app-loading\s+\.story/);
});

test('model entrance uses a soft-gel settle without driving particle release', async () => {
  const entry = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  const introStart = entry.indexOf('function playModelIntro');
  const introEnd = entry.indexOf('\n}\n\nfunction syncIntroState', introStart);
  const intro = entry.slice(introStart, introEnd);

  assert.ok(introStart >= 0);
  assert.match(intro, /modelEntrance/);
  assert.match(intro, /squash/);
  assert.match(intro, /elastic\.out/);
  assert.match(intro, /opacity:\s*1/);
  assert.doesNotMatch(intro, /uBurst/);
  assert.doesNotMatch(intro, /particleSystem/);
});
