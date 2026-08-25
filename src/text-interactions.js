import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getElasticDisplacements } from './interactive-effects.js';

gsap.registerPlugin(ScrollTrigger);

function createElasticMotion(glyphs) {
  return glyphs.map((glyph) => ({
    glyph,
    xSet: gsap.quickSetter(glyph, 'x', 'px'),
    ySet: gsap.quickSetter(glyph, 'y', 'px')
  }));
}

function applyElasticOffsets(motion, offsets) {
  motion.forEach((entry, index) => {
    const offset = offsets[index] ?? { x: 0, y: 0 };
    entry.xSet(offset.x);
    entry.ySet(offset.y);
  });
}

function resetElasticText(element, motion) {
  const glyphs = motion.map(({ glyph }) => glyph);
  gsap.killTweensOf(glyphs);
  gsap.to(glyphs, {
    x: 0,
    y: 0,
    duration: 0.78,
    ease: 'elastic.out(1, 0.34)',
    stagger: { each: 0.014, from: 'center' },
    overwrite: 'auto',
    onComplete: () => element.classList.remove('is-returning')
  });
}

function pulseElasticText(element, motion, index) {
  const offsets = getElasticDisplacements({
    length: motion.length,
    activeIndex: index,
    dragX: 0,
    dragY: -12,
    follow: Number(element.dataset.follow || 10)
  });
  const glyphs = motion.map(({ glyph }) => glyph);

  element.classList.add('is-returning');
  gsap.killTweensOf(glyphs);
  gsap.to(glyphs, {
    x: (glyph, glyphIndex) => offsets[glyphIndex]?.x ?? 0,
    y: (glyph, glyphIndex) => offsets[glyphIndex]?.y ?? 0,
    duration: 0.28,
    ease: 'back.out(1.8)',
    stagger: { each: 0.012, from: 'center' },
    overwrite: 'auto',
    onComplete: () => gsap.delayedCall(0.08, () => resetElasticText(element, motion))
  });
}

function resolveElasticGlyph(element, event) {
  const targetGlyph = event.target.closest?.('.elastic-glyph');
  if (targetGlyph && element.contains(targetGlyph)) return targetGlyph;

  return [...element.querySelectorAll('.elastic-glyph')].find((glyph) => {
    const rect = glyph.getBoundingClientRect();
    return event.clientX >= rect.left
      && event.clientX <= rect.right
      && event.clientY >= rect.top
      && event.clientY <= rect.bottom;
  });
}

function mountElasticText(element) {
  const text = element.textContent.trim();
  if (!text || element.dataset.elasticMounted === 'true') return;

  element.dataset.elasticMounted = 'true';
  element.setAttribute('aria-label', element.getAttribute('aria-label') || text);
  element.textContent = '';

  const glyphs = [...text].map((character, index) => {
    const glyph = document.createElement('span');
    glyph.className = 'elastic-glyph';
    glyph.dataset.index = String(index);
    glyph.tabIndex = 0;
    glyph.setAttribute('aria-hidden', 'true');
    glyph.textContent = character === ' ' ? '\u00a0' : character;
    element.append(glyph);
    return glyph;
  });
  const motion = createElasticMotion(glyphs);
  const follow = Number(element.dataset.follow || 10);
  let drag;

  const render = () => applyElasticOffsets(motion, getElasticDisplacements({
    length: glyphs.length,
    activeIndex: drag?.index ?? -1,
    dragX: drag?.x ?? 0,
    dragY: drag?.y ?? 0,
    follow
  }));
  element.addEventListener('pointerdown', (event) => {
    const glyph = resolveElasticGlyph(element, event);
    if (!glyph || event.pointerType === 'touch') return;

    event.preventDefault();
    element.setPointerCapture(event.pointerId);
    element.classList.remove('is-returning');
    drag = {
      pointerId: event.pointerId,
      index: Number(glyph.dataset.index),
      startX: event.clientX,
      startY: event.clientY,
      x: 0,
      y: 0
    };
  });

  element.addEventListener('pointermove', (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    drag.x = event.clientX - drag.startX;
    drag.y = event.clientY - drag.startY;
    render();
  });

  const release = (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag = undefined;
    element.classList.add('is-returning');
    resetElasticText(element, motion);
  };

  element.addEventListener('pointerup', release);
  element.addEventListener('pointercancel', release);
  element.addEventListener('focusin', (event) => {
    const index = Number(event.target.closest('.elastic-glyph')?.dataset.index ?? 0);
    pulseElasticText(element, motion, index);
  });
  element.addEventListener('pointerup', (event) => {
    if (event.pointerType !== 'touch') return;
    const index = Number(event.target.closest('.elastic-glyph')?.dataset.index ?? 0);
    pulseElasticText(element, motion, index);
  });
}

