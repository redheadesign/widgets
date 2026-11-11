import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const flags = new Map();
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--capture-only') flags.set(args[i], true);
  else if (['--url', '--before', '--before-captures', '--output', '--references', '--only'].includes(args[i]) && args[i + 1]) flags.set(args[i], args[++i]);
  else throw new Error(`Unknown or incomplete option: ${args[i]}`);
}
const url = new URL(flags.get('--url') ?? 'http://127.0.0.1:5173/');
const before = flags.has('--before') ? new URL(flags.get('--before')) : undefined;
const beforeCaptures = flags.has('--before-captures') ? path.resolve(root, flags.get('--before-captures')) : undefined;
assert(!before || !beforeCaptures, 'Use either a baseline server or a baseline capture directory');
const output = path.resolve(root, flags.get('--output') ?? 'qa/run');
const refs = path.resolve(root, flags.get('--references') ?? '../.bloom-reference');
const manifest = JSON.parse(await readFile(path.join(root, 'qa/reference-crops.json'), 'utf8'));
const ids = Object.values(manifest).flatMap(group => Object.keys(group));
const selected = new Set((flags.get('--only') ?? ids.join(',')).split(','));
for (const id of selected) assert(ids.includes(id), `Unknown widget: ${id}`);
const telegram = !flags.has('--capture-only') && await import('../src/telegram.ts');
if (telegram) assert.deepEqual([...ids].sort(), [...telegram.TELEGRAM_WIDGET_IDS].sort(), 'Reference and Telegram catalogs must agree');
await mkdir(output, { recursive: true });

