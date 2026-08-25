import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { canUseWarpText } from '../src/warp-text.js';
import { getElasticDisplacements, getSpectacleScrollState } from '../src/interactive-effects.js';
import { mountTextInteractions } from '../src/text-interactions.js';

test('elastic displacement keeps the dragged glyph strongest and fades across neighbours', () => {
  const offsets = getElasticDisplacements({ length: 5, activeIndex: 2, dragX: 42, dragY: -18, follow: 10 });

  assert.equal(offsets.length, 5);
  assert.equal(offsets[2].x, 42);
  assert.equal(offsets[2].y, -18);
  assert.ok(Math.abs(offsets[1].x) > Math.abs(offsets[0].x));
  assert.ok(Math.abs(offsets[3].y) > Math.abs(offsets[4].y));
});

test('spectacle scroll state reserves the tunnel for the release range', () => {
  const hero = getSpectacleScrollState(0);
  const signal = getSpectacleScrollState(0.7);
  const release = getSpectacleScrollState(0.94);

  assert.ok(hero.ripple > 0.4);
  assert.ok(hero.ripple <= 0.5);
  assert.equal(hero.grid, 0);
  assert.ok(signal.grid > 0.5);
  assert.equal(signal.tunnel, 0);
  assert.ok(release.tunnel > 0.7);
});

test('story exposes elastic words and magnetic targets without a cursor ring layer', async () => {
  const page = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(page, /data-elastic-text/);
  assert.match(page, /data-magnetic/);
  assert.match(page, /data-trail-target/);
  assert.doesNotMatch(page, /fluid-trail/);
  assert.doesNotMatch(page, /ripple-field/);
  assert.equal((page.match(/data-elastic-text/g) || []).length, 13);
});

test('text interaction module exposes the elastic text mount', () => {
  assert.equal(typeof mountTextInteractions, 'function');
});

test('chapters expose resettable archive instrument controls and a terminal wordmark', async () => {
  const page = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(page, /data-instrument="origin"/);
  assert.match(page, /data-instrument="material"/);
  assert.match(page, /data-instrument="signal"/);
  assert.match(page, /data-instrument="release"/);
  assert.match(page, /data-instrument-control/);
  assert.match(page, /class="terminal-mark"/);
  assert.match(page, /data-instrument-key="signal\.speed"/);
  assert.match(page, /data-instrument-key="signal\.chaos"/);
  assert.match(page, /data-instrument-key="signal\.touch"/);
  assert.doesNotMatch(page, /data-instrument-value="pulse"/);
});

