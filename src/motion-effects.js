import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { mountWarpText } from './warp-text.js';

gsap.registerPlugin(ScrollTrigger);

const chapterSupportSelector = [
  '.chapter-copy',
  '.chapter-index',
  '.origin-traits',
  '.material-console',
  '.material-specs',
  '.signal-readout',
  '.signal-console',
  '.signal-footer',
  '.release-notes',
  '.release-footer'
].join(', ');

function collectChapterTargets(chapter) {
  return {
    eyebrow: chapter.querySelector('.eyebrow'),
    titleLines: [...chapter.querySelectorAll('.type-line > span')],
    support: [...chapter.querySelectorAll(chapterSupportSelector)]
  };
}

function createChapterTimeline(chapter) {
  const { eyebrow, titleLines, support } = collectChapterTargets(chapter);
  const audioPortrait = chapter.querySelector('.audio-portrait');
  const displayOpacity = () => (window.innerWidth < 760 ? 0.5 : 0.78);

  gsap.set(chapter, {
    '--chapter-display-y': '26px',
    '--chapter-display-opacity': 0.24
  });
  if (eyebrow) gsap.set(eyebrow, { autoAlpha: 0, y: 18 });
  if (titleLines.length) gsap.set(titleLines, { autoAlpha: 0, yPercent: 112, rotation: 2 });
  if (support.length) gsap.set(support, { autoAlpha: 0 });
  if (audioPortrait) {
    gsap.set(audioPortrait, { autoAlpha: 0, y: 32, scale: 0.92, transformOrigin: '50% 50%' });
    gsap.set(audioPortrait, { yPercent: -50 });
  }

  const timeline = gsap.timeline({
    defaults: { ease: 'power3.out' },
    scrollTrigger: {
      trigger: chapter,
      start: 'top 72%',
      end: 'bottom 24%',
      toggleActions: 'play none none reverse',
      invalidateOnRefresh: true
    }
  });

  timeline.to(chapter, {
    '--chapter-display-y': '0px',
    '--chapter-display-opacity': displayOpacity,
    duration: 0.55
  });
  if (eyebrow) timeline.to(eyebrow, { autoAlpha: 1, y: 0, duration: 0.42 }, 0.08);
  if (titleLines.length) {
    timeline.to(titleLines, {
      autoAlpha: 1,
      yPercent: 0,
      rotation: 0,
      duration: 0.76,
      stagger: 0.1
    }, 0.16);
  }
  if (support.length) {
    timeline.to(support, {
      autoAlpha: 1,
      duration: 0.4,
      stagger: 0.06
    }, 0.42);
  }
  if (audioPortrait) {
    timeline.to(audioPortrait, {
      autoAlpha: 1,
      y: 0,
      scale: 1,
      duration: 0.64
    }, 0.28);
  }

  return timeline;
}

function createTerminalTimeline() {
  const terminal = document.querySelector('.terminal-mark');
  if (!terminal) return undefined;

  const wordmark = terminal.querySelector('[data-terminal-wordmark]');
  const warp = mountWarpText(wordmark, {
    text: '奶蛙',
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
    fontFamily: "'ZCOOL QingKe HuangYou', 'PingFang SC', 'Microsoft YaHei UI', 'Microsoft YaHei', sans-serif",
    letterSpacing: '0.35em'
  });
  const burst = { energy: 0 };

  gsap.set(terminal, { autoAlpha: 0, yPercent: 32, scale: 0.74, transformOrigin: '50% 50%' });
  if (wordmark) gsap.set(wordmark, { autoAlpha: 0, scale: 0.12, rotation: -9, transformOrigin: '50% 50%' });
  const timeline = gsap.timeline({
    scrollTrigger: {
      trigger: terminal,
      start: 'center 68%',
      end: 'center 34%',
      toggleActions: 'play none none reverse',
      invalidateOnRefresh: true
    }
  });

  timeline.addLabel('arrival')
    .to(terminal, { autoAlpha: 1, yPercent: 0, scale: 1, duration: 0.36, ease: 'power2.out' }, 'arrival')
    .to(wordmark, { autoAlpha: 1, scale: 1.18, rotation: 0, duration: 0.85, ease: 'expo.out' }, 'arrival+=0.04')
    .to(burst, { energy: 1, duration: 0.42, ease: 'power4.out', onUpdate: () => warp?.setBurst(burst.energy) }, 'arrival+=0.25')
    .addLabel('bounce', 'arrival+=0.93')
    .to(wordmark, { scaleX: .8, scaleY: 1.24, duration: 0.13, ease: 'power2.in' }, 'bounce')
    .to(wordmark, { scaleX: 1.13, scaleY: .91, duration: 0.17, ease: 'power2.out' }, 'bounce+=0.13')
    .to(wordmark, { scale: 1, duration: 0.54, ease: 'elastic.out(1, 0.22)' }, 'bounce+=0.3')
    .to(burst, { energy: 0, duration: 0.72, ease: 'power3.out', onUpdate: () => warp?.setBurst(burst.energy) }, 'bounce+=0.04');

  return {
    kill() {
      timeline.kill();
      warp?.destroy();
    }
  };
}

