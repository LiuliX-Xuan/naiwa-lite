const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const smoothstep = (edge0, edge1, value) => {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

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
    rotation: normalized * Math.PI * 3.8,
    returnPhase: 0
  };
}