const browser = await chromium.launch({
  ...(process.env.BLOOM_BROWSER_PATH ? { executablePath: process.env.BLOOM_BROWSER_PATH } : { channel: 'msedge' }),
});
const context = await browser.newContext({ viewport: { width: 440, height: 700 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
const page = await context.newPage();
const editor = await context.newPage();
const errors = [];
for (const tab of [page, editor]) tab.on('pageerror', e => errors.push(e.message));
const dataUri = (bytes, format = 'png') => `data:image/${format};base64,${bytes.toString('base64')}`;
const embed = (base, id) => {
  const target = new URL(base);
  target.search = new URLSearchParams({ embed: id, reduce: '1' });
  return target.href;
};
const capture = async (base, id) => {
  await page.goto(embed(base, id), { waitUntil: 'domcontentloaded' });
  const frame = page.locator('.bw-frame');
  await frame.waitFor({ timeout: 10_000 });
  await page.evaluate(() => document.fonts.ready);
  const geometry = await frame.evaluate(el => {
    const { width, height } = el.getBoundingClientRect();
    return { width, height, size: el.dataset.size, controls: el.querySelectorAll('button, input[type=range], [role=slider]').length };
  });
  const dimensions = { small: [176, 176], wide: [368, 176], large: [368, 368] };
  assert.deepEqual([geometry.width, geometry.height], dimensions[geometry.size], `${id}: unexpected native web size`);
  assert(geometry.controls > 0, `${id}: no reachable controls`);
  return { png: await frame.screenshot({ animations: 'disabled', scale: 'css' }), ...geometry };
};

async function compose(sheet) {
  return editor.evaluate(async ({ source, rows, group }) => {
    const load = src => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
    const img = await load(source);
    const c = document.createElement('canvas');
    const col = 392, inset = 24, rowGap = 31, start = 88;
    const hasBefore = rows.every(r => r.before);
    c.width = inset * 2 + col * (hasBefore ? 3 : 2);
    c.height = start + rows.reduce((sum, r) => sum + r.height + rowGap, 0) + 9;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#111116';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#f7f4ff';
    ctx.font = '600 21px system-ui';
    ctx.fillText(`Bloom · ${group}`, inset, 29);
    ctx.font = '13px system-ui';
    ctx.fillStyle = '#a39bb3';
    (hasBefore ? ['Reference', 'Before', 'After'] : ['Reference', 'Current build'])
      .forEach((label, i) => ctx.fillText(label, inset + col * i, 56));
    let y = start;
    const palette = {};
    const glow = {};
    const metrics = {};
    for (const r of rows) {
      ctx.fillStyle = '#dad4e8';
      ctx.font = '600 13px system-ui';
      ctx.fillText(r.id, inset, y - 7);
      ctx.drawImage(img, ...r.crop, inset, y, r.width, r.height);
      if (hasBefore) ctx.drawImage(await load(r.before), inset + col, y);
      ctx.drawImage(await load(r.after), inset + col * (hasBefore ? 2 : 1), y);

      // Clean perimeter samples, away from header, bottom buttons and corners.
      const take = (colIndex, xf, yf) => {
        const x = Math.round(inset + col * colIndex + r.width * xf);
        const at = Math.round(y + r.height * yf);
        const pixels = ctx.getImageData(x - 2, at - 2, 5, 5).data;
        return [0, 1, 2].map(ch => {
          const values = Array.from({ length: 25 }, (_, i) => pixels[i * 4 + ch]).sort((a,b) => a - b);
          return values[12];
        });
      };
      const points = [[.16,.04],[.50,.04],[.83,.04],[.035,.44],[.965,.44],[.17,.95],[.50,.965],[.83,.95]];
      const colors = points.map(([x,y]) => take(0,x,y));
      palette[r.id] = colors;
      const plate = ctx.getImageData(inset, y, r.width, r.height).data;
      const glowRows = [4, 16, 33, 50, 67, 84, 96];
      const glowColumns = [6, 24, 50, 76, 94];
      function cleanSample(xp, yp) {
        const cx = Math.round(xp * r.width / 100), cy = Math.round(yp * r.height / 100);
        const rx = Math.round(r.width * (yp > 25 && yp < 90 ? .051 : .023));
        const ry = Math.max(3, Math.round(r.height * .017));
        const candidates = [];
        for (let j = cy - ry; j <= cy + ry; j++) for (let i = cx - rx; i <= cx + rx; i++) {
          const px = i < 29 ? 29 - i : Math.max(0, i - (r.width - 29));
          const py = j < 29 ? 29 - j : Math.max(0, j - (r.height - 29));
          if (i < 1 || j < 1 || i >= r.width - 1 || j >= r.height - 1 || px * px + py * py > 25 * 25) continue;
          const at = (j * r.width + i) * 4;
          candidates.push([plate[at], plate[at + 1], plate[at + 2]]);
        }
        candidates.sort((a, b) => a[0] + a[1] + a[2] - b[0] - b[1] - b[2]);
        const index = Math.floor(candidates.length * (yp > 25 && yp < 90 ? .24 : .53));
        return (candidates[index] ?? colors[0]).map(value => value.toString(16).padStart(2, '0')).join('');
      }
      glow[r.id] = glowRows.map(yp => glowColumns.map(xp => cleanSample(xp, yp)));
      const delta = k => Number((points.reduce((sum, [x,y], i) => sum + take(k,x,y)
        .reduce((d, channel, ch) => d + Math.abs(channel - colors[i][ch]), 0), 0) / (3 * points.length)).toFixed(2));
      metrics[r.id] = { ...(hasBefore ? { before: delta(1) } : {}), after: delta(hasBefore ? 2 : 1) };
      y += r.height + rowGap;
    }
    return { image: c.toDataURL('image/jpeg', .93).split(',')[1], palette, glow, metrics };
  }, sheet);
}

async function checkExports(id) {
  const html = telegram.buildTelegramHtml(id);
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 620 });
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const card = page.locator('.card');
    await card.waitFor();
    const layout = await card.evaluate(el => {
      const r = el.getBoundingClientRect();
      const controls = [...el.querySelectorAll('button,[role=button],[role=slider]')].filter(e => e.getClientRects().length);
      const clipped = controls.filter(e => {
        const b = e.getBoundingClientRect();
        return b.width > 0 && b.height > 0 &&
          (b.left < r.left - 1 || b.top < r.top - 1 || b.right > r.right + 1 || b.bottom > r.bottom + 1);
      }).map(e => e.getAttribute('aria-label') || e.textContent.trim());
      return {
        width: r.width, height: r.height, overflow: document.documentElement.scrollWidth > innerWidth,
        controls: controls.length, clipped,
      };
    });
    assert.equal(layout.width, width, `${id} Telegram width at ${width}`);
    assert(layout.height >= 50 && layout.height <= 600, `${id} Telegram height at ${width}`);
    assert.equal(layout.overflow, false, `${id} Telegram overflows at ${width}`);
    assert(layout.controls > 0, `${id} Telegram has no controls at ${width}`);
    assert.deepEqual(layout.clipped, [], `${id} Telegram has controls outside the card at ${width}`);
    if (width === 320) await card.screenshot({ path: path.join(output, `telegram-${id}.png`), animations: 'disabled' });
  }
}

