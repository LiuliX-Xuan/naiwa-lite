import { getElasticDisplacements } from './interactive-effects.js';

function applyElasticOffsets(glyphs, offsets) {
  glyphs.forEach((glyph, index) => {
    const offset = offsets[index] ?? { x: 0, y: 0 };
    glyph.style.transform = `translate3d(${offset.x}px, ${offset.y}px, 0)`;
  });
}

function pulseElasticText(element, glyphs, index) {
  element.classList.add('is-returning');
  applyElasticOffsets(glyphs, getElasticDisplacements({
    length: glyphs.length,
    activeIndex: index,
    dragX: 0,
    dragY: -12,
    follow: Number(element.dataset.follow || 10)
  }));

  window.setTimeout(() => {
    applyElasticOffsets(glyphs, getElasticDisplacements({ length: glyphs.length }));
    window.setTimeout(() => element.classList.remove('is-returning'), 520);
  }, 100);
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

  const follow = Number(element.dataset.follow || 10);
  let drag;

  const reset = () => applyElasticOffsets(glyphs, getElasticDisplacements({ length: glyphs.length }));
  const render = () => applyElasticOffsets(glyphs, getElasticDisplacements({
    length: glyphs.length,
    activeIndex: drag?.index ?? -1,
    dragX: drag?.x ?? 0,
    dragY: drag?.y ?? 0,
    follow
  }));

  element.addEventListener('pointerdown', (event) => {
    const glyph = event.target.closest('.elastic-glyph');
    if (!glyph || event.pointerType === 'touch') return;

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
    drag.x = event.clientX - drag.startX;
    drag.y = event.clientY - drag.startY;
    render();
  });

  const release = (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag = undefined;
    element.classList.add('is-returning');
    reset();
    window.setTimeout(() => element.classList.remove('is-returning'), 520);
  };

  element.addEventListener('pointerup', release);
  element.addEventListener('pointercancel', release);
  element.addEventListener('focusin', (event) => {
    const index = Number(event.target.closest('.elastic-glyph')?.dataset.index ?? 0);
    pulseElasticText(element, glyphs, index);
  });
  element.addEventListener('pointerup', (event) => {
    if (event.pointerType !== 'touch') return;
    const index = Number(event.target.closest('.elastic-glyph')?.dataset.index ?? 0);
    pulseElasticText(element, glyphs, index);
  });
}

function mountMagneticTarget(element) {
  let frame;
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;

  const render = () => {
    currentX += (targetX - currentX) * 0.2;
    currentY += (targetY - currentY) * 0.2;
    element.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;
    if (Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05) {
      frame = window.requestAnimationFrame(render);
    } else {
      frame = undefined;
    }
  };

  const schedule = () => {
    if (!frame) frame = window.requestAnimationFrame(render);
  };

  element.addEventListener('pointermove', (event) => {
    const rect = element.getBoundingClientRect();
    targetX = (event.clientX - rect.left - rect.width / 2) * 0.12;
    targetY = (event.clientY - rect.top - rect.height / 2) * 0.12;
    schedule();
  });
  element.addEventListener('pointerleave', () => {
    targetX = 0;
    targetY = 0;
    schedule();
  });
  element.addEventListener('focus', () => {
    targetY = -2;
    schedule();
  });
  element.addEventListener('blur', () => {
    targetX = 0;
    targetY = 0;
    schedule();
  });
}

export function mountTextInteractions() {
  document.querySelectorAll('[data-elastic-text]').forEach(mountElasticText);
  document.querySelectorAll('[data-magnetic]').forEach(mountMagneticTarget);
}

export function mountPointerResponses() {
  const trail = document.querySelector('.fluid-trail');
  const targets = [...document.querySelectorAll('[data-trail-target]')];
  let activeTarget;

  targets.forEach((target) => {
    target.addEventListener('pointerenter', () => {
      activeTarget = target;
      trail?.classList.add('is-active');
    });
    target.addEventListener('pointerleave', () => {
      if (activeTarget !== target) return;
      activeTarget = undefined;
      trail?.classList.remove('is-active');
    });
  });

  window.addEventListener('pointermove', (event) => {
    document.documentElement.style.setProperty('--trail-x', `${event.clientX}px`);
    document.documentElement.style.setProperty('--trail-y', `${event.clientY}px`);
  }, { passive: true });

  document.querySelectorAll('[data-reading-sweep]').forEach((element) => {
    element.addEventListener('pointermove', (event) => {
      const rect = element.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (event.clientX - rect.left) / Math.max(1, rect.width)));
      element.style.setProperty('--reading-progress', `${(progress * 100).toFixed(1)}%`);
    });
  });
}
