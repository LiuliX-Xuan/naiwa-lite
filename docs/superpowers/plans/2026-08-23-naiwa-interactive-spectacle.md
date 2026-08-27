# NAIWA Interactive Spectacle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the NAIWA story tactile throughout with draggable Elastic Text, responsive backdrop/UI, local model distortion, and one reversible release tunnel.

**Architecture:** Keep pure state and elastic-chain math in `src/interactive-effects.js`. A DOM-only `src/text-interactions.js` owns text, magnetic, and trail listeners; `src/main.js` remains the sole Three.js render loop and consumes a compact spectacle state.

**Tech Stack:** Vite, vanilla JavaScript, Three.js, CSS, Node built-in test runner.

---

### Task 1: Establish Pure Interaction Contracts

**Files:**
- Create: `src/interactive-effects.js`
- Create: `tests/interactive-effects.test.js`

- [x] **Step 1: Write failing tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { getElasticDisplacements, getSpectacleScrollState } from '../src/interactive-effects.js';

test('elastic displacement fades from the dragged glyph', () => {
  const offsets = getElasticDisplacements({ length: 5, activeIndex: 2, dragX: 42, dragY: -18, follow: 10 });
  assert.equal(offsets[2].x, 42);
  assert.equal(offsets[2].y, -18);
  assert.ok(Math.abs(offsets[1].x) > Math.abs(offsets[0].x));
  assert.ok(Math.abs(offsets[3].y) > Math.abs(offsets[4].y));
});

test('release tunnel only exists at the end of the scroll story', () => {
  assert.equal(getSpectacleScrollState(0).tunnel, 0);
  assert.ok(getSpectacleScrollState(.7).grid > .5);
  assert.ok(getSpectacleScrollState(.94).tunnel > .7);
});
```

- [x] **Step 2: Run failing test**

Run: `node --test tests/interactive-effects.test.js`
Expected: FAIL because the module does not yet exist.

- [x] **Step 3: Implement the pure helpers**

```js
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const smoothstep = (from, to, value) => {
  const t = clamp((value - from) / (to - from), 0, 1);
  return t * t * (3 - 2 * t);
};

export function getElasticDisplacements({ length = 0, activeIndex = -1, dragX = 0, dragY = 0, follow = 10 } = {}) {
  const strength = clamp(follow, 0, 20) / 20;
  return Array.from({ length: Math.max(0, Math.floor(length)) }, (_, index) => {
    if (index === activeIndex) return { x: dragX, y: dragY };
    const distance = Math.abs(index - activeIndex);
    const falloff = activeIndex < 0 ? 0 : Math.exp(-distance * (1.55 - strength));
    return { x: dragX * falloff * .42, y: dragY * falloff * .42 };
  });
}

export function getSpectacleScrollState(progress = 0) {
  const scroll = clamp(progress, 0, 1);
  return {
    ripple: .48 + (1 - smoothstep(.72, 1, scroll)) * .36,
    grid: smoothstep(.56, .78, scroll),
    distortion: smoothstep(.2, .54, scroll) * (1 - smoothstep(.82, 1, scroll) * .35),
    tunnel: smoothstep(.84, .96, scroll),
    trailEnergy: .38 + smoothstep(.42, .82, scroll) * .62
  };
}
```

- [x] **Step 4: Run passing test**

Run: `node --test tests/interactive-effects.test.js`
Expected: PASS with 2 tests.

### Task 2: Add Elastic Text Markup and DOM Interaction Controller

**Files:**
- Create: `src/text-interactions.js`
- Modify: `index.html`
- Modify: `tests/interactive-effects.test.js`

- [x] **Step 1: Add a failing markup contract**

```js
import { readFile } from 'node:fs/promises';

test('story exposes elastic, magnetic, and trail targets', async () => {
  const page = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(page, /data-elastic-text/);
  assert.match(page, /data-magnetic/);
  assert.match(page, /data-trail-target/);
});
```

- [x] **Step 2: Run failing test**

Run: `node --test tests/interactive-effects.test.js`
Expected: FAIL because the attributes are absent.

- [x] **Step 3: Convert display words to accessible draggable glyphs**

```js
import { getElasticDisplacements } from './interactive-effects.js';