async function checkMotion() {
  const motionContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const tab = await motionContext.newPage();
  tab.on('pageerror', e => errors.push(e.message));
  try {
    const hyd = new URL(url);
    hyd.search = '?widget=hydration';
    await tab.goto(hyd.href, { waitUntil: 'domcontentloaded' });
    const glass = tab.getByRole('button', { name: 'Add a glass of water' });
    await glass.waitFor();
    const water = tab.locator('.hw-water');
    const waves = tab.locator('.hw-water-wave');
    assert.equal(await waves.count(), 3);
    const readWave = () => waves.first().evaluate(el => getComputedStyle(el).transform);
    const initialWave = await readWave();
    await tab.waitForFunction(t => getComputedStyle(document.querySelector('.hw-water-wave')).transform !== t, initialWave);
    const readLevel = () => water.evaluate(el => getComputedStyle(el).getPropertyValue('--hw-water-offset'));
    const initialLevel = parseFloat(await readLevel());
    await glass.click();
    await tab.locator('.bw-press-ripple').waitFor({ state: 'attached', timeout: 1500 });
    assert.match(await tab.locator('.bw-frame').innerText(), /6 glasses/);
    assert(parseFloat(await readLevel()) < initialLevel, 'Water must rise with the added glass');
    await tab.getByRole('button', { name: 'Пауза анимации' }).click();
    assert.equal(await tab.locator('.bw-frame').getAttribute('data-paused'), 'true');
    assert(await tab.locator('.bw-press-layer').isHidden(), 'Press FX must stop on pause');
    assert.equal(await waves.first().evaluate(el => getComputedStyle(el).animationPlayState), 'paused');
    await tab.getByRole('button', { name: 'Повторить с начала' }).click();
    assert.match(await tab.locator('.bw-frame').innerText(), /5 glasses/);
    await tab.getByText('Разбор по кадрам', { exact: true }).click();
    await tab.getByRole('switch', { name: 'Остановить цикл' }).click();
    const phase = tab.getByRole('slider', { name: /Кадр цикла/ });
    await phase.press('End');
    assert.equal(await phase.inputValue(), '99');
    await tab.waitForFunction(() => {
      const wave = document.querySelector('.hw-water-wave').getAnimations()[0];
      return wave?.currentTime >= wave?.effect.getTiming().duration * .98 && wave?.playState === 'paused';
    });
    await tab.getByRole('switch', { name: 'Остановить цикл' }).click();
    await tab.getByRole('switch', { name: 'Меньше движения' }).click();
    await glass.click();
    assert.equal(await tab.locator('.bw-press-ripple').count(), 0, 'Reduced motion must not create ripple nodes');
    assert.match(await tab.locator('.bw-frame').innerText(), /6 glasses/);

    await tab.getByRole('button', { name: 'Telegram', exact: true }).click();
    const iframe = tab.locator('.telegram-stage iframe');
    await tab.locator('iframe[data-fitted="true"]').waitFor({ timeout: 6000 });
    const inner = iframe.contentFrame().locator('.card');
    const checkFit = async () => {
      const expectedWidth = await tab.locator('.stage-work').evaluate(el => Math.min(320, el.clientWidth - 34));
      await tab.waitForFunction(width => document.querySelector('.telegram-stage iframe')?.clientWidth === width, expectedWidth);
      const cardHeight = await inner.evaluate(el => el.getBoundingClientRect().height);
      await tab.waitForFunction(height => document.querySelector('.telegram-stage iframe')?.clientHeight === Math.ceil(height), cardHeight);
      const frame = await iframe.evaluate(el => ({ width: el.clientWidth, height: el.clientHeight }));
      assert.equal(frame.width, expectedWidth);
      assert(frame.height - cardHeight >= 0 && frame.height - cardHeight < 1.1, 'Telegram frame has a visible gutter');
    };
    await checkFit();
    await tab.screenshot({ path: path.join(output, 'studio-telegram-desktop.png') });
    await tab.setViewportSize({ width: 320, height: 720 });
    await checkFit();
    assert(await tab.evaluate(() => document.documentElement.scrollWidth === innerWidth), 'Studio overflows at 320px');
    await tab.screenshot({ path: path.join(output, 'studio-telegram-mobile.png') });
    return ['three moving water layers', 'water level step and ripple', 'pause and reset', 'manual phase', 'reduced motion', 'Telegram natural-height frame', 'mobile width'];
  } finally {
    await motionContext.close();
  }
}

