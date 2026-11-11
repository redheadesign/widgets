import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const url = new URL(process.argv[2] ?? 'http://localhost:5173/widgets/');
const output = new URL('../qa/run/', import.meta.url);
const widths = [320, 390, 768, 1024, 1440, 1920];
const seeds = [1, 13, 42, 77, 169, 277, 904, 2026];
const gridSpec = { columns: 3, module: 176, gap: 16, width: 944 };
const squareIds = ['clock', 'steps', 'users', 'moon-phase', 'compass'];
const categories = {
  'Аналитика': ['revenue', 'users', 'funnel', 'goal', 'retention'],
  'Здоровье': ['heart-rate', 'activity', 'steps', 'sleep', 'lung-capacity', 'hydration', 'glucose', 'breathing'],
  'Погода': ['weather', 'air-quality', 'uv-index', 'wind', 'sun', 'moon-phase'],
  'Дом': ['thermostat', 'lights', 'energy', 'timer', 'lock', 'compass'],
  'На каждый день': ['clock', 'reminders', 'music', 'stocks'],
};
const all = Object.values(categories).flat().sort();
const issues = new Set();
await mkdir(output, { recursive: true });

const browser = await chromium.launch({
  ...(process.env.BLOOM_BROWSER_PATH ? { executablePath: process.env.BLOOM_BROWSER_PATH } : { channel: 'msedge' }),
});
try {
  const page = await browser.newPage({ colorScheme: 'light', reducedMotion: 'reduce', viewport: { width: 1440, height: 960 } });
  page.on('pageerror', error => issues.add(error.message));
  await page.route('https://api.github.com/repos/redheadesign/widgets', route => route.fulfill({ json: { stargazers_count: 17 } }));
  const grid = page.getByRole('main', { name: 'Виджеты' }).locator('.bento-grid');
  const nav = page.getByRole('navigation', { name: 'Категории виджетов' });
  const filter = label => nav.getByRole('button', { name: label, exact: true });

  async function measure(expected, viewport) {
    await page.waitForFunction(({ count, spec }) => {
      const grid = document.querySelector('.bento-grid');
      if (!grid || grid.children.length !== count) return false;
      const space = grid.parentElement.clientWidth;
      const columns = Math.min(count, spec.columns, Math.max(1, Math.floor((space + spec.gap) / spec.module)));
      const nativeWidth = columns * spec.module + (columns - 1) * spec.gap;
      const desktopWidth = spec.columns * spec.module + (spec.columns - 1) * spec.gap;
      const scale = Math.min(spec.width / desktopWidth, space / nativeWidth);
      return Number(grid.style.getPropertyValue('--bento-columns')) === columns &&
        Math.abs(Number.parseFloat(getComputedStyle(grid).zoom) - scale) < 0.002;
    }, { count: expected.length, spec: gridSpec });
    const data = await grid.evaluate((element, { spec, squareIds }) => {
      const style = getComputedStyle(element);
      const nativeCols = style.gridTemplateColumns.split(' ').map(Number.parseFloat);
      const nativeRows = style.gridTemplateRows.split(' ').map(Number.parseFloat);
      const nativeGap = Number.parseFloat(style.columnGap);
      const scale = Number.parseFloat(style.zoom);
      const cols = nativeCols.map(size => size * scale);
      const rows = nativeRows.map(size => size * scale);
      const gap = nativeGap * scale;
      const origin = element.getBoundingClientRect();
      const stage = element.parentElement.getBoundingClientRect();
      const cells = new Set();
      const defects = [];
      const tolerance = Math.max(1, scale);
      if ([...nativeCols, ...nativeRows].some(size => Math.abs(size - spec.module) > 0.1)) defects.push('native module dimensions changed');
      if (Math.abs(nativeGap - spec.gap) > 0.1) defects.push('native gap changed');
      if (cols.length > spec.columns || origin.width > spec.width + 1) defects.push('grid exceeded its column or width cap');
      if (cols.length === spec.columns && stage.width >= spec.width &&
        Math.abs(origin.width - spec.width) > 1) defects.push('desktop grid did not fill its 944 px width');
      if (Math.abs((stage.left + stage.right - origin.left - origin.right) / 2) > 1) defects.push('grid is not centered');
      const offsets = lengths => lengths.map((_, i) => lengths.slice(0, i).reduce((sum, size) => sum + size + gap, 0));
      const xs = offsets(cols);
      const ys = offsets(rows);
      const outside = (inner, outer) => Math.max(outer.left - inner.left, inner.right - outer.right,
        outer.top - inner.top, inner.bottom - outer.bottom) > tolerance;
      const tiles = [...element.children].map(tile => {
        const frame = tile.firstElementChild;
        const id = frame.dataset.widget;
        const col = Number(tile.style.gridColumnStart) - 1;
        const row = Number(tile.style.gridRowStart) - 1;
        const width = Number(tile.style.gridColumnEnd.split(' ')[1]);
        const height = Number(tile.style.gridRowEnd.split(' ')[1]);
        const bounds = tile.getBoundingClientRect();
        const card = frame.querySelector('.bw-card').getBoundingClientRect();
        if (cols.length > 1 && ['funnel', 'glucose', 'music'].includes(id) && (width !== 2 || height !== 1)) {
          defects.push(id + ': needs a 2×1 tile');
        }
        if (id === 'timer' && height !== 1) defects.push(id + ': needs a one-row tile');
        if (squareIds.includes(id) && (width !== 1 || height !== 1)) defects.push(id + ': needs a square tile');
        if (width === 1 && height === 2 && !['hydration', 'breathing', 'lock', 'lights', 'weather', 'thermostat'].includes(id)) {
          defects.push(id + ': is not eligible for a portrait tile');
        }
        if (tile.children.length !== 1 || !frame.matches('.bw-frame') ||
          [...tile.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim())) {
          defects.push(id + ': extra tile content');
        }
        if (Math.abs(bounds.left - origin.left - xs[col]) > tolerance || Math.abs(bounds.top - origin.top - ys[row]) > tolerance ||
          Math.abs(bounds.right - origin.left - xs[col + width - 1] - cols[col + width - 1]) > tolerance ||
          Math.abs(bounds.bottom - origin.top - ys[row + height - 1] - rows[row + height - 1]) > tolerance ||
          outside(card, bounds) || outside(bounds, card)) defects.push(id + ': rendered bounds differ from its grid tracks');
        for (let y = row; y < row + height; y++) for (let x = col; x < col + width; x++) {
          const cell = x + ',' + y;
          if (x >= cols.length || y >= rows.length || cells.has(cell)) defects.push(id + ': overlapping or invalid cell ' + cell);
          cells.add(cell);
        }
        for (const control of frame.querySelectorAll('button, a[href], input, [role="slider"], [role="switch"], [role="checkbox"], [role="button"]')) {
          const rect = control.getBoundingClientRect();
          if (rect.width && rect.height && getComputedStyle(control).visibility === 'visible' && outside(rect, card)) {
            defects.push(id + ': control escapes card — ' + (control.getAttribute('aria-label') || control.textContent.trim() || control.className));
          }
        }
        const curve = frame.querySelector(':is(.ah-stock-plot, .ah-revenue-plot) path[vector-effect="non-scaling-stroke"]');
        if (curve && getComputedStyle(curve).strokeDasharray !== 'none') defects.push(id + ': curve has an unintended dash pattern');
        if (id === 'revenue') {
          const labels = [...frame.querySelectorAll('.ah-plot-labels > span')];
          const bars = [...frame.querySelectorAll('.ah-revenue-plot svg > rect')];
          const centerX = node => {
            const rect = node.getBoundingClientRect();
            return rect.left + rect.width / 2;
          };
          if (labels.length !== bars.length || labels.some((label, index) => Math.abs(centerX(label) - centerX(bars[index])) > tolerance)) {
            defects.push(id + ': plot labels are offset from bars');
          }
        }
        const aside = frame.querySelector('.bw-header .bw-aside')?.getBoundingClientRect();
        const label = frame.querySelector('.bw-header .bw-label > span');
        if (aside && label) {
          const title = new Range();
          title.selectNodeContents(label);
          if ([...title.getClientRects()].some(rect =>
            Math.min(rect.right, aside.right) - Math.max(rect.left, aside.left) > tolerance &&
            Math.min(rect.bottom, aside.bottom) - Math.max(rect.top, aside.top) > tolerance)) {
            defects.push(id + ': title overlaps header controls');
          }
        }
        const walker = document.createTreeWalker(frame, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const text = node.textContent.trim();
          const parent = node.parentElement;
          if (!text || parent.closest('.bw-visually-hidden, style, script, svg')) continue;
          const style = getComputedStyle(parent);
          if (style.visibility !== 'visible' ||
            (parent.clientWidth <= 1 && parent.clientHeight <= 1 && style.clipPath !== 'none')) continue;
          const range = new Range();
          range.selectNodeContents(node);
          if ([...range.getClientRects()].some(rect => rect.width && rect.height && outside(rect, card))) {
            defects.push(id + ': text escapes card — ' + text);
          }
        }
        return { id, layout: [col, row, width, height],
          tint: frame.style.getPropertyValue('--bw-tint'), accent: frame.style.getPropertyValue('--bw-accent') };
      });
      if (cells.size !== rows.length * cols.length) defects.push('grid has unoccupied cells');
      const { scrollWidth, clientWidth } = document.documentElement;
      if (scrollWidth > clientWidth + 1) {
        const beyondPage = [...document.body.querySelectorAll('*')]
          .map(node => ({ node, right: node.getBoundingClientRect().right }))
          .filter(({ right }) => right > clientWidth + 1)
          .sort((a, b) => b.right - a.right)
          .slice(0, 4)
          .map(({ node }) => [node.closest('[data-widget]')?.dataset.widget, node.getAttribute('class') || node.localName].filter(Boolean).join(' '));
        defects.push('page scrolls horizontally by ' + (scrollWidth - clientWidth) + 'px (' + beyondPage.join(', ') + ')');
      }
      return { tiles, defects, columns: cols.length, rows: rows.length, gridWidth: origin.width, scale };
    }, { spec: gridSpec, squareIds });
    assert.deepEqual(data.tiles.map(tile => tile.id).sort(), [...expected].sort(), viewport + ': incorrect tile IDs');
    for (const defect of data.defects) issues.add(viewport + ' · ' + defect);
    return data;
  }

  await page.goto(url.href);
  assert.equal(await filter('Все').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('.bento-page').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(0, 0, 0)');
  assert.equal(await page.getByRole('button', { name: 'Светлая тема', exact: true }).count(), 0);
  assert.equal(await page.getByRole('group', { name: 'Вариант светлой темы', exact: true }).count(), 0);
  assert.equal(await page.getByRole('link', { name: 'Вернуться в портфолио' }).getAttribute('href'), 'https://redheadesign.com/#canvas/explorations');
  await page.getByRole('link', { name: /GitHub, звёзд: 17/ }).waitFor();
  assert.equal(await page.getByRole('link', { name: /GitHub/ }).getAttribute('href'), 'https://github.com/redheadesign/widgets');
  assert.equal(await page.getByRole('link', { name: /Telegram/ }).getAttribute('href'), 'https://t.me/redheadesign');
  for (const width of widths) {
    await page.setViewportSize({ width, height: 960 });
    const data = await measure(all, width + 'px');
    await page.evaluate(() => document.fonts.ready);
    const hiddenFilters = await nav.evaluate(element => {
      const bounds = element.getBoundingClientRect();
      return [...element.querySelectorAll('button')].filter(button => {
        const rect = button.getBoundingClientRect();
        return rect.left < bounds.left - 1 || rect.right > bounds.right + 1;
      }).map(button => button.textContent);
    });
    if (hiddenFilters.length) issues.add(width + 'px · clipped filters: ' + hiddenFilters.join(', '));
    await page.screenshot({ path: fileURLToPath(new URL('landing-' + width + '.png', output)) });
    console.log(width + 'px · ' + data.columns + ' columns × ' + data.rows + ' rows · ' +
      data.gridWidth.toFixed(1) + 'px grid at ' + data.scale.toFixed(3) + '× · ' + data.defects.length + ' geometry issues');
  }

  await page.setViewportSize({ width: 390, height: 960 });
  await filter('Все').focus();
  await page.keyboard.press('Tab');
  assert(await filter('Аналитика').evaluate(button => button === document.activeElement));
  for (const [label, ids] of Object.entries(categories)) {
    await filter(label).press('Enter');
    assert.equal(await filter(label).getAttribute('aria-pressed'), 'true');
    assert.equal(await nav.getByRole('button', { pressed: true }).count(), 1);
    await measure(ids, '390px · ' + label);
  }
  await filter('Здоровье').click();
  const hydration = grid.locator('[data-widget="hydration"]');
  await hydration.getByRole('button', { name: 'Add a glass of water' }).click();
  assert(await hydration.getByText('6 glasses', { exact: true }).isVisible());
  await hydration.getByRole('button', { name: 'Remove a glass of water' }).press('Space');
  assert(await hydration.getByText('5 glasses', { exact: true }).isVisible());
  await filter('Все').press('Space');
  const initial = await measure(all, '390px · restored');

  await page.setViewportSize({ width: 1440, height: 960 });
  const before = await measure(all, '1440px · before reload');
  const colors = (tiles, key) => Object.fromEntries(tiles.map(tile => [tile.id, tile[key]]));
  for (const color of ['tint', 'accent']) {
    assert.deepEqual(colors(before.tiles, color), colors(initial.tiles, color), 'Resize changes assigned ' + color);
  }
  await page.reload();
  const after = await measure(all, '1440px · after reload');
  assert.notDeepEqual(after.tiles.map(tile => tile.id), before.tiles.map(tile => tile.id), 'Reload keeps order');
  assert.notDeepEqual(after.tiles.map(tile => tile.layout), before.tiles.map(tile => tile.layout), 'Reload keeps grid layout');
  for (const color of ['tint', 'accent']) {
    assert(after.tiles.every(tile => tile[color]), 'Missing ' + color);
    assert.notDeepEqual(colors(after.tiles, color), colors(before.tiles, color), 'Reload keeps ' + color + ' colors');
    assert.equal(colors(after.tiles, color).hydration, colors(before.tiles, color).hydration, 'Hydration should retain its blue palette');
    assert.equal(colors(after.tiles, color).sun, colors(before.tiles, color).sun, 'Sun should retain its amber palette');
  }
  assert.equal(await filter('Все').getAttribute('aria-pressed'), 'true');

  await page.addInitScript(() => {
    const seed = new URL(location.href).searchParams.get('qa-seed');
    if (seed === null) return;
    const getRandomValues = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = values => {
      if (!(values instanceof Uint32Array) || values.length !== 1) return getRandomValues(values);
      values[0] = Number(seed);
      return values;
    };
  });
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    for (const seed of seeds) {
      const fixture = new URL(url);
      fixture.searchParams.set('qa-seed', String(seed));
      await page.goto(fixture.href, { waitUntil: 'domcontentloaded' });
      await measure(all, width + 'px · seed ' + seed);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ fullPage: true, path: fileURLToPath(new URL('landing-stress-' + width + '-' + seed + '.png', output)) });
    }
    console.log(width + 'px · ' + seeds.length + ' reproducible layouts captured');
  }

  for (const [width, height] of [[160, 160], [176, 176], [368, 176], [176, 364], [364, 364], [266, 266], [720, 720]]) {
    await page.setViewportSize({ width, height });
    const fixture = new URL(url);
    fixture.search = '?embed=timer&fit=container&reduce=1';
    await page.goto(fixture.href);
    const timer = page.locator('[data-widget="timer"]');
    await timer.waitFor();
    const sizes = await timer.evaluate(frame => {
      const bounds = selector => frame.querySelector(selector).getBoundingClientRect();
      const card = bounds('.bw-card');
      const body = bounds('.bw-body');
      const readout = bounds('[role="timer"] .bw-dot-number');
      const controls = bounds('.ah-controls');
      return {
        centered: Math.abs(readout.left + readout.right - card.left - card.right) <= 2 &&
          Math.abs(readout.top + readout.bottom - card.top - card.bottom) <= 2,
        pinned: Math.abs(controls.bottom - body.bottom) <= 2,
        hasChart: frame.querySelector('.ah-timer-chart') !== null,
        gap: controls.top - readout.bottom,
        controlsFit: [...frame.querySelectorAll('.ah-controls button')].every(button => {
          const rect = button.getBoundingClientRect();
          return rect.left >= body.left - 1 && rect.right <= body.right + 1 && rect.bottom <= body.bottom + 1;
        }),
      };
    });
    const dimensions = width + 'x' + height;
    assert(sizes.centered && sizes.pinned && sizes.controlsFit && !sizes.hasChart && sizes.gap >= 8, dimensions + ' · ' + JSON.stringify(sizes));
    await timer.screenshot({ path: fileURLToPath(new URL('timer-centered-' + dimensions + '.png', output)) });
    await timer.getByRole('button', { name: 'Add one minute' }).click();
    assert(await timer.getByRole('img', { name: '17:00' }).isVisible());
    await timer.getByRole('button', { name: 'Start timer' }).click();
    assert.equal(await timer.getByRole('status').textContent(), 'Running');
    await timer.getByRole('button', { name: 'Pause timer' }).click();
    await timer.getByRole('button', { name: 'Reset timer' }).click();
    assert(await timer.getByRole('img', { name: '16:00' }).isVisible());
  }

  const highDpr = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1440, height: 960 } });
  try {
    await highDpr.route('https://api.github.com/repos/redheadesign/widgets', route => route.fulfill({ json: { stargazers_count: 17 } }));
    await highDpr.goto(url.href);
    const energy = highDpr.getByRole('slider', { name: 'Energy usage by hour' });
    await energy.scrollIntoViewIfNeeded();
    const bounds = await energy.boundingBox();
    assert(bounds, 'Energy slider is not visible');
    await highDpr.mouse.click(bounds.x + bounds.width * 0.75, bounds.y + bounds.height / 2);
    assert.equal(await energy.inputValue(), '17', 'Scaled slider misses the 75% pointer position at 2× DPR');
  } finally {
    await highDpr.close();
  }
  assert.equal(issues.size, 0, [...issues].join('\n'));
  console.log('Landing passes three-column scaling, filters, keyboard, hydration, timer, high-DPR pointer input, dark theme and reload variation.');
} finally {
  await browser.close();
}
