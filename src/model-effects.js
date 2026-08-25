const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const smoothstep = (edge0, edge1, value) => {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

export function recenterVectorTriplets(values) {
  const count = Math.floor(values.length / 3);
  if (count === 0) return values;

  let x = 0;
  let y = 0;
  let z = 0;
  for (let index = 0; index < count * 3; index += 3) {
    x += values[index];
    y += values[index + 1];
    z += values[index + 2];
  }

  x /= count;
  y /= count;
  z /= count;
  for (let index = 0; index < count * 3; index += 3) {
    values[index] -= x;
    values[index + 1] -= y;
    values[index + 2] -= z;
  }
  return values;
}

export function getParticleColor(sampled = { r: 0.88, g: 0.72, b: 0.18 }, out = { r: 0, g: 0, b: 0 }) {
  const r = clamp(sampled.r ?? 0.88, 0, 1);
  const g = clamp(sampled.g ?? 0.72, 0, 1);
  const b = clamp(sampled.b ?? 0.18, 0, 1);
  const brightness = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const greenAccent = g > r * 1.1 && g > b * 1.12;

  if (brightness < 0.42 || greenAccent) {
    out.r = r;
    out.g = g;
    out.b = b;
    return out;
  }

  out.r = r * 0.24 + 0.84 * 0.76;
  out.g = g * 0.24 + 0.68 * 0.76;
  out.b = b * 0.24 + 0.16 * 0.76;
  return out;
}

export function getMobileSceneComposition(progress) {
  const normalized = clamp(progress, 0, 1);
  const formFocus = smoothstep(0.1, 0.16, normalized) * (1 - smoothstep(0.26, 0.34, normalized));
  return {
    x: formFocus * 1.18,
    y: formFocus * 0.06,
    scale: 1 - formFocus * 0.18
  };
}

export function getGroundPlaneY(modelBottom, rootY, rootScale, clearance = 0.02) {
  return rootY + modelBottom * rootScale - clearance;
}

export function getPointerNdc(clientX, clientY, width, height, out = { x: 0, y: 0 }) {
  out.x = (clientX / Math.max(1, width)) * 2 - 1;
  out.y = 1 - (clientY / Math.max(1, height)) * 2;
  return out;
}

export function getRenderPixelRatio(devicePixelRatio = 1, viewportWidth = 1024) {
  const pixelRatio = Math.max(1, devicePixelRatio || 1);
  const cap = viewportWidth < 760 ? 1.25 : 1.5;
  return Math.min(pixelRatio, cap);
}

export function shouldUpdateParticlePointer({ hasPointer, morph, pointerMoved, sceneMoved }) {
  return Boolean(hasPointer && morph >= 0.05 && (pointerMoved || sceneMoved));
}

export function shouldRenderFormShadows(morph, burst) {
  return morph <= 0.06 && burst < 0.05;
}

export function getInteractionResponseStep({ current = 0, target = 0, deltaSeconds = 0 }) {
  const delta = clamp(deltaSeconds, 0, 0.5);
  const rate = target >= current ? 14 : 3.2;
  const response = 1 - Math.exp(-rate * delta);
  return current + (target - current) * response;
}

export function getBurstProgressStep({ current = 0, target = 0, deltaSeconds = 0, retreating = false }) {
  if (retreating && target > current) return current;

  const delta = clamp(deltaSeconds, 0, 0.5);
  const rate = target >= current ? 1.15 : 9.5;
  const response = 1 - Math.exp(-rate * delta);
  return current + (target - current) * response;
}

export function getScrollTransitionStep({ current = 0, target = 0, deltaSeconds = 0, rate = 8 }) {
  const delta = clamp(deltaSeconds, 0, 0.5);
  const response = 1 - Math.exp(-Math.max(0, rate) * delta);
  return current + (target - current) * response;
}

export function getModelDragReturnStep({ current = 0, dragging = false, deltaSeconds = 0, rate = 2.4 } = {}) {
  if (dragging) return current;
  return getScrollTransitionStep({ current, target: 0, deltaSeconds, rate });
}

export function getModelDragRotation({ yaw = 0, pitch = 0, deltaX = 0, deltaY = 0 } = {}) {
  return {
    yaw: Number(yaw) + Number(deltaX) * 0.01,
    pitch: clamp(Number(pitch) + Number(deltaY) * 0.006, -Math.PI * 0.72, Math.PI * 0.72)
  };
}

export function getTunnelReleaseAmount({ tunnel = 0, burstIntent = 0 } = {}) {
  const tunnelAmount = clamp(tunnel, 0, 1);
  const release = smoothstep(0, 0.24, clamp(burstIntent, 0, 1));
  return tunnelAmount * (1 - release);
}

export function getInstrumentSceneState({
  origin = 'neutral',
  material = {},
  signal = { speed: 0.2, chaos: 0.2, touch: 0.35 },
  release = 'hold'
} = {}) {
  const roughness = clamp(Number(material.roughness ?? 1), 0, 1);
  const gloss = clamp(Number(material.gloss ?? 0), 0, 1);
  const softness = clamp(Number(material.softness ?? 0), 0, 1);
  const legacySignal = typeof signal === 'string' ? signal : undefined;
  const speed = clamp(Number(legacySignal === 'flow' ? 0.45 : legacySignal === 'pulse' ? 0.82 : signal.speed ?? 0.2), 0, 1);
  const chaos = clamp(Number(legacySignal === 'flow' ? 0.42 : legacySignal === 'pulse' ? 0.76 : signal.chaos ?? 0.2), 0, 1);
  const touch = clamp(Number(legacySignal === 'flow' ? 0.5 : legacySignal === 'pulse' ? 0.82 : signal.touch ?? 0.35), 0, 1);
  const state = {
    model: { x: 0, pitch: 0, yaw: 0, roll: 0, warmth: 0, breath: 0 },
    light: { x: 0, y: 0, intensity: 0, warmth: 0 },
    surface: {
      roughness,
      glossLevel: gloss,
      roughnessShift: (roughness - 0.5) * 0.52,
      gloss: (gloss - 0.5) * 0.46,
      distortion: Math.max(0, softness - 0.5) * 0.44
    },
    particles: { vibration: 0, speed, randomness: chaos, interaction: touch, previewOpacity: 0, previewSize: 0 },
    typography: { signal: 0 }
  };

  if (origin === 'shell') {
    state.model.warmth = 0.12;
    state.model.breath = 0.1;
    state.surface.gloss += 0.18;
    state.surface.glossLevel = Math.min(1, state.surface.glossLevel + 0.18);
  }
  if (origin === 'stance') {
    state.model.pitch = 0.026;
    state.model.yaw = -0.08;
    state.model.roll = 0.018;
    state.light.x = -0.9;
    state.light.y = 0.34;
    state.light.intensity = 0.14;
  }
  if (origin === 'voice') {
    state.particles.vibration += 0.14;
    state.typography.signal += 0.2;
  }

  state.model.breath += speed * 0.05;
  state.particles.vibration += chaos * 0.3;
  state.typography.signal += Math.max(speed, chaos) * 0.32;

  if (release === 'trace') {
    state.particles.previewOpacity = 0.08;
    state.particles.previewSize = 0.07;
  }
  if (release === 'wide') {
    state.particles.previewOpacity = 0.16;
    state.particles.previewSize = 0.14;
  }

  return state;
}

export function getParticleOffset(home, pointer, time, index, out = { x: 0, y: 0, z: 0 }) {
  const dx = home.x - pointer.x;
  const dy = home.y - pointer.y;
  const dz = home.z - pointer.z;
  const distance = Math.hypot(dx, dy, dz);
  const influence = Math.exp(-distance * distance * 2.2);
  const strength = influence * 0.24;
  const inverseDistance = distance > 0.0001 ? 1 / distance : 0;

  out.x = dx * inverseDistance * strength;
  out.y = dy * inverseDistance * strength + Math.sin(time * 0.0012 + index * 0.17) * 0.006 * influence;
  out.z = dz * inverseDistance * strength;
  return out;
}

export function getScrollSceneState(progress) {
  const normalized = clamp(progress, 0, 1);
  return {
    morph: smoothstep(0.16, 0.4, normalized),
    field: smoothstep(0.55, 0.7, normalized),
    burst: smoothstep(0.76, 0.98, normalized),
    rotation: normalized * Math.PI * 3.8,
    returnPhase: 0
  };
}