function mountElastic(element) {
  const glyphs = [...element.textContent.trim()].map((character, index) => {
    const glyph = document.createElement('span');
    glyph.className = 'elastic-glyph';
    glyph.dataset.index = index;
    glyph.tabIndex = 0;
    glyph.textContent = character === ' ' ? '\u00a0' : character;
    element.append(glyph);
    return glyph;
  });
  element.textContent = '';
  let drag = null;
  const render = () => getElasticDisplacements({ length: glyphs.length, activeIndex: drag?.index ?? -1, dragX: drag?.x ?? 0, dragY: drag?.y ?? 0, follow: Number(element.dataset.follow || 10) }).forEach((offset, index) => {
    glyphs[index].style.transform = `translate3d(${offset.x}px, ${offset.y}px, 0)`;
  });
  element.addEventListener('pointerdown', (event) => { const glyph = event.target.closest('.elastic-glyph'); if (!glyph || event.pointerType === 'touch') return; element.setPointerCapture(event.pointerId); drag = { pointerId: event.pointerId, index: Number(glyph.dataset.index), startX: event.clientX, startY: event.clientY, x: 0, y: 0 }; });
  element.addEventListener('pointermove', (event) => { if (!drag || drag.pointerId !== event.pointerId) return; drag.x = event.clientX - drag.startX; drag.y = event.clientY - drag.startY; render(); });
  const release = (event) => { if (!drag || drag.pointerId !== event.pointerId) return; drag = null; element.classList.add('is-returning'); render(); window.setTimeout(() => element.classList.remove('is-returning'), 520); };
  element.addEventListener('pointerup', release);
  element.addEventListener('pointercancel', release);
}

export function mountTextInteractions() {
  document.querySelectorAll('[data-elastic-text]').forEach((element) => { element.setAttribute('aria-label', element.textContent.trim()); mountElastic(element); });
}
```

- [x] **Step 4: Mark the hero and one highlighted phrase in each chapter**

```html
<h1 class="hero-title" data-elastic-text data-follow="13" data-trail-target>奶蛙</h1>
<span class="type-line-accent" data-elastic-text data-follow="8" data-trail-target>一只被保留的</span>
<a href="#form" data-magnetic data-trail-target>形态</a>
```

- [x] **Step 5: Run the focused tests**

Run: `node --test tests/interactive-effects.test.js`
Expected: PASS with the markup contract.

### Task 3: Build the CSS Response Layers

**Files:**
- Modify: `src/styles.css`
- Modify: `index.html`
- Modify: `tests/interactive-effects.test.js`

- [x] **Step 1: Add a failing style contract**

```js
test('response layers include ripple, grid, trail, elastic return, and magnetic targets', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  for (const selector of ['.ripple-field', '.kinetic-grid', '.fluid-trail', '.elastic-text.is-returning', '[data-magnetic]']) assert.match(styles, new RegExp(selector.replace(/[.\[\]]/g, '\\$&')));
});
```

- [x] **Step 2: Run failing test**

Run: `node --test tests/interactive-effects.test.js`
Expected: FAIL because the response layers are absent.

- [x] **Step 3: Add fixed non-layout layers and interaction states**

```html
<div class="viewport" aria-hidden="true"><canvas id="scene"></canvas><div class="ripple-field"></div><div class="kinetic-grid"></div><div class="grain"></div></div>
<div class="fluid-trail" aria-hidden="true"></div>
```

```css
.ripple-field,.kinetic-grid,.fluid-trail{position:fixed;inset:0;pointer-events:none}
.ripple-field{z-index:1;opacity:var(--ripple-opacity,.56);background:repeating-radial-gradient(ellipse at var(--pointer-x,50%) var(--pointer-y,50%),transparent 0 14px,rgba(69,113,80,.13) 15px 16px,transparent 17px 33px);mix-blend-mode:multiply;transform:scaleY(.74)}
.kinetic-grid{z-index:1;opacity:var(--grid-opacity,0);background:linear-gradient(rgba(169,216,192,.26) 1px,transparent 1px),linear-gradient(90deg,rgba(241,216,101,.18) 1px,transparent 1px);background-size:34px 34px;transform:perspective(360px) rotateX(58deg) translateY(42%);transform-origin:center bottom}
.fluid-trail{z-index:6;width:18px;height:18px;margin:-9px 0 0 -9px;border:1px solid rgba(107,188,137,.72);border-radius:50%;opacity:0;transform:translate3d(var(--trail-x,-100px),var(--trail-y,-100px),0);box-shadow:0 0 0 7px rgba(241,216,101,.12)}
.elastic-text{display:inline-flex;cursor:grab;touch-action:pan-y}.elastic-glyph{display:inline-block;will-change:transform;transition:transform .3s cubic-bezier(.18,.9,.22,1.34)}.elastic-text.is-returning .elastic-glyph{transition-duration:.54s}[data-magnetic]{will-change:transform}
```

- [x] **Step 4: Wire pointer variables, magnetic response, and the target-only trail**

```js
export function mountPointerResponses() {
  const trail = document.querySelector('.fluid-trail');
  window.addEventListener('pointermove', (event) => {
    document.documentElement.style.setProperty('--pointer-x', `${event.clientX}px`);
    document.documentElement.style.setProperty('--pointer-y', `${event.clientY}px`);
    trail?.style.setProperty('--trail-x', `${event.clientX}px`);
    trail?.style.setProperty('--trail-y', `${event.clientY}px`);
  });
  document.querySelectorAll('[data-magnetic]').forEach((element) => element.addEventListener('pointermove', (event) => {
    const rect = element.getBoundingClientRect();
    element.style.transform = `translate3d(${(event.clientX - rect.left - rect.width / 2) * .12}px, ${(event.clientY - rect.top - rect.height / 2) * .12}px, 0)`;
  }));
}
```

- [x] **Step 5: Run the focused tests**

Run: `node --test tests/interactive-effects.test.js`
Expected: PASS.

### Task 4: Recompose the Three.js Story

**Files:**
- Modify: `src/main.js`
- Modify: `src/model-effects.js`
- Modify: `tests/model-effects.test.js`

- [x] **Step 1: Write the failing scene-contract test**

```js
test('Three scene uses spectacle state with distortion and tunnel uniforms', async () => {
  const entry = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(entry, /getSpectacleScrollState/);
  assert.match(entry, /uDistortion/);
  assert.match(entry, /uTunnel/);
  assert.match(entry, /--grid-opacity/);
});
```

- [x] **Step 2: Run failing test**

Run: `npm test`
Expected: FAIL because new scene state is not consumed.

- [x] **Step 3: Add two shader uniforms and state consumption**

```js
import { getSpectacleScrollState } from './interactive-effects.js';

