import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('form chapter aligns its material console with the left content row', async () => {
  const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.match(css, /\.chapter-form\s*\{[^}]*display:\s*grid/);
  assert.match(css, /\.chapter-form\s*\{[^}]*align-content:\s*start/);
  assert.match(css, /\.chapter-form \.material-console\s*\{[^}]*position:\s*relative/);
  assert.match(css, /\.chapter-form \.material-console\s*\{[^}]*right:\s*auto/);
  assert.match(css, /\.chapter-form \.material-console\s*\{[^}]*transform:\s*none/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.chapter-form \.material-console\s*\{[^}]*margin:[^;]*auto/);
});

test('terminal wordmark locks the rounded display font before rasterizing', async () => {
  const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const motion = await readFile(new URL('../src/motion-effects.js', import.meta.url), 'utf8');
  const warp = await readFile(new URL('../src/warp-text.js', import.meta.url), 'utf8');

  assert.match(css, /\.terminal-warp\s*\{[^}]*font-family:\s*'ZCOOL QingKe HuangYou'/);
  assert.match(motion, /fontFamily:\s*"'ZCOOL QingKe HuangYou', 'PingFang SC', 'Microsoft YaHei UI', 'Microsoft YaHei', sans-serif"/);
  assert.match(warp, /document\.fonts\?\.load/);
});

test('signal speed drives visible particle motion and centers its control block', async () => {
  const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');

  assert.match(main, /float signalTime = uTime \* \(1\.0 \+ uParticleSpeed \* 8\.5\)/);
  assert.match(main, /float speedFlow = sin\(aPhase \* 3\.7 \+ signalTime \* 0\.0018\)/);
  assert.match(main, /speedFlow \* 0\.09 \* uParticleSpeed/);
  assert.match(css, /\.chapter-signal\s*\{[^}]*display:\s*grid/);
  assert.match(css, /\.signal-console\s*\{[^}]*position:\s*relative[^}]*right:\s*auto[^}]*justify-self:\s*end/);
  assert.match(css, /\.signal-console\s*\{[^}]*align-self:\s*center/);
  assert.match(css, /\.signal-console\s*\{[^}]*transform:\s*none/);
});
