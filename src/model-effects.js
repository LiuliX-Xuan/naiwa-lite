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
    morph: smoothstep(0.24, 0.58, normalized),
    field: smoothstep(0.55, 0.7, normalized),
    burst: smoothstep(0.76, 0.98, normalized),
    rotation: normalized * Math.PI * 2.4,
    returnPhase: 0
  };
}
