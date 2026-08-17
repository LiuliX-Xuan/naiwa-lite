import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { acceleratedRaycast } from 'three-mesh-bvh';
import * as modelEffects from '../src/model-effects.js';
import { enableMeshRaycastAcceleration } from '../src/mesh-raycast.js';

const {
  getGroundPlaneY,
  getBurstProgressStep,
  getInteractionResponseStep,
  getMobileSceneComposition,
  getParticleColor,
  getParticleOffset,
  getPointerNdc,
  getRenderPixelRatio,
  getScrollSceneState,
  getScrollTransitionStep,
  shouldRenderFormShadows,
  shouldUpdateParticlePointer
} = modelEffects;

test('particle palette keeps dark and green texture accents', () => {
  const pupil = getParticleColor({ r: 0.08, g: 0.12, b: 0.03 });
  const eyeRing = getParticleColor({ r: 0.46, g: 0.72, b: 0.38 });

  assert.ok(pupil.r < 0.2 && pupil.g < 0.2 && pupil.b < 0.1);
  assert.ok(eyeRing.g > eyeRing.r && eyeRing.g > eyeRing.b);
});

test('entry avoids shipping a full Chinese display font before the 3D scene loads', async () => {
  const entry = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.doesNotMatch(entry, /@fontsource\/noto-serif-sc/);
  assert.doesNotMatch(styles, /Noto Serif SC/);
});

test('editorial typography keeps headings readable while adding a scroll-linked art direction layer', async () => {
  const page = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.match(page, /class="type-line"/);
  assert.match(page, /class="type-line type-line-final"/);
  assert.match(page, /data-display="ORIGIN"/);
  assert.match(styles, /\.hero-title::after/);
  assert.match(styles, /animation-timeline: view\(\)/);
  assert.match(styles, /html, body \{[^}]*overflow-x: hidden/);
  assert.match(styles, /font-size: clamp\(34px, 9\.7vw, 38px\)/);
});

test('particle interaction preserves the original silhouette', () => {
  const home = { x: 0.5, y: 0.4, z: 0.2 };
  const far = getParticleOffset(home, { x: -2, y: -2, z: 0 }, 1200, 12);
  assert.ok(Math.hypot(far.x, far.y, far.z) <= 0.012);

  const near = getParticleOffset(home, { x: 0.52, y: 0.42, z: 0.2 }, 1200, 12);
  assert.ok(Math.hypot(near.x, near.y, near.z) > 0.2);
  assert.ok(Math.hypot(near.x, near.y, near.z) <= 0.34);
});

test('particle interaction follows promptly and releases without an instant snap-back', () => {
  assert.equal(typeof getInteractionResponseStep, 'function');

  const entered = getInteractionResponseStep({ current: 0, target: 1, deltaSeconds: 0.05 });
  const released = getInteractionResponseStep({ current: 1, target: 0, deltaSeconds: 0.05 });
  let stepped = 0;
  for (let index = 0; index < 5; index += 1) {
    stepped = getInteractionResponseStep({ current: stepped, target: 1, deltaSeconds: 0.02 });
  }
  const oneFrame = getInteractionResponseStep({ current: 0, target: 1, deltaSeconds: 0.1 });

  assert.ok(entered > 0.45);
  assert.ok(released > 0.8);
  assert.ok(Math.abs(stepped - oneFrame) < 1e-10);
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

test('render pixel ratio protects mobile and high-density displays', () => {
  assert.equal(getRenderPixelRatio(3, 1440), 1.5);
  assert.equal(getRenderPixelRatio(2, 390), 1.25);
  assert.equal(getRenderPixelRatio(1, 390), 1);
});

test('pointer raycasts only run when a visible particle scene needs a refresh', () => {
  assert.equal(shouldUpdateParticlePointer({ hasPointer: false, morph: 1, pointerMoved: true, sceneMoved: true }), false);
  assert.equal(shouldUpdateParticlePointer({ hasPointer: true, morph: 0.02, pointerMoved: true, sceneMoved: true }), false);
  assert.equal(shouldUpdateParticlePointer({ hasPointer: true, morph: 0.3, pointerMoved: false, sceneMoved: false }), false);
  assert.equal(shouldUpdateParticlePointer({ hasPointer: true, morph: 0.3, pointerMoved: true, sceneMoved: false }), true);
  assert.equal(shouldUpdateParticlePointer({ hasPointer: true, morph: 0.3, pointerMoved: false, sceneMoved: true }), true);
});

test('form shadows turn off once the model dissolves into particles', () => {
  assert.equal(shouldRenderFormShadows(0, 0), true);
  assert.equal(shouldRenderFormShadows(0.06, 0), true);
  assert.equal(shouldRenderFormShadows(0.12, 0), false);
  assert.equal(shouldRenderFormShadows(0, 0.1), false);
});

test('burst animation follows reverse scroll promptly without becoming a jump cut', () => {
  let forward = 0;
  for (let index = 0; index < 5; index += 1) {
    forward = getBurstProgressStep({ current: forward, target: 1, deltaSeconds: 0.1 });
  }
  const reverse = getBurstProgressStep({ current: 0.5, target: 0.1, deltaSeconds: 0.1 });
  const delayedReverse = getBurstProgressStep({ current: 0.6, target: 0, deltaSeconds: 0.5 });

  assert.ok(forward > 0.3 && forward < 0.45);
  assert.ok(reverse < 0.44 && reverse > 0.1);
  assert.ok(delayedReverse < 0.1);
});

test('burst never continues expanding after the user reverses the scroll direction', () => {
  const paused = getBurstProgressStep({
    current: 0.42,
    target: 0.8,
    retreating: true,
    deltaSeconds: 0.1
  });
  const retracting = getBurstProgressStep({
    current: 0.42,
    target: 0.18,
    retreating: true,
    deltaSeconds: 0.1
  });

  assert.equal(paused, 0.42);
  assert.ok(retracting < 0.28);
});

test('scroll state catches up after a delayed frame instead of remaining stuck', () => {
  const normalFrame = getScrollTransitionStep({ current: 0, target: 1, deltaSeconds: 0.1, rate: 8 });
  const delayedFrame = getScrollTransitionStep({ current: 0, target: 1, deltaSeconds: 0.5, rate: 8 });

  assert.ok(normalFrame > 0.5 && normalFrame < 0.6);
  assert.ok(delayedFrame > normalFrame);
  assert.ok(delayedFrame < 1);
});

test('mesh raycast acceleration builds one BVH and replaces the mesh raycast handler', () => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());

  assert.equal(enableMeshRaycastAcceleration(mesh), true);
  assert.ok(mesh.geometry.boundsTree);
  assert.equal(mesh.raycast, acceleratedRaycast);
  assert.equal(enableMeshRaycastAcceleration(mesh), true);
});
