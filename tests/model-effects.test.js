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
  getModelDragRotation,
  getModelDragReturnStep,
  getMobileSceneComposition,
  getParticleColor,
  getParticleOffset,
  getPointerNdc,
  getRenderPixelRatio,
  getScrollSceneState,
  getScrollTransitionStep,
  getTunnelReleaseAmount,
  getInstrumentSceneState,
  shouldRenderFormShadows,
  shouldUpdateParticlePointer
} = modelEffects;

test('retired orbit field calculations are not retained in the model-effects API', () => {
  assert.equal('getFieldMotionState' in modelEffects, false);
  assert.equal('getReleaseCollapse' in modelEffects, false);
});

test('instrument state modulates the one-piece model without introducing horizontal translation', () => {
  assert.equal(typeof getInstrumentSceneState, 'function');

  const neutral = getInstrumentSceneState();
  const stance = getInstrumentSceneState({ origin: 'stance' });
  const expressive = getInstrumentSceneState({
    origin: 'voice',
    material: { roughness: 0.76, gloss: 0.8, softness: 0.7 },
    signal: { speed: 0.8, chaos: 0.75, touch: 0.6 },
    release: 'wide'
  });
  const matte = getInstrumentSceneState({ material: { roughness: 1, gloss: 0 } });
  const polished = getInstrumentSceneState({ material: { roughness: 0, gloss: 1 } });

  assert.equal(neutral.model.x, 0);
  assert.equal(neutral.model.yaw, 0);
  assert.equal(neutral.surface.roughness, 1);
  assert.equal(neutral.surface.glossLevel, 0);
  assert.equal(neutral.surface.distortion, 0);
  assert.equal(stance.model.x, 0);
  assert.notEqual(stance.model.yaw, 0);
  assert.notEqual(stance.light.x, 0);
  assert.ok(expressive.surface.roughnessShift > 0);
  assert.ok(expressive.surface.gloss > 0);
  assert.equal(matte.surface.roughness, 1);
  assert.equal(matte.surface.glossLevel, 0);
  assert.equal(polished.surface.roughness, 0);
  assert.equal(polished.surface.glossLevel, 1);
  assert.ok(expressive.surface.distortion > 0);
  assert.ok(expressive.particles.vibration > 0.2);
  assert.equal(expressive.particles.speed, 0.8);
  assert.equal(expressive.particles.randomness, 0.75);
  assert.equal(expressive.particles.interaction, 0.6);
  assert.ok(expressive.particles.previewOpacity > 0.1);
  assert.ok(expressive.typography.signal > 0.25);
});

test('Three scene consumes the spectacle state instead of the retired orbit field', async () => {
  const entry = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');

  assert.match(entry, /getSpectacleScrollState/);
  assert.match(entry, /const scrollState = getScrollSceneState\(smoothScroll\)/);
  assert.doesNotMatch(entry, /const scrollState = getScrollSceneState\(targetScroll\)/);
  assert.doesNotMatch(entry, /createInteractionField/);
  assert.match(entry, /--grid-opacity/);
  assert.match(entry, /surfaceRoughness: next\.surface\.roughness/);
  assert.match(entry, /surfaceGloss: next\.surface\.glossLevel/);
  assert.match(entry, /material\.shininess/);
  assert.match(entry, /material\.specular/);
  assert.match(entry, /Math\.pow\(surfaceGloss, 1\.5\)/);
  assert.match(entry, /Math\.pow\(1 - surfaceRoughness, 1\.65\)/);
});

test('particle shader exposes local distortion and tunnel controls', async () => {
  const entry = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');

  assert.match(entry, /uDistortion/);
  assert.match(entry, /uTunnel/);
  assert.match(entry, /tunnelDirection/);
});

test('model hit state does not promote a cursor ring overlay', async () => {
  const entry = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');

  assert.doesNotMatch(entry, /is-model-active/);
  assert.doesNotMatch(entry, /fluidTrail/);
});

