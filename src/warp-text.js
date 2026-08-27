import { Mesh, Program, Renderer, Texture, Triangle } from 'ogl';

const vertex = `#version 300 es
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;

uniform sampler2D uTextTexture;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uPointerActive;
uniform float uTime;
uniform float uWarpStrength;
uniform float uWarpScale;
uniform float uSpeed;
uniform float uPointerInfluence;
uniform float uPointerStrength;
uniform float uRefraction;
uniform float uRipple;
uniform float uMotion;

in vec2 vUv;
out vec4 fragColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p *= 2.02;
    amplitude *= 0.5;
  }
  return value;
}

vec4 sampleText(vec2 uv) {
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    return vec4(0.0);
  }
  return texture(uTextTexture, uv);
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  float time = uTime * uSpeed;
  float scale = max(uWarpScale, 0.001);

  vec2 drift = vec2(time * 0.055, -time * 0.045);
  float n1 = fbm(uv * scale * 3.1 + drift);
  float n2 = fbm((uv + 19.17) * scale * 3.4 - drift.yx);
  vec2 ambient = (vec2(n1, n2) - 0.5) * uWarpStrength * 0.045 * uMotion;

  vec2 pointerDelta = uv - uPointer;
  vec2 aspectDelta = vec2(pointerDelta.x * aspect, pointerDelta.y);
  float dist = length(aspectDelta);
  float radius = max(uPointerInfluence, 0.001);
  float t = clamp(dist / radius, 0.0, 1.0);
  float lens = smoothstep(radius, 0.0, dist) * uPointerActive;
  float bulge = t * (1.0 - t) * (1.0 - t) * 6.75;
  vec2 dir = dist > 0.0001 ? vec2(aspectDelta.x / aspect, aspectDelta.y) / dist : vec2(0.0);

  float rippleWave = sin(dist * 28.0 - time * 4.2) * 0.5 + 0.5;
  float rippleRing = (rippleWave - 0.5) * uRipple;
  vec2 pointerWarp = -dir * bulge * uPointerStrength * 0.045 * uPointerActive;
  pointerWarp += dir * rippleRing * bulge * uPointerStrength * 0.016 * uPointerActive;

  vec2 displaced = uv + ambient + pointerWarp;
  vec2 splitDir = ambient + pointerWarp;
  float splitLen = length(splitDir);
  splitDir = splitLen > 0.00001 ? splitDir / splitLen : vec2(0.7071, 0.7071);
  vec2 split = splitDir * uRefraction * 0.16 * (0.35 + lens * 1.65);

  vec4 base = sampleText(displaced);
  float r = sampleText(displaced + split).r;
  float g = base.g;
  float b = sampleText(displaced - split).b;
  float a = max(max(sampleText(displaced + split).a, base.a), sampleText(displaced - split).a);

  vec3 color = vec3(r, g, b) + lens * base.a * 0.055;
  fragColor = vec4(color, a);
}
`;

const getFontValue = (value) => (typeof value === 'number' ? `${value}px` : value);

const measureLine = (context, line, letterSpacing) => {
  const chars = Array.from(line);
  const textWidth = chars.reduce((width, char) => width + context.measureText(char).width, 0);
  return textWidth + Math.max(0, chars.length - 1) * letterSpacing;
};

const drawLine = (context, line, x, y, letterSpacing) => {
  const chars = Array.from(line);
  let cursor = x - measureLine(context, line, letterSpacing) / 2;

  chars.forEach((char, index) => {
    context.fillText(char, cursor, y);
    cursor += context.measureText(char).width + (index === chars.length - 1 ? 0 : letterSpacing);
  });
};

function buildTextCanvas({ container, width, height, dpr, props }) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(width * dpr));
  canvas.height = Math.max(1, Math.floor(height * dpr));

  const context = canvas.getContext('2d');
  if (!context) return canvas;

  const probe = document.createElement('span');
  probe.textContent = props.text;
  Object.assign(probe.style, {
    position: 'absolute',
    visibility: 'hidden',
    pointerEvents: 'none',
    whiteSpace: 'pre',
    inset: '0 auto auto 0',
    fontFamily: props.fontFamily,
    fontSize: getFontValue(props.fontSize),
    fontWeight: String(props.fontWeight),
    letterSpacing: getFontValue(props.letterSpacing),
    lineHeight: typeof props.lineHeight === 'number' ? String(props.lineHeight) : props.lineHeight
  });
  container.appendChild(probe);

  const computed = window.getComputedStyle(probe);
  let fontSizePx = parseFloat(computed.fontSize) || 96;
  const fontFamily = computed.fontFamily || 'sans-serif';
  const fontWeight = computed.fontWeight || String(props.fontWeight);
  let letterSpacing = computed.letterSpacing === 'normal' ? 0 : parseFloat(computed.letterSpacing) || 0;
  let lineHeight = parseFloat(computed.lineHeight);
  if (!Number.isFinite(lineHeight)) {
    lineHeight = fontSizePx * (typeof props.lineHeight === 'number' ? props.lineHeight : 0.92);
  }
  probe.remove();

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillStyle = props.color;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  const lines = String(props.text || '').split('\n');
  const applyFont = () => {
    context.font = `${fontWeight} ${fontSizePx}px ${fontFamily}`;
  };
  applyFont();

  const maxWidth = width * 0.86;
  const maxHeight = height * 0.78;
  const widest = Math.max(...lines.map((line) => measureLine(context, line, letterSpacing)), 1);
  const blockHeight = Math.max(lineHeight * lines.length, 1);
  const fit = Math.min(1, maxWidth / widest, maxHeight / blockHeight);

  if (fit < 1) {
    fontSizePx *= fit;
    letterSpacing *= fit;
    lineHeight *= fit;
    applyFont();
  }

  const startY = height / 2 - (lineHeight * (lines.length - 1)) / 2;
  lines.forEach((line, index) => drawLine(context, line, width / 2, startY + index * lineHeight, letterSpacing));
  return canvas;
}