function mountMagneticTarget(element) {
  const xTo = gsap.quickTo(element, 'x', { duration: 0.42, ease: 'power3.out', overwrite: 'auto' });
  const yTo = gsap.quickTo(element, 'y', { duration: 0.42, ease: 'power3.out', overwrite: 'auto' });

  element.addEventListener('pointermove', (event) => {
    const rect = element.getBoundingClientRect();
    xTo((event.clientX - rect.left - rect.width / 2) * 0.12);
    yTo((event.clientY - rect.top - rect.height / 2) * 0.12);
  });
  element.addEventListener('pointerleave', () => {
    xTo(0);
    yTo(0);
  });
  element.addEventListener('focus', () => yTo(-2));
  element.addEventListener('blur', () => {
    xTo(0);
    yTo(0);
  });
}

export function mountTextInteractions() {
  document.querySelectorAll('[data-elastic-text]').forEach(mountElasticText);
  document.querySelectorAll('[data-magnetic]').forEach(mountMagneticTarget);
}

const originDetails = {
  neutral: { code: '中性 / 00', title: '整体形态', copy: '所有参数回到角色的基础状态。' },
  shell: { code: '外壳 / 01', title: '柔软外壳', copy: '淡黄色软躯干，将重心压在圆胖的体积里。' },
  stance: { code: '姿态 / 02', title: '中轴姿态', copy: '模型围绕中轴微倾，观察角度与光向一起轻微偏转。' },
  voice: { code: '声场 / 03', title: '延展笑声', copy: '不改变模型结构，只让粒子和文字留下短促余震。' }
};

const releaseStateLabels = {
  hold: '保持',
  trace: '轨迹',
  wide: '扩散'
};

const defaultInstrumentState = () => ({
  origin: 'shell',
  material: { roughness: 1, gloss: 0, softness: 0 },
  signal: { speed: 0.2, chaos: 0.2, touch: 0.35 },
  release: 'hold'
});

function copyInstrumentState(state) {
  return { ...state, material: { ...state.material }, signal: { ...state.signal } };
}

function setInstrumentValue(state, key, value) {
  if (key.startsWith('material.') || key.startsWith('signal.')) {
    const [group, property] = key.split('.');
    state[group][property] = value;
    return;
  }
  state[key] = value;
}

