import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { build, createServer, preview } from 'vite';

const npmCli = process.env.npm_execpath;
assert(npmCli, 'Run this check with npm run check:library');
const root = fileURLToPath(new URL('../', import.meta.url));
const temp = await realpath(tmpdir());
const fixture = await mkdtemp(path.join(temp, 'bloom-library-'));
const base = '/widgets/';
const host = '127.0.0.1';
const npm = (args, cwd) => execFileSync(process.execPath, [npmCli, ...args], { cwd, encoding: 'utf8', timeout: 90_000 });
const write = (name, source) => writeFile(path.join(fixture, name), source);
const readManifest = async directory => JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8'));

async function installFixture(archive) {
  const packageDir = path.join(fixture, 'node_modules', '@redheadesign', 'widgets');
  await mkdir(packageDir, { recursive: true });
  execFileSync('tar', ['-xzf', path.join(fixture, archive), '-C', packageDir, '--strip-components=1']);
  const { dependencies: runtime, peerDependencies: peers } = await readManifest(root);
  // Reuse the dependency versions installed from this repository's lockfile.
  await Promise.all([...Object.keys(runtime), ...Object.keys(peers), '@types'].map(name =>
    symlink(path.join(root, 'node_modules', name), path.join(fixture, 'node_modules', name), 'junction')));
}

async function checkPage(browser, server) {
  const address = server.address();
  assert(address && typeof address === 'object');
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(`http://${host}:${address.port}${base}`);
    const frame = page.locator('.bw-frame[data-widget="hydration"]');
    await frame.waitFor();
    assert.deepEqual(await frame.evaluate(element => [element.clientWidth, element.clientHeight]), [286, 188]);
    const background = await frame.locator('.bw-card').evaluate(async card => {
      const image = getComputedStyle(card, '::before').backgroundImage.match(/url\("([^"]+\.png)"\)/)?.[1];
      if (!image) return null;
      const response = await fetch(image);
      return response.ok && response.headers.get('content-type');
    });
    assert.equal(background, 'image/png', 'Card background must load through the consuming app');
    const fontLoaded = await page.evaluate(async () => {
      await document.fonts.ready;
      return [...document.fonts].some(font => font.family.includes('Bloom Inter') && font.status === 'loaded');
    });
    assert(fontLoaded, 'The packaged Inter font must load');
    await page.getByRole('button', { name: 'Add a glass of water' }).click();
    assert(await page.getByText('6 glasses', { exact: true }).isVisible());
    const music = page.locator('.bw-frame[data-widget="music"]');
    const audio = music.locator('audio');
    assert.equal(await audio.getAttribute('src'), null, 'Do not download a track before interaction');
    await music.getByRole('button', { name: 'Play track' }).click();
    await page.waitForFunction(() => document.querySelector('audio')?.currentTime > .2);
    await music.getByRole('slider', { name: 'Seek track' }).fill('42');
    assert((await audio.evaluate(element => element.currentTime)) >= 41);
    await music.getByRole('button', { name: 'Pause track' }).click();
    assert(await audio.evaluate(element => element.paused));
    for (let i = 0; i < 5; i++) {
      const src = await audio.evaluate(element => element.src);
      const status = await page.evaluate(async url => (await fetch(url, { method: 'HEAD' })).headers.get('content-type'), src);
      assert.match(status ?? '', /^audio\//, `${src} must resolve to audio`);
      await music.getByRole('button', { name: 'Next track' }).click();
    }
    assert(await music.getByText('Gymnopédie No. 1', { exact: true }).isVisible());
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
}

try {
  const [packed] = JSON.parse(npm(['pack', '--json', '--ignore-scripts', '--pack-destination', fixture], root));
  assert(packed.files.some(file => file.path === 'licenses/Inter-OFL.txt'));
  assert(packed.files.every(file => !/^(src|dist|qa)\//.test(file.path)));
  await installFixture(packed.filename);
  await Promise.all([
    write('package.json', JSON.stringify({ name: 'widgets-library-check', private: true, type: 'module' })),
    write('index.html', '<!doctype html><meta charset="utf-8"><div id="root"></div><script type="module" src="./main.tsx"></script>'),
    write('main.tsx', `
import { createRoot } from 'react-dom/client';
import { Widget, type WidgetProps } from '@redheadesign/widgets';
import '@redheadesign/widgets/style.css';
const props: WidgetProps = { id: 'hydration', fill: true, settings: { reducedMotion: true } };
createRoot(document.querySelector('#root')!).render(<div style={{ width: 286 }}><div style={{ height: 188 }}><Widget {...props} /></div><div style={{ height: 188 }}><Widget id="music" fill /></div></div>);
`),
    write('server.mjs', String.raw`
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Widget, widgetCatalog } from '@redheadesign/widgets';
import { buildTelegramHtml, TELEGRAM_WIDGET_IDS } from '@redheadesign/widgets/telegram';
assert.deepEqual(widgetCatalog.map(widget => widget.id).sort(), [...TELEGRAM_WIDGET_IDS].sort());
const markup = renderToStaticMarkup(createElement(Widget, { id: 'hydration' }));
assert.match(markup, /data-widget="hydration"/);
assert.doesNotMatch(markup, /file:\/\//);
assert.equal(renderToStaticMarkup(createElement(Widget, { id: 'constructor' })), '');
assert.match(buildTelegramHtml('hydration'), /<html[\s>]/);
`),
    write('telegram.ts', `
import { buildTelegramHtml, type TelegramWidgetOptions } from '@redheadesign/widgets/telegram';
const options: TelegramWidgetOptions = { reducedMotion: true };
export const html: string = buildTelegramHtml('hydration', options);
`),
  ]);
  execFileSync(process.execPath, ['server.mjs'], { cwd: fixture, stdio: 'inherit' });
  const tsc = fileURLToPath(import.meta.resolve('typescript/bin/tsc'));
  execFileSync(process.execPath, [tsc, '--strict', '--noEmit', '--target', 'ES2022', '--module', 'NodeNext', '--jsx', 'react-jsx', 'main.tsx', 'telegram.ts'],
    { cwd: fixture, stdio: 'inherit' });

  const browser = await chromium.launch({
    ...(process.env.BLOOM_BROWSER_PATH ? { executablePath: process.env.BLOOM_BROWSER_PATH } : { channel: 'msedge' }),
  });
  const config = { configFile: false, root: fixture, base, esbuild: { jsx: 'automatic' } };
  try {
    const dev = await createServer({ ...config, server: { host, port: 0 } });
    try {
      await dev.listen();
      await checkPage(browser, dev.httpServer);
    } finally {
      await dev.close();
    }
    await build(config);
    const production = await preview({ ...config, preview: { host, port: 0 } });
    try {
      await checkPage(browser, production.httpServer);
    } finally {
      await production.close();
    }
  } finally {
    await browser.close();
  }
  console.log('Installed the archive and verified TypeScript, server rendering, Telegram export, and browser interaction.');
} finally {
  const resolved = await realpath(fixture);
  assert.equal(path.dirname(resolved), temp);
  await rm(resolved, { recursive: true, force: true });
}