test('terminal wordmark is prepared as a centered burst finale', async () => {
  const page = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const motion = await readFile(new URL('../src/motion-effects.js', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const warpText = await readFile(new URL('../src/warp-text.js', import.meta.url), 'utf8');

  assert.match(page, /data-terminal-wordmark/);
  assert.match(page, /class="terminal-warp"/);
  assert.match(page, /data-terminal-text="奶蛙"/);
  assert.match(page, /class="terminal-fallback">奶蛙</);
  assert.match(motion, /mountWarpText/);
  assert.match(motion, /text: '奶蛙'/);
  assert.doesNotMatch(motion, /xPercent: -50/);
  assert.match(motion, /elastic\.out/);
  assert.doesNotMatch(motion, /scrub: 0\.8/);
  assert.match(motion, /toggleActions: 'play none none reverse'/);
  assert.match(motion, /start: 'center 68%'/);
  assert.match(motion, /end: 'center 34%'/);
  assert.match(motion, /fontFamily: "'ZCOOL QingKe HuangYou', 'PingFang SC', 'Microsoft YaHei UI', 'Microsoft YaHei', sans-serif"/);
  assert.match(motion, /duration: 0\.36/);
  assert.match(motion, /duration: 0\.85/);
  assert.match(motion, /addLabel\('bounce', 'arrival\+=0\.93'\)/);
  assert.match(motion, /duration: 0\.54/);
  assert.match(motion, /duration: 0\.72/);
  assert.match(motion, /scaleX: \.8, scaleY: 1\.24/);
  assert.match(motion, /scaleX: 1\.13, scaleY: \.91/);
  assert.match(motion, /elastic\.out\(1, 0\.22\)/);
  assert.match(styles, /\.terminal-mark \{[^}]*left: 0/);
  assert.match(styles, /\.terminal-warp \{[^}]*min-height: 220px/);
  assert.match(styles, /\.terminal-mark \{[^}]*left: 0/);
  assert.match(styles, /\.terminal-mark \{[^}]*right: 0/);
  assert.match(styles, /\.terminal-mark \{[^}]*width: 100%/);
  assert.match(styles, /\.terminal-mark \{[^}]*bottom: calc\(clamp\(154px, 20vh, 240px\) \+ 15vh\)/);
  assert.doesNotMatch(styles, /\.terminal-warp \{[^}]*transform:/);
  assert.match(styles, /\.terminal-warp \{[^}]*font-size: clamp\(6\.6rem, 18\.48vw, 17\.16rem\)/);
  assert.match(styles, /\.terminal-warp \{[^}]*font-family: 'ZCOOL QingKe HuangYou'/);
  assert.match(styles, /\.terminal-warp \{[^}]*font-weight: 400/);
  assert.match(styles, /\.terminal-fallback \{[^}]*letter-spacing: \.35em/);
  assert.match(styles, /\.terminal-fallback \{[^}]*text-shadow: 0 6px 0 rgba\(216, 184, 68, \.28\)/);
  assert.match(styles, /@media \(max-width: 760px\)[\s\S]*\.terminal-warp \{ width: min\(92vw, 620px\); \}/);
  assert.match(styles, /@media \(max-width: 760px\)[\s\S]*\.terminal-mark \{ bottom: calc\(clamp\(132px, 18vh, 188px\) \+ 15vh\); \}/);
  assert.doesNotMatch(styles, /@media \(max-width: 760px\)[\s\S]*\.terminal-mark \{ bottom: 12vh; width:/);
  assert.match(styles, /\.terminal-fallback \{[^}]*color: var\(--yellow\)/);
  assert.match(warpText, /from 'ogl'/);
  assert.match(warpText, /#version 300 es/);
  assert.match(warpText, /uWarpStrength/);
  assert.match(warpText, /uPointerInfluence/);
  assert.match(warpText, /uPointerActive/);
  assert.match(warpText, /uMotion/);
  assert.match(warpText, /uPointerStrength \* 0\.045 \* uPointerActive/);
  assert.match(warpText, /texture\.needsUpdate/);
  assert.match(warpText, /height: '320px'/);
  assert.match(warpText, /terminalText \|\| '奶蛙'/);
  assert.match(warpText, /refraction: 0\.018/);
  assert.match(warpText, /fontSize: 'clamp\(6\.6rem, 18\.48vw, 17\.16rem\)'/);
  assert.match(warpText, /fontWeight: 400/);
  assert.match(warpText, /letterSpacing: '0\.35em'/);
  assert.match(warpText, /uMotion: \{ value: 0\.12 \}/);
  assert.match(warpText, /pointer\.activeTarget > 0 \? 1 : 0/);
  assert.match(warpText, /0\.12 \+ burstEnergy \* 0\.65/);
  assert.match(warpText, /element\.style\.height = props\.height/);
  assert.match(warpText, /element\.clientWidth/);
  assert.match(warpText, /element\.clientHeight/);
  assert.match(warpText, /fontFamily: options\.fontFamily \|\| window\.getComputedStyle\(element\)\.fontFamily \|\| 'sans-serif'/);
  assert.match(warpText, /canvas\.style\.width = '100%'/);
  assert.match(warpText, /canvas\.style\.height = '100%'/);
  assert.match(motion, /color: '#f1d865'/);
  assert.match(motion, /refraction: 0\.018/);
  assert.match(motion, /fontSize: 'clamp\(6\.6rem, 18\.48vw, 17\.16rem\)'/);
  assert.match(motion, /fontWeight: 400/);
  assert.match(motion, /letterSpacing: '0\.35em'/);
  assert.match(motion, /scale: 1\.18/);
  assert.doesNotMatch(motion, /scale: 1\.1(?:,|\s*})/);
  assert.doesNotMatch(motion, /xPercent: -50/);
});

test('WarpText preserves the centered text fallback when WebGL is unavailable', () => {
  const element = {};
  const unavailableCanvas = { getContext: () => null };
  const webglOneCanvas = { getContext: (kind) => (kind === 'webgl' ? {} : null) };
  const webglTwoCanvas = { getContext: (kind) => (kind === 'webgl2' ? {} : null) };

  assert.equal(canUseWarpText(undefined, { WebGLRenderingContext: true, createCanvas: () => webglTwoCanvas }), false);
  assert.equal(canUseWarpText(element, { WebGLRenderingContext: false, createCanvas: () => webglTwoCanvas }), false);
  assert.equal(canUseWarpText(element, { WebGLRenderingContext: true, createCanvas: () => unavailableCanvas }), false);
  assert.equal(canUseWarpText(element, { WebGLRenderingContext: true, createCanvas: () => webglOneCanvas }), false);
  assert.equal(canUseWarpText(element, { WebGLRenderingContext: true, createCanvas: () => webglTwoCanvas }), true);
});

test('instrument controls emit chapter-local state and reset with ScrollTrigger', async () => {
  const entry = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  const interactions = await readFile(new URL('../src/text-interactions.js', import.meta.url), 'utf8');

  assert.match(entry, /mountInstrumentControls/);
  assert.match(entry, /getInstrumentSceneState/);
  assert.match(interactions, /ScrollTrigger/);
  assert.match(interactions, /data-instrument-control/);
  assert.match(interactions, /resetInstrument/);
});

test('GSAP entrance layer sequences hero reveal and reversible chapter entry', async () => {
  const motion = await readFile(new URL('../src/motion-effects.js', import.meta.url), 'utf8').catch(() => '');

  assert.match(motion, /gsap\.timeline/);
  assert.match(motion, /ScrollTrigger/);
  assert.match(motion, /playIntro/);
  assert.match(motion, /prefers-reduced-motion/);
  assert.match(motion, /terminal-mark/);
  assert.match(motion, /toggleActions: 'play none none reverse'/);
  assert.match(motion, /trigger: terminal/);
  assert.match(motion, /start: 'center 68%'/);
  assert.match(motion, /end: 'center 34%'/);
});

test('text and hover interactions use GSAP for responsive transform motion', async () => {
  const interactions = await readFile(new URL('../src/text-interactions.js', import.meta.url), 'utf8');

  assert.match(interactions, /gsap\.quickTo/);
  assert.match(interactions, /elastic\.out/);
});

test('elastic drag uses synchronous GSAP setters and blocks native text selection', async () => {
  const interactions = await readFile(new URL('../src/text-interactions.js', import.meta.url), 'utf8');
  const pointerdownStart = interactions.indexOf("element.addEventListener('pointerdown'");
  const pointermoveStart = interactions.indexOf("element.addEventListener('pointermove'");
  const pointerupStart = interactions.indexOf("element.addEventListener('pointerup', release)");
  const pointerdown = interactions.slice(pointerdownStart, pointermoveStart);
  const pointermove = interactions.slice(pointermoveStart, pointerupStart);

  assert.ok(pointerdownStart >= 0);
  assert.match(interactions, /gsap\.quickSetter/);
  assert.doesNotMatch(pointerdown, /gsap\.killTweensOf\(glyphs\)/);
  assert.match(pointerdown, /event\.preventDefault\(\)/);
  assert.match(interactions, /function resolveElasticGlyph[\s\S]*getBoundingClientRect/);
  assert.match(pointerdown, /event\.clientX/);
  assert.match(pointermove, /event\.preventDefault\(\)/);
});

test('style layer keeps the kinetic grid without a cursor ring or pointer ripple', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.match(styles, /\.kinetic-grid/);
  assert.doesNotMatch(styles, /\.fluid-trail/);
  assert.doesNotMatch(styles, /\.ripple-field/);
  assert.doesNotMatch(styles, /--pointer-x/);
  assert.doesNotMatch(styles, /--pointer-y/);
  assert.match(styles, /\.elastic-text\.is-returning/);
  assert.match(styles, /\[data-reading-sweep\]/);
  assert.match(styles, /\.type-line\s*\{[^}]*overflow:\s*visible/);
});

test('chapter display keeps the editorial art layer visible before scroll reveal', async () => {
  const motion = await readFile(new URL('../src/motion-effects.js', import.meta.url), 'utf8');

  assert.match(motion, /'--chapter-display-opacity':\s*0\.24/);
  assert.match(motion, /'--chapter-display-opacity':\s*displayOpacity/);
});

test('reading interactions stay available without cursor coordinate state', async () => {
  const interactions = await readFile(new URL('../src/text-interactions.js', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.doesNotMatch(interactions, /fluid-trail/);
  assert.match(interactions, /\[data-reading-sweep\]/);
  assert.doesNotMatch(interactions, /--trail-x/);
  assert.doesNotMatch(interactions, /--trail-y/);
  assert.doesNotMatch(interactions, /--pointer-x/);
  assert.doesNotMatch(interactions, /--pointer-y/);
  assert.doesNotMatch(styles, /--trail-x/);
  assert.doesNotMatch(styles, /--trail-y/);
});

test('reading sweep lines contract after the pointer leaves the supporting copy', async () => {
  const interactions = await readFile(new URL('../src/text-interactions.js', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.match(interactions, /element\.addEventListener\('pointerleave'/);
  assert.match(interactions, /setProperty\('--reading-progress', '0%'\)/);
  assert.match(styles, /\[data-reading-sweep\]::after \{[^}]*transition: width \.28s/);
});

test('adjustable instrument controls and their dynamic states are presented in Chinese', async () => {
  const page = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const interactions = await readFile(new URL('../src/text-interactions.js', import.meta.url), 'utf8');

  for (const label of ['表面 / 03', '粗糙度', '高光', '柔软度', '粒子响应', '速度', '随机度', '触感', '释放预览', '保持', '轨迹', '扩散']) {
    assert.match(page, new RegExp(`>${label}<`));
  }
  assert.match(interactions, /releaseStateLabels/);
  assert.match(interactions, /保持/);
  assert.match(interactions, /轨迹/);
  assert.match(interactions, /扩散/);
});

test('material controls initialize and reset as a fully rough, unglossed, rigid surface', async () => {
  const page = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const interactions = await readFile(new URL('../src/text-interactions.js', import.meta.url), 'utf8');

  assert.match(page, /<input(?=[^>]*value="100")(?=[^>]*data-instrument-key="material\.roughness")/);
  assert.match(page, /<input(?=[^>]*value="0")(?=[^>]*data-instrument-key="material\.gloss")/);
  assert.match(page, /<input(?=[^>]*value="0")(?=[^>]*data-instrument-key="material\.softness")/);
  assert.match(interactions, /material: \{ roughness: 1, gloss: 0, softness: 0 \}/);
  assert.match(interactions, /state\.material = \{ roughness: 1, gloss: 0, softness: 0 \}/);
});

test('elastic text styling follows the mounted data attribute', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.match(styles, /\[data-elastic-text\]\.is-returning/);
  assert.match(styles, /\[data-elastic-text\]\[data-trail-target\]\s*\{[^}]*cursor:\s*grab/);
  assert.match(styles, /\[data-elastic-text\]\.is-returning\s+\.elastic-glyph\s*\{[^}]*transition-duration:\s*\.78s/);
});

test('major supporting readouts remain interactive alongside the display text', async () => {
  const page = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  for (const className of ['hero-note', 'hero-side-note', 'scroll-cue', 'signal-footer', 'release-footer', 'hud']) {
    assert.match(page, new RegExp(`class="${className}"[^>]*data-(?:magnetic|trail-target)`));
  }
  for (const className of ['material-console', 'signal-console', 'release-console']) {
    assert.match(page, new RegExp(`class="${className} instrument-panel"[^>]*data-instrument`));
  }
  assert.match(page, /class="origin-trait is-active"[^>]*data-instrument-control/);
});

test('HUD removes the floating scroll value and progress meter', async () => {
  const page = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const entry = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.doesNotMatch(page, /id="scroll-label"/);
  assert.doesNotMatch(page, /id="meter-fill"/);
  assert.doesNotMatch(entry, /scrollLabel/);
  assert.doesNotMatch(entry, /meterFill/);
  assert.doesNotMatch(styles, /\.hud-meter/);
  assert.doesNotMatch(styles, /#meter-fill/);
});

test('initial loading guard prevents the raw story flash before GSAP takes over', async () => {
  const page = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const entry = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.match(page, /document\.documentElement\.classList\.add\('app-loading'\)/);
  assert.match(entry, /classList\.remove\('app-loading'\)/);
  assert.match(styles, /html\.app-loading\s+\.story/);
});

test('font loading cannot keep the whole application hidden indefinitely', async () => {
  const entry = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');

  assert.match(entry, /Promise\.race\(\[[\s\S]*document\.fonts\?\.ready[\s\S]*setTimeout\(resolve, 1200\)/);
});

test('hero ghost lettering waits for the rounded title reveal instead of flashing alone', async () => {
  const entry = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  const motion = await readFile(new URL('../src/motion-effects.js', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.match(entry, /document\.fonts\?\.ready \?\? Promise\.resolve/);
  assert.match(entry, /revealApplication/);
  assert.match(styles, /--hero-ghost-opacity/);
  assert.match(motion, /heroTitle/);
  assert.match(motion, /'--hero-ghost-opacity': 0/);
  assert.match(motion, /'--hero-ghost-opacity': 0\.48/);
});

test('material controls replace the origin profile on the right side of the form chapter', async () => {
  const page = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const formStart = page.indexOf('<section id="form"');
  const materialStart = page.indexOf('<section id="material"');
  const materialConsole = page.indexOf('<aside class="material-console instrument-panel"');

  assert.ok(formStart >= 0);
  assert.ok(materialStart > formStart);
  assert.ok(materialConsole > formStart && materialConsole < materialStart);
  assert.doesNotMatch(page, /class="origin-profile/);
  assert.match(styles, /\.chapter-form\s*\{[^}]*display:\s*grid/);
  assert.match(styles, /\.chapter-form \.material-console\s*\{[^}]*right:\s*auto/);
  assert.match(styles, /@media \(max-width: 760px\)[\s\S]*\.chapter-form \.material-console\s*\{[^}]*position:\s*relative/);
});

test('material console is centered on the form title and gives each range a clear live readout', async () => {
  const page = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const interactions = await readFile(new URL('../src/text-interactions.js', import.meta.url), 'utf8');

  assert.match(page, /class="instrument-head"/);
  assert.match(page, /class="instrument-status"/);
  assert.match(page, /class="instrument-summary"/);
  assert.match(styles, /\.chapter-form \.material-console\s*\{[^}]*justify-self:\s*end[^}]*transform:\s*none/);
  assert.match(styles, /\.instrument-range input\s*\{[^}]*--instrument-progress/);
  assert.match(interactions, /control\.style\.setProperty\('--instrument-progress'/);
});

test('material console keeps the scene open with a transparent minimal treatment', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.match(styles, /\.instrument-panel\s*\{[^}]*background:\s*transparent/);
  assert.match(styles, /\.instrument-panel\s*\{[^}]*box-shadow:\s*none/);
  assert.match(styles, /\.instrument-panel\s*\{[^}]*border-radius:\s*0/);
  assert.match(styles, /\.instrument-status\s*\{[^}]*border:\s*0/);
});

test('model entrance uses a soft-gel settle without driving particle release', async () => {
  const entry = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  const introStart = entry.indexOf('function playModelIntro');
  const introEnd = entry.indexOf('\n}\n\nfunction syncIntroState', introStart);
  const intro = entry.slice(introStart, introEnd);

  assert.ok(introStart >= 0);
  assert.match(intro, /modelEntrance/);
  assert.match(intro, /squash/);
  assert.match(intro, /elastic\.out/);
  assert.match(intro, /opacity:\s*1/);
  assert.doesNotMatch(intro, /uBurst/);
  assert.doesNotMatch(intro, /particleSystem/);
});