function updateInstrumentOutputs(state) {
  const origin = originDetails[state.origin] || originDetails.neutral;
  const materialProfile = state.material.gloss >= 0.66
    ? '高光'
    : state.material.roughness >= 0.66
      ? '磨砂'
      : '柔亮';
  document.querySelectorAll('[data-instrument-output="origin-code"]').forEach((element) => { element.textContent = origin.code; });
  document.querySelectorAll('[data-instrument-output="origin-title"]').forEach((element) => { element.textContent = origin.title; });
  document.querySelectorAll('.origin-profile-detail p').forEach((element) => { element.textContent = origin.copy; });
  document.querySelectorAll('[data-instrument-output="release-state"]').forEach((element) => { element.textContent = releaseStateLabels[state.release] || releaseStateLabels.hold; });
  ['roughness', 'gloss', 'softness'].forEach((key) => {
    const value = Math.round(state.material[key] * 100);
    document.querySelectorAll(`[data-instrument-output="material-${key}"]`).forEach((element) => { element.textContent = String(value); });
  });
  document.querySelectorAll('[data-instrument-output="material-profile"]').forEach((element) => {
    element.textContent = `${materialProfile} / ${Math.round(state.material.roughness * 100)}`;
  });
  ['speed', 'chaos', 'touch'].forEach((key) => {
    const value = Math.round(state.signal[key] * 100);
    document.querySelectorAll(`[data-instrument-output="signal-${key}"]`).forEach((element) => { element.textContent = String(value); });
  });

  document.querySelectorAll('[data-instrument-control]').forEach((control) => {
    const key = control.dataset.instrumentKey;
    if (!key) return;
    const [group, property] = key.split('.');
    const current = property ? state[group][property] : state[key];
    if (control.type === 'range') {
      control.value = String(Math.round(Number(current) * 100));
      control.style.setProperty('--instrument-progress', `${control.value}%`);
      return;
    }
    control.classList.toggle('is-active', control.dataset.instrumentValue === current);
    control.setAttribute('aria-pressed', String(control.dataset.instrumentValue === current));
  });
}

export function mountInstrumentControls(onChange) {
  const state = defaultInstrumentState();
  const emit = () => onChange?.(copyInstrumentState(state));
  const flash = (key) => {
    const panel = document.querySelector(`[data-instrument="${key}"], [data-instrument-panel="${key}"]`);
    if (!panel) return;
    gsap.fromTo(panel, { opacity: 0.68 }, { opacity: 1, duration: 0.38, ease: 'power3.out', overwrite: 'auto' });
  };
  const update = (key) => {
    updateInstrumentOutputs(state);
    flash(key);
    emit();
  };
  const resetInstrument = (key) => {
    if (key === 'origin') state.origin = 'neutral';
    if (key === 'material') state.material = { roughness: 1, gloss: 0, softness: 0 };
    if (key === 'signal') state.signal = { speed: 0.2, chaos: 0.2, touch: 0.35 };
    if (key === 'release') state.release = 'hold';
    update(key);
  };

  document.querySelectorAll('[data-instrument-control]').forEach((control) => {
    const key = control.dataset.instrumentKey;
    if (!key) return;
    const apply = () => {
      const value = control.type === 'range'
        ? Number(control.value) / 100
        : control.dataset.instrumentValue;
      setInstrumentValue(state, key, value);
      update(key.split('.')[0]);
    };
    control.addEventListener(control.type === 'range' ? 'input' : 'click', apply);
  });

  const triggers = [...document.querySelectorAll('[data-instrument]')].map((instrument) => {
    const key = instrument.dataset.instrument;
    const chapter = instrument.closest('.chapter');
    if (!key || !chapter) return undefined;
    return ScrollTrigger.create({
      trigger: chapter,
      start: 'top 20%',
      end: 'bottom 20%',
      onLeave: () => resetInstrument(key),
      onLeaveBack: () => resetInstrument(key)
    });
  }).filter(Boolean);

  updateInstrumentOutputs(state);
  emit();
  return { destroy: () => triggers.forEach((trigger) => trigger.kill()) };
}

export function mountReadingResponses() {
  document.querySelectorAll('[data-reading-sweep]').forEach((element) => {
    element.addEventListener('pointermove', (event) => {
      const rect = element.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (event.clientX - rect.left) / Math.max(1, rect.width)));
      element.style.setProperty('--reading-progress', `${(progress * 100).toFixed(1)}%`);
    });
    element.addEventListener('pointerleave', () => {
      element.style.setProperty('--reading-progress', '0%');
    });
  });
}