async function checkDemoStates() {
  const demoContext = await browser.newContext({ viewport: { width: 430, height: 720 } });
  const tab = await demoContext.newPage();
  const passed = [];
  const open = async id => {
    const target = new URL(url);
    target.search = `?embed=${id}`;
    await tab.goto(target.href, { waitUntil: 'domcontentloaded' });
    await tab.locator('.bw-card').waitFor();
    await tab.evaluate(() => document.fonts.ready);
  };
  const shot = name => tab.locator('.bw-frame').screenshot({ path: path.join(output, `demo-${name}.png`), animations: 'disabled' });
  tab.on('pageerror', error => errors.push(error.message));
  try {
    if (selected.has('weather')) {
      await open('weather');
      const city = tab.getByRole('button', { name: 'City', exact: true });
      await city.click();
      assert.match(await tab.locator('.bw-card').innerText(), /Madrid[\s\S]*14°[\s\S]*L 6°/);
      const fade = tab.locator('.hw-weather-backdrop-state--clear');
      assert.equal(await fade.evaluate(e => getComputedStyle(e).transitionProperty), 'opacity');
      await shot('madrid');
      await city.click();
      assert.match(await tab.locator('.bw-card').innerText(), /Tokyo[\s\S]*19°[\s\S]*L 15°/);
      await shot('tokyo');
      await city.click();
      assert.match(await tab.locator('.bw-card').innerText(), /Caracas[\s\S]*28°/);
      passed.push('Weather: three cities and coordinated surface transition');
    }
    if (selected.has('revenue')) {
      await open('revenue');
      const month = tab.getByRole('button', { name: 'Month', exact: true });
      const week = tab.getByRole('button', { name: 'Week', exact: true });
      await month.click();
      assert.match(await tab.locator('.bw-card').innerText(), /\$186,940/);
      const anchored = await tab.locator('.ah-revenue-plot').evaluate(plot => {
        const floor = plot.getBoundingClientRect().bottom;
        return [...plot.querySelectorAll('svg rect')].every(bar => Math.abs(bar.getBoundingClientRect().bottom - floor) < 1);
      });
      assert(anchored, 'Growing Revenue bars must stay anchored to the chart baseline');
      await week.click();
      await month.click();
      assert.equal(await month.getAttribute('aria-pressed'), 'true');
      assert.match(await tab.locator('.bw-card').innerText(), /\$186,940/);
      await tab.waitForFunction(() => {
        const bars = [...document.querySelectorAll('.ah-revenue-plot svg rect')];
        const bar = bars.at(-1);
        const marker = document.querySelector('.ah-revenue-marker');
        if (!bar || !marker) return false;
        const barBox = bar.getBoundingClientRect();
        const markerBox = marker.getBoundingClientRect();
        const markerCenter = markerBox.left + markerBox.width / 2;
        const barCenter = barBox.left + barBox.width / 2;
        return bars.every(e => getComputedStyle(e).transform === 'none') &&
          Math.abs(markerCenter - barCenter) < .5;
      });
      await shot('revenue-month');
      passed.push('Revenue: month selection, anchored bars and interrupted transition');
    }
    if (selected.has('thermostat')) {
      await open('thermostat');
      await tab.getByRole('button', { name: 'Heat', exact: true }).click();
      assert.match(await tab.locator('.bw-card').innerText(), /Heating to/);
      const dial = tab.getByRole('slider', { name: 'Target temperature' });
      const temp = Number(await dial.getAttribute('aria-valuenow'));
      await dial.press('ArrowRight');
      assert.equal(await dial.getAttribute('aria-valuenow'), String(temp + 1));
      passed.push('Thermostat: Heat mode and keyboard dial');
    }
    return passed;
  } finally {
    await demoContext.close();
  }
}

