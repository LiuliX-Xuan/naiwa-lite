import test from 'node:test';
import assert from 'node:assert/strict';
import * as modelEffects from '../src/model-effects.js';

const { getGroundPlaneY, getMobileSceneComposition, getParticleColor, getParticleOffset, getPointerNdc, getScrollSceneState } = modelEffects;

test('particle palette keeps dark and green texture accents', () => {
  const pupil = getParticleColor({ r: 0.08, g: 0.12, b: 0.03 });
  const eyeRing = getParticleColor({ r: 0.46, g: 0.72, b: 0.38 });

  assert.ok(pupil.r < 0.2 && pupil.g < 0.2 && pupil.b < 0.1);
  assert.ok(eyeRing.g > eyeRing.r && eyeRing.g > eyeRing.b);
});

test('particle interaction preserves the original silhouette', () => {
  const home = { x: 0.5, y: 0.4, z: 0.2 };
  const far = getParticleOffset(home, { x: -2, y: -2, z: 0 }, 1200, 12);
  assert.ok(Math.hypot(far.x, far.y, far.z) <= 0.012);

  const near = getParticleOffset(home, { x: 0.52, y: 0.42, z: 0.2 }, 1200, 12);
  assert.ok(Math.hypot(near.x, near.y, near.z) > 0.2);
  assert.ok(Math.hypot(near.x, near.y, near.z) <= 0.34);
});

test('pointer mapping keeps screen-up aligned with raycasting-up', () => {
  const top = getPointerNdc(50, 0, 100, 100);
  const bottom = getPointerNdc(50, 100, 100, 100);

  assert.equal(top.x, 0);
  assert.equal(top.y, 1);
  assert.equal(bottom.y, -1);
});

test('scroll state keeps the particle field active and rotates continuously', () => {
  const before = getScrollSceneState(0.1);
  const morph = getScrollSceneState(0.62);
  const field = getScrollSceneState(0.76);
  const end = getScrollSceneState(1);

  assert.equal(before.morph, 0);
  assert.ok(morph.morph > 0.9);
  assert.equal(field.morph, 1);
  assert.ok(field.field > 0.9);
  assert.equal(end.morph, 1);
  assert.equal(end.field, 1);
  assert.equal(end.burst, 1);
  assert.equal(end.returnPhase, 0);
  assert.ok(end.rotation > morph.rotation);
});

test('mobile form framing clears room for the origin copy', () => {
  const initial = getMobileSceneComposition(0);
  const form = getMobileSceneComposition(0.17);
  const later = getMobileSceneComposition(0.45);

  assert.equal(initial.x, 0);
  assert.ok(form.x > 0.8);
  assert.ok(form.scale < 1);
  assert.equal(later.x, 0);
});

test('ground plane follows the normalized model bottom as the scene moves and scales', () => {
  assert.equal(getGroundPlaneY(-1.42, -0.2, 1), -1.64);
  assert.ok(Math.abs(getGroundPlaneY(-1.42, 0.31, 0.82) - -0.8744) < 1e-10);
});

test('particle story does not retain the retired photo-film animation state', () => {
  assert.equal('getFilmStripState' in modelEffects, false);
});
