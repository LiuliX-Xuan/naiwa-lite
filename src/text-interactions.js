import { gsap } from 'gsap';
import { getElasticDisplacements } from './interactive-effects.js';

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

export function mountOriginComponents() {
  const profile = document.querySelector('.origin-profile');
  const detail = profile?.querySelector('.origin-profile-detail');
  if (!profile || !detail || profile.dataset.originMounted === 'true') return;

  profile.dataset.originMounted = 'true';
  const controls = [...document.querySelectorAll('button[data-origin-tab]')];
  const detailTitle = detail.querySelector('strong');
  const detailCopy = detail.querySelector('p');

  const setActiveTab = (name) => {
    const source = profile.querySelector(`.origin-tab[data-origin-tab="${name}"]`);
    if (!source) return;

    document.querySelectorAll('.origin-tab').forEach((tab) => {
      const active = tab.dataset.originTab === name;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll('.origin-trait').forEach((trait) => {
      trait.classList.toggle('is-active', trait.dataset.originTab === name);
    });
    if (detailTitle) detailTitle.textContent = source.dataset.originTitle || '';
    if (detailCopy) detailCopy.textContent = source.dataset.originDetail || '';
    gsap.fromTo(detail, { autoAlpha: 0.42, y: 5 }, { autoAlpha: 1, y: 0, duration: 0.34, ease: 'power3.out', overwrite: 'auto' });
  };

  controls.forEach((control) => {
    control.addEventListener('click', () => setActiveTab(control.dataset.originTab));
    control.addEventListener('focus', () => setActiveTab(control.dataset.originTab));
  });
}

export function mountPointerResponses() {
  const trail = document.querySelector('.fluid-trail');
  const targets = [...document.querySelectorAll('[data-trail-target]')];
  const xTo = trail ? gsap.quickTo(trail, 'x', { duration: 0.2, ease: 'power3.out', overwrite: 'auto' }) : undefined;
  const yTo = trail ? gsap.quickTo(trail, 'y', { duration: 0.2, ease: 'power3.out', overwrite: 'auto' }) : undefined;
  let activeTarget;

  if (trail) gsap.set(trail, { x: -100, y: -100, scale: 0.6 });

  targets.forEach((target) => {
    target.addEventListener('pointerenter', () => {
      activeTarget = target;
      trail?.classList.add('is-active');
      gsap.to(trail, { autoAlpha: 1, scale: 1, duration: 0.2, ease: 'power3.out', overwrite: 'auto' });
    });
    target.addEventListener('pointerleave', () => {
      if (activeTarget !== target) return;
      activeTarget = undefined;
      trail?.classList.remove('is-active');
      gsap.to(trail, { autoAlpha: 0, scale: 0.6, duration: 0.16, ease: 'power2.out', overwrite: 'auto' });
    });
  });

  window.addEventListener('pointermove', (event) => {
    xTo?.(event.clientX - 12);
    yTo?.(event.clientY - 12);
  }, { passive: true });

  document.querySelectorAll('[data-reading-sweep]').forEach((element) => {
    element.addEventListener('pointermove', (event) => {
      const rect = element.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (event.clientX - rect.left) / Math.max(1, rect.width)));
      element.style.setProperty('--reading-progress', `${(progress * 100).toFixed(1)}%`);
    });
  });
}