function syncUniforms(program, props) {
  const uniforms = program.uniforms;
  uniforms.uWarpStrength.value = props.warpStrength;
  uniforms.uWarpScale.value = props.warpScale;
  uniforms.uSpeed.value = props.speed;
  uniforms.uPointerInfluence.value = props.pointerInfluence;
  uniforms.uPointerStrength.value = props.pointerStrength;
  uniforms.uRefraction.value = props.refraction;
  uniforms.uRipple.value = props.ripple ? 1 : 0;
}

export function canUseWarpText(element, { WebGLRenderingContext = globalThis.WebGLRenderingContext, createCanvas } = {}) {
  if (!element || !WebGLRenderingContext) return false;
  const canvas = createCanvas?.() || globalThis.document?.createElement?.('canvas');
  return Boolean(canvas?.getContext?.('webgl2'));
}

export function mountWarpText(element, options = {}) {
  if (!canUseWarpText(element, { createCanvas: () => document.createElement('canvas') })) {
    element?.classList.add('is-fallback');
    return undefined;
  }

  const props = {
    text: element.dataset.terminalText || '奶蛙',
    color: '#f1d865',
    warpStrength: 0.08,
    warpScale: 1.7,
    speed: 0.55,
    pointerInfluence: 0.42,
    pointerStrength: 0.38,
    refraction: 0.018,
    ripple: true,
    fontSize: 'clamp(6.6rem, 18.48vw, 17.16rem)',
    fontWeight: 400,
    height: '320px',
    fontFamily: options.fontFamily || window.getComputedStyle(element).fontFamily || 'sans-serif',
    letterSpacing: '0.35em',
    lineHeight: 0.9,
    ...options
  };
  let renderer;
  try {
    renderer = new Renderer({
      webgl: 2,
      alpha: true,
      premultipliedAlpha: false,
      antialias: true,
      dpr: Math.min(window.devicePixelRatio || 1, 2)
    });
  } catch {
    element.classList.add('is-fallback');
    return undefined;
  }

  const gl = renderer.gl;
  gl.clearColor(0, 0, 0, 0);
  const canvas = gl.canvas;
  const texture = new Texture(gl, {
    generateMipmaps: false,
    minFilter: gl.LINEAR,
    magFilter: gl.LINEAR,
    wrapS: gl.CLAMP_TO_EDGE,
    wrapT: gl.CLAMP_TO_EDGE
  });
  const program = new Program(gl, {
    vertex,
    fragment,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uTextTexture: { value: texture },
      uResolution: { value: new Float32Array([1, 1]) },
      uPointer: { value: new Float32Array([0.5, 0.5]) },
      uPointerActive: { value: 0 },
      uTime: { value: 0 },
      uWarpStrength: { value: props.warpStrength },
      uWarpScale: { value: props.warpScale },
      uSpeed: { value: props.speed },
      uPointerInfluence: { value: props.pointerInfluence },
      uPointerStrength: { value: props.pointerStrength },
      uRefraction: { value: props.refraction },
      uRipple: { value: props.ripple ? 1 : 0 },
      uMotion: { value: 0.12 }
    }
  });
  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
  const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, active: 0, activeTarget: 0 };
  const startTime = performance.now();
  let resizeObserver;
  let intersectionObserver;
  let animationFrame = 0;
  let disposed = false;
  let contextLost = false;
  let visible = true;
  let pageVisible = !document.hidden;
  let reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  let rasterVersion = 0;
  let burstEnergy = 0;
  let hasRenderedText = false;

  canvas.className = 'warp-text-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  element.style.height = props.height;
  element.style.fontSize = props.fontSize;
  element.style.fontWeight = String(props.fontWeight);
  element.append(canvas);

  const renderOnce = () => {
    if (!disposed && !contextLost) renderer.render({ scene: mesh });
  };

  const rasterize = async () => {
    const version = ++rasterVersion;
    try {
      await document.fonts?.load(`${props.fontWeight} 1em ${props.fontFamily}`, props.text);
      await document.fonts?.ready;
    } catch {}
    if (disposed || contextLost || version !== rasterVersion) return;

    const width = element.clientWidth;
    const height = element.clientHeight;
    if (width <= 0 || height <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    texture.image = buildTextCanvas({ container: element, width, height, dpr, props });
    texture.needsUpdate = true;
    renderOnce();
    if (!hasRenderedText) {
      hasRenderedText = true;
      element.classList.add('is-ready');
    }
  };

  const resize = () => {
    if (disposed || contextLost) return;
    const width = element.clientWidth;
    const height = element.clientHeight;
    if (width <= 0 || height <= 0) return;

    renderer.dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setSize(width, height);
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    program.uniforms.uResolution.value[0] = gl.drawingBufferWidth;
    program.uniforms.uResolution.value[1] = gl.drawingBufferHeight;
    rasterize();
  };

  const onPointerMove = (event) => {
    if (event.pointerType === 'touch') return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    pointer.tx = (event.clientX - rect.left) / rect.width;
    pointer.ty = 1 - (event.clientY - rect.top) / rect.height;
    pointer.activeTarget = 1;
  };

  const onPointerLeave = () => {
    pointer.activeTarget = 0;
  };

  const onContextLost = (event) => {
    event.preventDefault();
    contextLost = true;
    element.classList.remove('is-ready');
    element.classList.add('is-fallback');
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  };

  const onVisibility = () => {
    pageVisible = !document.hidden;
    if (pageVisible && visible && !animationFrame) animationFrame = requestAnimationFrame(loop);
    if (!pageVisible && animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
  };

  const mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const onReducedMotion = (event) => {
    reduceMotion = event.matches;
    program.uniforms.uMotion.value = reduceMotion ? 0 : 0.12 + burstEnergy * 0.65;
    renderOnce();
  };

  const loop = (now) => {
    if (disposed || contextLost) return;
    const elapsed = (now - startTime) * 0.001;
    const idleX = 0.5 + Math.sin(elapsed * 0.33) * 0.12;
    const idleY = 0.5 + Math.cos(elapsed * 0.27) * 0.1;
    const targetX = pointer.activeTarget > 0 ? pointer.tx : idleX;
    const targetY = pointer.activeTarget > 0 ? pointer.ty : idleY;
    const damping = pointer.activeTarget > 0 ? 0.12 : 0.035;

    pointer.x += (targetX - pointer.x) * damping;
    pointer.y += (targetY - pointer.y) * damping;
    pointer.active += ((pointer.activeTarget > 0 ? 1 : 0) - pointer.active) * 0.06;

    program.uniforms.uPointer.value[0] = pointer.x;
    program.uniforms.uPointer.value[1] = pointer.y;
    program.uniforms.uPointerActive.value = reduceMotion ? pointer.active * 0.35 : pointer.active;
    program.uniforms.uTime.value = reduceMotion ? 0 : elapsed;
    renderOnce();
    animationFrame = requestAnimationFrame(loop);
  };

  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(element);
  intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && pageVisible && !animationFrame) animationFrame = requestAnimationFrame(loop);
    if (!visible && animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
  }, { threshold: 0 });
  intersectionObserver.observe(element);

  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerleave', onPointerLeave);
  canvas.addEventListener('webglcontextlost', onContextLost, false);
  document.addEventListener('visibilitychange', onVisibility);
  mediaQuery?.addEventListener('change', onReducedMotion);
  syncUniforms(program, props);
  resize();
  animationFrame = requestAnimationFrame(loop);

  return {
    setBurst(energy = 0) {
      burstEnergy = Math.min(1, Math.max(0, energy));
      program.uniforms.uWarpStrength.value = props.warpStrength * (1 + burstEnergy * 6.5);
      program.uniforms.uPointerStrength.value = props.pointerStrength + burstEnergy * 0.62;
      program.uniforms.uRipple.value = props.ripple ? 1 + burstEnergy * 0.9 : burstEnergy * 0.9;
      program.uniforms.uMotion.value = reduceMotion ? 0 : 0.12 + burstEnergy * 0.65;
    },
    destroy() {
      disposed = true;
      if (animationFrame) cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      document.removeEventListener('visibilitychange', onVisibility);
      mediaQuery?.removeEventListener('change', onReducedMotion);

      if (!contextLost) {
        try {
          if (texture.texture) gl.deleteTexture(texture.texture);
          gl.getExtension('WEBGL_lose_context')?.loseContext();
        } catch {}
      }
      canvas.remove();
      element.classList.remove('is-ready');
      element.classList.remove('is-fallback');
    }
  };
}