test('particle palette keeps dark and green texture accents', () => {
  const pupil = getParticleColor({ r: 0.08, g: 0.12, b: 0.03 });
  const eyeRing = getParticleColor({ r: 0.46, g: 0.72, b: 0.38 });

  assert.ok(pupil.r < 0.2 && pupil.g < 0.2 && pupil.b < 0.1);
  assert.ok(eyeRing.g > eyeRing.r && eyeRing.g > eyeRing.b);
});

test('burst release is centered around the particle cloud', async () => {
  const { recenterVectorTriplets } = modelEffects;
  assert.equal(typeof recenterVectorTriplets, 'function');

  const offsets = recenterVectorTriplets(new Float32Array([2, 1, 0, -1, 0, 1, 0, 2, -1]));
  const mean = [0, 1, 2].map((axis) => offsets[axis] + offsets[axis + 3] + offsets[axis + 6]);
  mean.forEach((value) => assert.ok(Math.abs(value) < 1e-6));

  const entry = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(entry, /recenterVectorTriplets\(bursts\)/);
  assert.match(entry, /recenterVectorTriplets\(drifts\)/);
  assert.match(entry, /uParticleCenter/);
  assert.match(entry, /splatPosition -= uParticleCenter \* entered/);
  assert.match(entry, /float releaseSettle = 1\.0 - smoothstep\(0\.0, 0\.24, burstRelease\)/);
  assert.match(entry, /aDrift \* \(0\.035 \+ splash \* 1\.34\) \* releaseSettle/);
  assert.match(entry, /aNormal \* \(0\.016 \+ splash \* 0\.12 \+ breath\) \* releaseSettle/);
});

test('particle release uses the earlier wide burst profile while keeping gentle idle motion', async () => {
  const entry = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');

  assert.match(entry, /uTunnel \* \(1\.24 \+ aScale \* 0\.42\) \* releaseSettle/);
  assert.match(entry, /aBurst \* \(4\.7 \* burstRelease\)/);
  assert.match(entry, /float signalTime = uTime \* \(1\.0 \+ uParticleSpeed \* 8\.5\)/);
  assert.match(entry, /float speedFlow = sin\(aPhase \* 3\.7 \+ signalTime \* 0\.0018\)/);
  assert.match(entry, /signalTime \* 0\.00055/);
  assert.match(entry, /uTime \* 0\.00085/);
});

test('release motion breathes and swirls around the fixed particle center', async () => {
  const entry = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');

  assert.match(entry, /float releaseMotion = burstRelease \* sin\(uTime \* 0\.00135\)/);
  assert.match(entry, /vec3 centeredSwirl = vec3\(-aBurst\.y, aBurst\.x, 0\.0\)/);
  assert.match(entry, /splatPosition \+= aBurst \* \(releaseMotion \* 0\.075\)/);
  assert.match(entry, /splatPosition \+= centeredSwirl \* \(releaseSwirl \* 0\.035\)/);
  assert.match(entry, /float releasePulse = 1\.0 \+ sin\(uTime \* 0\.00135\) \* 0\.055 \* burstRelease/);
});

test('entry avoids shipping a full Chinese display font before the 3D scene loads', async () => {
  const entry = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.doesNotMatch(entry, /@fontsource\/noto-serif-sc/);
  assert.doesNotMatch(styles, /Noto Serif SC/);
});