const spectacle = getSpectacleScrollState(smoothScroll);
document.documentElement.style.setProperty('--ripple-opacity', spectacle.ripple.toFixed(3));
document.documentElement.style.setProperty('--grid-opacity', spectacle.grid.toFixed(3));
particleSystem.material.uniforms.uDistortion.value = spectacle.distortion * pointerPresence;
particleSystem.material.uniforms.uTunnel.value = spectacle.tunnel;
```

```glsl
uniform float uDistortion;
uniform float uTunnel;
float distortionWave = sin((position.y + position.x * .6 + uTime * .0018) * 12.0 + aPhase) * uDistortion;
splatPosition += aNormal * distortionWave * .08;
vec3 tunnelDirection = normalize(vec3(position.xy * .28, 1.0));
splatPosition += tunnelDirection * uTunnel * (1.7 + aScale * .6);
```

- [x] **Step 4: Delete the dominant orbit field**

Remove `createInteractionField`, the `interactionField` setup, and `updateInteractionField`. Preserve particle pointer hit testing, mobile composition, colour sampling, and reverse-scroll burst protection.

- [x] **Step 5: Run the complete suite**

Run: `npm test`
Expected: PASS with updated scene contract coverage.

### Task 5: Mount, Verify, and Commit

**Files:**
- Modify: `src/main.js`
- Modify: `src/styles.css`
- Modify: `tests/interactive-effects.test.js`

- [x] **Step 1: Mount interactions from the entry module**

```js
import { mountPointerResponses, mountTextInteractions } from './text-interactions.js';

mountTextInteractions();
mountPointerResponses();
```

- [x] **Step 2: Add mobile and reduced-motion behavior**

```css
@media (max-width:760px){.fluid-trail{display:none}.elastic-text{touch-action:pan-y}}
@media (prefers-reduced-motion:reduce){.ripple-field,.kinetic-grid,.fluid-trail{display:none}.elastic-glyph{transition-duration:.01ms!important}}
```

- [x] **Step 3: Run automated verification**

Run: `npm test`
Expected: PASS.

Run: `npm run build`
Expected: production build completes; the existing size warning may remain.

- [x] **Step 4: Run manual visual verification**

1. Test desktop drag on hero text, hover on navigation and readouts, and local model response.
2. Scroll to signal and release; verify the grid only appears late and the tunnel only in release.
3. Reverse scroll from release; verify tunnel and particle burst retract.
4. Test a 390 px viewport for normal scrolling, text clearance, and no clipped controls.
5. Test reduced motion for preserved focus without continuous animation.

- [x] **Step 5: Commit verified implementation**

Run: `git add index.html src/main.js src/model-effects.js src/interactive-effects.js src/text-interactions.js src/styles.css tests/model-effects.test.js tests/interactive-effects.test.js`
Run: `git commit -m "feat: add interactive spectacle"`
