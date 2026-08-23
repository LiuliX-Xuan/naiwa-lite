# NAIWA Rich Motion Field Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing Three.js character field feel alive with scroll-driven orbital motion, a reversible gravitational release, and a stronger pointer field.

**Architecture:** Keep all deterministic motion calculations in `src/model-effects.js`, then consume them in `src/main.js` to animate existing ring geometry and shader uniforms. The particle buffer stays immutable after creation; new motion is evaluated in the vertex shader so model loading, texture sampling, and BVH raycasting remain intact.

**Tech Stack:** Vite, vanilla ES modules, Three.js, GLSL, Node test runner.

---

### Task 1: Define And Test Rich Motion State

**Files:**
- Modify: `tests/model-effects.test.js`
- Modify: `src/model-effects.js`

- [ ] **Step 1: Write failing tests for orbital state and release collapse**

Add these imports to the existing `modelEffects` destructuring block:

```js
  getFieldMotionState,
  getReleaseCollapse
```

Append:

```js
test('field motion brings orbit energy in with particle state and keeps mobile pointer energy restrained', () => {
  const form = getFieldMotionState({ field: 0, burst: 0, pointerPresence: 0, time: 0, mobile: false });
  const active = getFieldMotionState({ field: 1, burst: 0, pointerPresence: 1, time: 4000, mobile: false });
  const mobile = getFieldMotionState({ field: 1, burst: 0, pointerPresence: 1, time: 4000, mobile: true });

  assert.equal(form.presence, 0);
  assert.ok(active.presence > 0.9);
  assert.ok(active.pointerEnergy > mobile.pointerEnergy);
  assert.ok(active.markerRadius > form.markerRadius);
  assert.ok(active.rotationSpeed > form.rotationSpeed);
});

test('release collapse peaks before the burst and clears once the release is fully expanded', () => {
  assert.equal(getReleaseCollapse(0.02), 0);
  assert.ok(getReleaseCollapse(0.28) > 0.85);
  assert.ok(getReleaseCollapse(0.82) < 0.2);
});
```

- [ ] **Step 2: Run the test suite and verify the expected failure**

Run: `npm test`

Expected: missing exports for `getFieldMotionState` and `getReleaseCollapse`; all existing tests stay green.

- [ ] **Step 3: Implement the pure helpers**

Add to `src/model-effects.js`:

```js
export function getReleaseCollapse(burst = 0) {
  const normalized = clamp(burst, 0, 1);
  return smoothstep(0.04, 0.26, normalized) * (1 - smoothstep(0.54, 0.88, normalized));
}

export function getFieldMotionState({ field = 0, burst = 0, pointerPresence = 0, mobile = false } = {}) {
  const normalizedField = clamp(field, 0, 1);
  const collapse = getReleaseCollapse(burst);
  const presence = smoothstep(0.06, 0.7, normalizedField) * (1 - smoothstep(0.82, 1, burst) * 0.48);
  const pointerEnergy = clamp(pointerPresence, 0, 1) * (mobile ? 0.22 : 1);

  return {
    presence,
    collapse,
    pointerEnergy,
    markerRadius: 1.34 + normalizedField * 0.62 + collapse * 0.32,
    rotationSpeed: 0.00014 + normalizedField * 0.00034 + pointerEnergy * 0.00022,
    ringScale: 1 + normalizedField * 0.2 + collapse * 0.16 + pointerEnergy * 0.05,
    waveAmplitude: normalizedField * 0.1 + collapse * 0.18
  };
}
```

- [ ] **Step 4: Run the test suite and verify it passes**

Run: `npm test`

Expected: all existing tests and both new tests pass.

- [ ] **Step 5: Commit the helper behavior**

Run: `git add src/model-effects.js tests/model-effects.test.js` then `git commit -m "feat: define rich motion field state"`.

### Task 2: Animate Existing Field Geometry

**Files:**
- Modify: `src/main.js:15-28`
- Modify: `src/main.js:591-617`
- Test: `tests/model-effects.test.js`

- [ ] **Step 1: Write the failing source-contract test**

Append:

```js
test('scene uses the rich field-state helper for orbit and marker motion', async () => {
  const entry = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');

  assert.match(entry, /getFieldMotionState/);
  assert.match(entry, /fieldState\.waveAmplitude/);
  assert.match(entry, /fieldState\.markerRadius/);
});
```

- [ ] **Step 2: Run the test suite and verify the expected failure**

Run: `npm test`

Expected: the source-contract test fails because `main.js` does not consume the helper.