async function checkBento() {
  const tab = await context.newPage();
  await tab.setViewportSize({ width: 1280, height: 800 });
  tab.on('pageerror', error => errors.push(error.message));
  const studio = new URL(url);
  const frameSize = (frame) => frame.evaluate(el => [el.offsetWidth, el.offsetHeight]);
  try {
    studio.search = '?widget=hydration';
    await tab.goto(studio.href, { waitUntil: 'domcontentloaded' });
    await tab.getByRole('button', { name: 'Add a glass of water' }).click();
    const formats = tab.getByRole('group', { name: 'Формат карточки' });
    await formats.getByRole('button', { name: '2 × 1' }).click();
    assert.deepEqual(await frameSize(tab.locator('.bw-frame')), [368, 176]);
    assert.match(await tab.locator('.bw-frame').innerText(), /6 glasses/);

    studio.search = '?widget=lung-capacity&size=2x1';
    await tab.goto(studio.href, { waitUntil: 'domcontentloaded' });
    await tab.getByRole('button', { name: 'Экспорт', exact: true }).click();
    const code = await tab.getByRole('textbox', { name: 'Код для вставки' }).inputValue();
    assert.match(code, /size=2x1/);
    await tab.setContent(`<style>body{margin:0} #slot{width:368px}</style><div id="slot">${code}</div>`);
    const frame = tab.locator('#slot iframe');
    const card = frame.contentFrame().locator('.bw-frame');
    await card.waitFor();
    const repeat = card.getByRole('button', { name: 'Repeat' });
    for (const [width, height] of [[368, 368], [368, 176], [160, 160], [500, 232]]) {
      await tab.locator('#slot').evaluate((slot, [w, h]) => {
        slot.style.width = `${w}px`;
        slot.style.setProperty('--bloom-height', `${h}px`);
      }, [width, height]);
      await tab.waitForFunction(([w, h]) => {
        const frame = document.querySelector('#slot iframe');
        const card = frame?.contentDocument?.querySelector('.bw-frame');
        return card?.offsetWidth === w && card?.offsetHeight === h;
      }, [width, height]);
      const cardBox = await card.boundingBox();
      const actionBox = await repeat.boundingBox();
      assert(actionBox && cardBox && actionBox.x >= cardBox.x && actionBox.y >= cardBox.y &&
        actionBox.x + actionBox.width <= cardBox.x + cardBox.width + 1 &&
        actionBox.y + actionBox.height <= cardBox.y + cardBox.height + 1, 'Repeat must fit inside the resized card');
      await card.screenshot({ path: path.join(output, `bento-lung-${width}x${height}.png`), animations: 'disabled' });
    }
    await repeat.click();
    assert(await card.getByRole('button', { name: 'Stop' }).isVisible(), 'Resized iframe must stay interactive');

    studio.search = '?view=gallery';
    for (const width of [1280, 320]) {
      await tab.setViewportSize({ width, height: 800 });
      await tab.goto(studio.href, { waitUntil: 'domcontentloaded' });
      await tab.locator('.gallery-grid .bw-frame').first().waitFor();
      const gallery = await tab.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        cardsFill: [...document.querySelectorAll('.gallery-tile')].every(tile =>
          Math.abs(tile.getBoundingClientRect().width - tile.querySelector('.bw-frame').getBoundingClientRect().width) < 1),
      }));
      assert.deepEqual(gallery, { overflow: false, cardsFill: true }, `Bento gallery at ${width}px`);
    }
    return ['format preserves widget state', 'export uses the selected format', 'iframe fills resized host slots', 'gallery cards fill their grid tracks'];
  } finally {
    await tab.close();
  }
}