test('editorial typography keeps headings readable while adding a scroll-linked art direction layer', async () => {
  const page = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const entry = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  const motion = await readFile(new URL('../src/motion-effects.js', import.meta.url), 'utf8').catch(() => '');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.match(page, /class="type-line"/);
  assert.match(page, /class="type-line type-line-final"/);
  assert.match(page, /data-display="ORIGIN"/);
  assert.match(entry, /mountMotionEffects/);
  assert.match(motion, /ScrollTrigger/);
  assert.match(styles, /\.hero-title::after/);
  assert.doesNotMatch(styles, /animation-timeline: view\(\)/);
  assert.match(styles, /ZCOOL KuaiLe/);
  assert.match(styles, /ZCOOL QingKe HuangYou/);
  assert.doesNotMatch(styles, /Chiron GoRound TC/);
  assert.match(styles, /--display:\s*'ZCOOL QingKe HuangYou',\s*'ZCOOL KuaiLe'/);
  assert.match(styles, /--display-weight: 400/);
  assert.match(styles, /--type-yellow: #d8b844/);
  assert.match(styles, /--type-yellow-soft: #aa984f/);
  assert.match(styles, /font-weight: var\(--display-weight\)/);
  assert.match(styles, /h2 em\s*\{[^}]*font-style: normal/);
  assert.match(styles, /\.hero-title::after\s*\{[^}]*font-family: var\(--display\)/);
  assert.match(styles, /-webkit-text-stroke: 0/);
  assert.match(styles, /-webkit-text-stroke: 1px rgba\(216, 184, 68, \.42\)/);
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

test('scroll state completes the entity-to-particle handoff inside the origin chapter', () => {
  const before = getScrollSceneState(0.15);
  const morph = getScrollSceneState(0.3);
  const material = getScrollSceneState(0.42);
  const release = getScrollSceneState(0.76);
  const end = getScrollSceneState(1);

  assert.equal(before.morph, 0);
  assert.ok(morph.morph > 0.4);
  assert.equal(material.morph, 1);
  assert.equal(release.morph, 1);
  assert.ok(release.field > 0.9);
  assert.equal(end.morph, 1);
  assert.equal(end.field, 1);
  assert.equal(end.burst, 1);
  assert.equal(end.returnPhase, 0);
  assert.ok(end.rotation > morph.rotation);
  assert.ok(release.rotation > Math.PI * 2);
  assert.ok(end.rotation > release.rotation);
});

test('manual model drag holds while pressed and returns smoothly after release', () => {
  assert.equal(typeof getModelDragReturnStep, 'function');

  const held = getModelDragReturnStep({ current: 0.46, dragging: true, deltaSeconds: 0.5 });
  const released = getModelDragReturnStep({ current: 0.46, dragging: false, deltaSeconds: 0.16 });

  assert.equal(held, 0.46);
  assert.ok(released > 0);
  assert.ok(released < 0.46);
});

test('manual model drag permits a full horizontal rotation while keeping vertical movement stable', () => {
  assert.equal(typeof getModelDragRotation, 'function');

  const rotated = getModelDragRotation({
    yaw: 0,
    pitch: 0,
    deltaX: 700,
    deltaY: 900
  });

  assert.ok(rotated.yaw > Math.PI * 2);
  assert.equal(rotated.pitch, Math.PI * 0.72);
});

test('Three scene composes a temporary drag rotation without changing the scroll rotation', async () => {
  const entry = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');

  assert.match(entry, /getModelDragReturnStep/);
  assert.match(entry, /const modelDrag =/);
  assert.match(entry, /event\.button !== 0/);
  assert.match(entry, /assetRoot\.rotation\.y = smoothRotation \+ instrumentMotion\.modelYaw \+ modelDrag\.yaw/);
  assert.match(entry, /assetRoot\.rotation\.x[\s\S]*modelDrag\.pitch/);
  assert.match(entry, /document\.documentElement\.classList\.add\('is-model-dragging'\)/);
});

test('tunnel movement yields to the burst intent before lateral release drift can build', async () => {
  assert.equal(typeof getTunnelReleaseAmount, 'function');
  assert.ok(getTunnelReleaseAmount({ tunnel: 1, burstIntent: 0.08 }) > 0.6);
  assert.ok(getTunnelReleaseAmount({ tunnel: 1, burstIntent: 0.2 }) < 0.1);
  assert.equal(getTunnelReleaseAmount({ tunnel: 1, burstIntent: 0.4 }), 0);

  const entry = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(entry, /getTunnelReleaseAmount/);
  assert.match(entry, /burstIntent: targetBurst/);
});

test('scene keeps the root rotation continuous through the burst', async () => {
  const entry = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');

  assert.doesNotMatch(entry, /releaseAxisRotation/);
  assert.match(entry, /assetRoot\.rotation\.y = smoothRotation/);
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

test('desktop composition keeps the original neutral model framing', async () => {
  const entry = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');

  assert.doesNotMatch(entry, /getDesktopSceneComposition/);
  assert.match(entry, /const composition = isMobile \? mobileComposition : \{ x: 0, y: 0, scale: 1 \}/);
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