function createFullMotion() {
  const canvas = document.querySelector('#scene');
  const loading = document.querySelector('#loading');
  const header = document.querySelector('.site-header');
  const heroEyebrow = document.querySelector('.hero .eyebrow');
  const heroTitle = document.querySelector('.hero-title');
  const heroGlyphs = [...document.querySelectorAll('.hero-title .elastic-glyph')];
  const heroTitleMeta = document.querySelector('.hero-title-meta');
  const heroSupporting = [
    document.querySelector('.hero-subtitle'),
    document.querySelector('.hero-note'),
    document.querySelector('.hero-side-note'),
    document.querySelector('.scroll-cue'),
    document.querySelector('.hud')
  ].filter(Boolean);

  if (canvas) gsap.set(canvas, { autoAlpha: 0, scale: 0.94, transformOrigin: '50% 52%' });
  if (header) gsap.set(header, { autoAlpha: 0, y: -18 });
  if (heroEyebrow) gsap.set(heroEyebrow, { autoAlpha: 0, y: 18 });
  if (heroTitle) gsap.set(heroTitle, { '--hero-ghost-opacity': 0 });
  if (heroGlyphs.length) gsap.set(heroGlyphs, { autoAlpha: 0, yPercent: 118, rotation: 2, transformOrigin: '50% 100%' });
  if (heroTitleMeta) gsap.set(heroTitleMeta, { autoAlpha: 0 });
  if (heroSupporting.length) gsap.set(heroSupporting, { autoAlpha: 0 });

  const chapterTimelines = [...document.querySelectorAll('.chapter')].map(createChapterTimeline);
  const terminalTimeline = createTerminalTimeline();
  const intro = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });

  intro.addLabel('reveal')
    .to(loading, { autoAlpha: 0, y: -8, duration: 0.24 }, 'reveal')
    .to(canvas, { autoAlpha: 1, scale: 1, duration: 1.08 }, 'reveal+=0.04')
    .to(header, { autoAlpha: 1, y: 0, duration: 0.54 }, 'reveal+=0.1')
    .to(heroEyebrow, { autoAlpha: 1, y: 0, duration: 0.44 }, 'reveal+=0.34')
    .addLabel('title')
    .to(heroGlyphs, {
      autoAlpha: 1,
      yPercent: 0,
      rotation: 0,
      duration: 0.82,
      stagger: 0.07,
      ease: 'power4.out'
    }, 'title')
    .to(heroTitle, { '--hero-ghost-opacity': 0.48, duration: 0.44 }, 'title+=0.08')
    .to(heroTitleMeta, { autoAlpha: 1, duration: 0.36 }, 'title+=0.28')
    .to(heroSupporting, { autoAlpha: 1, duration: 0.42, stagger: 0.08 }, 'title+=0.4')
    .set([heroEyebrow, ...heroGlyphs].filter(Boolean), { clearProps: 'transform' });

  return {
    playIntro() {
      intro.restart();
      requestAnimationFrame(() => ScrollTrigger.refresh());
    },
    revealFallback() {
      gsap.set([canvas, header, heroEyebrow, heroTitle, heroTitleMeta, ...heroGlyphs, ...heroSupporting].filter(Boolean), {
        autoAlpha: 1,
        clearProps: 'transform'
      });
      if (heroTitle) gsap.set(heroTitle, { '--hero-ghost-opacity': 0.48 });
    },
    destroy() {
      intro.kill();
      chapterTimelines.forEach((timeline) => timeline.kill());
      terminalTimeline?.kill();
    }
  };
}

function createReducedMotion() {
  const reducedMotionPortraits = [...document.querySelectorAll('.audio-portrait')];
  const visible = [
    document.querySelector('#scene'),
    document.querySelector('.site-header'),
    document.querySelector('.hero .eyebrow'),
    document.querySelector('.hero-title'),
    document.querySelector('.hero-title-meta'),
    ...document.querySelectorAll('.hero-title .elastic-glyph, .hero-subtitle, .hero-note, .hero-side-note, .scroll-cue, .hud'),
    document.querySelector('.terminal-mark')
  ].filter(Boolean);

  gsap.set(visible, { autoAlpha: 1, clearProps: 'transform' });
  gsap.set(reducedMotionPortraits, { autoAlpha: 1, clearProps: 'transform' });
  gsap.set(document.querySelector('.hero-title'), { '--hero-ghost-opacity': 0.48 });
  return {
    playIntro() {
      document.querySelector('#loading')?.classList.add('is-hidden');
    },
    revealFallback() {},
    destroy() {}
  };
}

export function mountMotionEffects() {
  let controls;
  const media = gsap.matchMedia();

  media.add({
    reducedMotion: '(prefers-reduced-motion: reduce)',
    fullMotion: '(prefers-reduced-motion: no-preference)'
  }, (context) => {
    controls = context.conditions.reducedMotion ? createReducedMotion() : createFullMotion();
    return () => controls?.destroy();
  });

  document.fonts?.ready.then(() => ScrollTrigger.refresh());

  return {
    playIntro() {
      controls?.playIntro();
    },
    revealFallback() {
      controls?.revealFallback();
    },
    destroy() {
      media.revert();
    }
  };
}