const report = { web: [], telegram: [], motion: [], demo: [], bento: [], palette: {}, glow: {}, edgeDelta: {} };
try {
  for (const [file, cards] of Object.entries(manifest)) {
    const rows = [];
    for (const [id, crop] of Object.entries(cards)) {
      if (!selected.has(id)) continue;
      await page.setViewportSize({ width: 440, height: 700 });
      const after = await capture(url, id);
      const prior = before ? await capture(before, id)
        : beforeCaptures ? { png: await readFile(path.join(beforeCaptures, `web-${id}.png`)) } : undefined;
      await writeFile(path.join(output, `web-${id}.png`), after.png);
      if (prior) await writeFile(path.join(output, `before-${id}.png`), prior.png);
      rows.push({ id, crop, width: after.width, height: after.height,
        before: prior ? dataUri(prior.png) : undefined, after: dataUri(after.png) });
      report.web.push(id);
      if (!flags.has('--capture-only')) {
        await checkExports(id);
        report.telegram.push(id);
      }
    }
    if (!rows.length) continue;
    const group = file.replace('-v3.webp', '');
    try {
      const source = dataUri(await readFile(path.join(refs, file)), 'webp');
      const sheet = await compose({ source, rows, group });
      await writeFile(path.join(output, `compare-${group}.jpg`), Buffer.from(sheet.image, 'base64'));
      Object.assign(report.palette, sheet.palette);
      Object.assign(report.glow, sheet.glow);
      Object.assign(report.edgeDelta, sheet.metrics);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      console.warn(`Reference image not found: ${file}. Rendered cards saved without comparison.`);
    }
  }
  if (!flags.has('--capture-only') && selected.has('hydration')) report.motion = await checkMotion();
  if (!flags.has('--capture-only') && selected.has('lung-capacity')) report.bento = await checkBento();
  if (!flags.has('--capture-only')) report.demo = await checkDemoStates();
  const samples = Object.values(report.edgeDelta).filter(row => row.before !== undefined);
  if (samples.length) {
    const mean = key => Number((samples.reduce((n, row) => n + row[key], 0) / samples.length).toFixed(2));
    report.meanEdgeDelta = { count: samples.length, before: mean('before'), after: mean('after') };
  }
  assert.deepEqual(errors, [], 'Browser exceptions');
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`Web: ${report.web.length}, Telegram: ${report.telegram.length}, motion and fit: ${report.motion.length}, bento: ${report.bento.length}, demo: ${report.demo.length}. ${output}`);
} catch (error) {
  await writeFile(path.join(output, 'report.failed.json'), JSON.stringify({
    ...report, failure: error instanceof Error ? error.message : String(error),
  }, null, 2) + '\n');
  throw error;
} finally {
  await browser.close();
}
