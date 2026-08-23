const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const smoothstep = (edge0, edge1, value) => {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

export function getElasticDisplacements({ length = 0, activeIndex = -1, dragX = 0, dragY = 0, follow = 10 } = {}) {
  const count = Math.max(0, Math.floor(length));
  const strength = clamp(follow, 0, 20) / 20;

  return Array.from({ length: count }, (_, index) => {
    if (index === activeIndex) return { x: dragX, y: dragY };

    const distance = Math.abs(index - activeIndex);
    const falloff = activeIndex < 0 ? 0 : Math.exp(-distance * (1.55 - strength));
    return { x: dragX * falloff * 0.42, y: dragY * falloff * 0.42 };
  });
}

export function getSpectacleScrollState(progress = 0) {
  const scroll = clamp(progress, 0, 1);

  return {
    ripple: 0.48 + (1 - smoothstep(0.72, 1, scroll)) * 0.36,
    grid: smoothstep(0.56, 0.78, scroll),
    distortion: smoothstep(0.2, 0.54, scroll) * (1 - smoothstep(0.82, 1, scroll) * 0.35),
    tunnel: smoothstep(0.84, 0.96, scroll),
    trailEnergy: 0.38 + smoothstep(0.42, 0.82, scroll) * 0.62
  };
}