- [ ] **Step 3: Replace the static field update with motion-state values**

Import `getFieldMotionState`. At the start of `updateInteractionField`, calculate:

```js
const fieldState = getFieldMotionState({
  field: smoothField,
  burst: smoothBurst,
  pointerPresence,
  mobile: window.innerWidth < 760
});
interactionField.visible = fieldState.presence > 0.01;
interactionField.rotation.y = time * fieldState.rotationSpeed + pointer.x * (0.16 + fieldState.pointerEnergy * 0.12);
interactionField.rotation.x = THREE.MathUtils.lerp(interactionField.rotation.x, pointer.y * (0.08 + fieldState.pointerEnergy * 0.06), 0.05);
interactionField.rotation.z = THREE.MathUtils.lerp(interactionField.rotation.z, pointer.x * (-0.045 - fieldState.pointerEnergy * 0.035), 0.05);
interactionField.scale.setScalar(fieldState.ringScale);
```

Multiply stored material opacity by `fieldState.presence`. In the marker loop, use `fieldState.markerRadius` as the base radius and add `Math.sin(angle * 2.3 + index) * fieldState.waveAmplitude` to the Y coordinate. Retain `position.needsUpdate = true`.

- [ ] **Step 4: Run the test suite and verify it passes**

Run: `npm test`

Expected: all tests, including the source-contract test, pass.

- [ ] **Step 5: Commit the field geometry motion**

Run: `git add src/main.js tests/model-effects.test.js` then `git commit -m "feat: animate naiwa orbit field"`.

### Task 3: Add Shader-Side Gravitational Collapse And Pointer Ring

**Files:**
- Modify: `src/main.js:403-476`
- Modify: `src/main.js:566-572`
- Test: `tests/model-effects.test.js`

- [ ] **Step 1: Write the failing shader contract test**

Append:

```js
test('particle shader includes reversible release collapse and ring-field uniforms', async () => {
  const entry = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');

  assert.match(entry, /uCollapse/);
  assert.match(entry, /uPointerRing/);
  assert.match(entry, /collapseDirection/);
});
```

- [ ] **Step 2: Run the test suite and verify the expected failure**

Run: `npm test`

Expected: the shader contract test fails because the new uniforms and collapse code are absent.

- [ ] **Step 3: Extend the particle material without new dependencies**

Add `uCollapse` and `uPointerRing` uniforms. Declare them in the vertex shader and insert this block immediately before the existing `aBurst` release:

```glsl
float collapse = smoothstep(0.0, 1.0, uCollapse);
vec3 collapseDirection = normalize(position + aDrift * 0.18 + vec3(0.0001));
splatPosition -= collapseDirection * collapse * (0.72 + aPhase * 0.035);

float pointerRingDistance = abs(interactionDistance - 0.74 - sin(uTime * 0.0014) * 0.06);
float pointerRing = (1.0 - smoothstep(0.02, 0.18, pointerRingDistance)) * uPointerRing;
splatPosition += radialDirection * pointerRing * 0.11;
```

In `updateSceneState`, calculate the same field state and assign:

```js
particleSystem.material.uniforms.uCollapse.value = fieldState.collapse;
particleSystem.material.uniforms.uPointerRing.value = fieldState.pointerEnergy;
```

Keep `uBurst` and its reverse-scroll guard unchanged.

- [ ] **Step 4: Run the test suite and verify it passes**

Run: `npm test`

Expected: all unit and source-contract tests pass.

- [ ] **Step 5: Commit the particle motion layer**

Run: `git add src/main.js tests/model-effects.test.js` then `git commit -m "feat: add naiwa gravity release"`.

### Task 4: Verify Production Rendering And Responsive Behavior

**Files:**
- Modify: none expected

- [ ] **Step 1: Run complete automated checks**

Run: `npm test` and `npm run build`.

Expected: all tests pass and the production build has no errors.

- [ ] **Step 2: Inspect the desktop view at 1280 x 720**

Verify the initial form keeps the field quiet behind the model; the particle stage shows precessing rings and a contained pointer field; release performs a brief inward collapse followed by expansion; reverse scroll stops expansion.

- [ ] **Step 3: Inspect the mobile view at 390 x 844**

Verify hero copy and HUD stay within the viewport; the field moves without hover input; release does not obscure the title beyond the established particle treatment.

- [ ] **Step 4: Commit the verified feature**

Run: `git add src/main.js src/model-effects.js tests/model-effects.test.js` then `git commit -m "feat: enrich naiwa motion field"`.

