import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getElasticDisplacements, getSpectacleScrollState } from '../src/interactive-effects.js';
import { mountPointerResponses, mountTextInteractions } from '../src/text-interactions.js';

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

test('story exposes elastic words, magnetic targets, and fluid-trail targets', async () => {
  const page = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(page, /data-elastic-text/);
  assert.match(page, /data-magnetic/);
  assert.match(page, /data-trail-target/);
  assert.equal((page.match(/data-elastic-text/g) || []).length, 13);
});

test('text interaction module exposes elastic and pointer mounts', () => {
  assert.equal(typeof mountTextInteractions, 'function');
  assert.equal(typeof mountPointerResponses, 'function');
});

test('style layer includes ripple, kinetic grid, fluid trail, elastic return, and reading response', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.match(styles, /\.ripple-field/);
  assert.match(styles, /\.kinetic-grid/);
  assert.match(styles, /\.fluid-trail/);
  assert.match(styles, /\.elastic-text\.is-returning/);
  assert.match(styles, /\[data-reading-sweep\]/);
  assert.match(styles, /\.type-line\s*\{[^}]*overflow:\s*visible/);
});

test('elastic text styling follows the mounted data attribute', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.match(styles, /\[data-elastic-text\]\.is-returning/);
  assert.match(styles, /\[data-elastic-text\]\[data-trail-target\]\s*\{[^}]*cursor:\s*grab/);
  assert.match(styles, /\[data-elastic-text\]\.is-returning\s+\.elastic-glyph\s*\{[^}]*transition-duration:\s*\.78s/);
});

test('major supporting readouts remain interactive alongside the display text', async () => {
  const page = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  for (const className of ['hero-note', 'hero-side-note', 'scroll-cue', 'origin-legend', 'material-orbit', 'signal-footer', 'release-footer', 'hud']) {
    assert.match(page, new RegExp(`class="${className}"[^>]*data-(?:magnetic|trail-target)`));
  }
});
