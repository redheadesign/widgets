import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const { values: args } = parseArgs({ options: {
  url: { type: 'string' },
  only: { type: 'string' },
  screenshots: { type: 'boolean' },
} });
const root = fileURLToPath(new URL('../', import.meta.url));
const output = new URL('../qa/run/web-states/', import.meta.url);
const sizes = { '1x1': [176, 176], '2x1': [368, 176], '2x2': [368, 368] };

const button = (frame, name) => frame.getByRole('button', { name, exact: typeof name === 'string' });
const click = (frame, name) => button(frame, name).click();
const visible = (frame, text) => frame.getByText(text, { exact: typeof text === 'string' }).first().waitFor();
const pressed = async (frame, name) => {
  const control = button(frame, name);
  assert.notEqual(await control.getAttribute('aria-pressed'), 'true');
  await control.click();
  assert.equal(await control.getAttribute('aria-pressed'), 'true');
};

async function drag(frame, page, name, destination = .16) {
  const slider = frame.getByRole('slider', { name, exact: true });
  const before = await slider.inputValue();
  const bounds = await slider.boundingBox();
  assert(bounds, 'The slider must be visible');
  const y = bounds.y + bounds.height / 2;
  await page.mouse.move(bounds.x + bounds.width * .5, y);
  await page.mouse.down();
  try {
    await page.mouse.move(bounds.x + bounds.width * destination, y, { steps: 4 });
  } finally {
    await page.mouse.up();
  }
  assert.notEqual(await slider.inputValue(), before, `${name} did not change on drag`);
  assert.equal(await page.evaluate(() => window.getSelection()?.toString()), '', 'Dragging selected text');
}

const cases = {
  'heart-rate': async frame => {
    await click(frame, 'Measure');
    await button(frame, 'Stop').waitFor();
    assert.equal(await frame.locator('.hw-heart').getAttribute('data-measuring'), 'true');
  },
  activity: async frame => {
    await click(frame, /Move 82 percent/);
    await button(frame, /Exercise 60 percent/).waitFor();
  },
  steps: async frame => {
    await pressed(frame, 'Wednesday');
    const progress = frame.getByRole('progressbar', { name: 'Wednesday step goal' });
    await progress.waitFor();
    assert.equal(await progress.getAttribute('aria-valuetext'), '96% of goal');
  },
  sleep: (frame, page) => drag(frame, page, 'Sleep stage'),
  'lung-capacity': async frame => {
    await click(frame, 'Repeat');
    await button(frame, 'Stop').waitFor();
    await visible(frame, 'Test in progress');
  },
  hydration: async frame => {
    await click(frame, 'Add a glass of water');
    await visible(frame, '6 glasses');
  },
  glucose: async frame => {
    await pressed(frame, 'Week');
    await visible(frame, /This week · target/);
  },
  breathing: async frame => {
    await click(frame, 'Start one-minute breathing session');
    await button(frame, 'Stop breathing session').waitFor();
    await visible(frame, /Inhale ·/);
  },
  weather: async frame => {
    await click(frame, 'City');
    await visible(frame, 'Madrid');
  },
  hourly: (frame, page) => drag(frame, page, 'Hourly forecast'),
  'air-quality': frame => pressed(frame, 'Ozone'),
  'uv-index': async frame => {
    await click(frame, 'Show peak UV index');
    await visible(frame, 'Very high');
  },
  wind: async frame => {
    await click(frame, /NE wind/);
    await button(frame, /^E wind/).waitFor();
  },
  sun: async (frame, page) => {
    const slider = frame.getByRole('slider', { name: 'Time of day' });
    const sun = frame.locator('.hw-sun');
    const strength = () => sun.evaluate(element => Number(element.style.getPropertyValue('--hw-sun-radiance')));
    await slider.press('Home');
    assert.equal(await strength(), 0);
    await drag(frame, page, 'Time of day', .5);
    assert.ok(await strength() > .9);
    await slider.press('End');
    assert.equal(await strength(), 0);
  },
  revenue: async frame => {
    await pressed(frame, 'Month');
    await visible(frame, '$186,940');
  },
  users: async frame => {
    await click(frame, 'Pause live users');
    await button(frame, 'Resume live users').waitFor();
  },
  funnel: frame => pressed(frame, /Checkout/),
  traffic: frame => pressed(frame, /Direct 26.3%/),
  goal: (frame, page) => drag(frame, page, 'Monthly goal progress'),
  retention: frame => pressed(frame, /Jun, week 7, 34%/),
  thermostat: frame => pressed(frame, 'Heat'),
  lights: async frame => {
    const control = frame.getByRole('switch', { name: 'Lights' });
    await control.click();
    assert.equal(await control.getAttribute('aria-checked'), 'false');
    assert.equal(await frame.getByRole('slider', { name: 'Light brightness' }).inputValue(), '0');
  },
  energy: (frame, page) => drag(frame, page, 'Energy usage by hour'),
  timer: async frame => {
    await click(frame, 'Start timer');
    await button(frame, 'Pause timer').waitFor();
    await visible(frame, 'Running');
  },
  lock: async frame => {
    await button(frame, 'Hold to unlock front door').click({ delay: 900 });
    await visible(frame, 'Unlocked');
  },
  clock: async frame => {
    await click(frame, /show digital clock/);
    await button(frame, /show analog clock/).waitFor();
  },
  calendar: async frame => {
    await pressed(frame, /Friday, November/);
    await visible(frame, 'Sprint planning');
  },
  reminders: async (frame, _page, size) => {
    const count = size === '2x2' ? 10 : 4;
    assert.equal(await frame.getByRole('checkbox').count(), count);
    const task = frame.getByRole('checkbox', { name: 'Call the dentist' });
    await task.click();
    assert.equal(await task.getAttribute('aria-checked'), 'true');
    assert.equal(await frame.getByRole('status').textContent(), `2 of ${count}`);
  },
  music: async frame => {
    await click(frame, 'Next track');
    await visible(frame, 'Nocturne Op. 9 No. 2');
  },
  stocks: async frame => {
    await click(frame, 'Show ETH');
    await button(frame, 'Show BTC').waitFor();
    await visible(frame, '$3,526');
  },
};

function inspectLayout(frame) {
  return frame.evaluate(element => {
    const card = element.querySelector('.bw-card');
    const box = card.getBoundingClientRect();
    const visible = node => node.getClientRects().length && getComputedStyle(node).visibility === 'visible';
    const outside = rect => rect.width > 0 && rect.height > 0 && (
      rect.left < box.left - 2 || rect.right > box.right + 2 || rect.top < box.top - 2 || rect.bottom > box.bottom + 2
    );
    const controls = [...card.querySelectorAll('button, input[type=range], [role=slider]')].filter(visible);
    const clippedControls = controls.filter(node => outside(node.getBoundingClientRect()))
      .map(node => node.getAttribute('aria-label') || node.textContent.trim() || node.className);
    const clippedText = new Set();
    const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let text = walker.nextNode(); text; text = walker.nextNode()) {
      const parent = text.parentElement;
      if (!text.data.trim() || !visible(parent) || parent.closest('svg,.bw-visually-hidden') || getComputedStyle(parent).clipPath !== 'none') continue;
      range.selectNodeContents(text);
      if ([...range.getClientRects()].some(outside)) clippedText.add(text.data.trim());
    }
    return { dimensions: [element.offsetWidth, element.offsetHeight], controls: controls.length, clippedControls, clippedText: [...clippedText] };
  });
}

const ids = args.only?.split(',') ?? Object.keys(cases);
for (const id of ids) assert(Object.hasOwn(cases, id), `Unknown widget ${id}`);
await mkdir(output, { recursive: true });
const server = args.url ? null : await createServer({ root, server: { host: '127.0.0.1', port: 5180, strictPort: false, hmr: false } });
let browser;
try {
  await server?.listen();
  const address = server?.httpServer?.address();
  const url = new URL(args.url ?? `http://127.0.0.1:${address.port}/`);
  browser = await chromium.launch({
    ...(process.env.BLOOM_BROWSER_PATH ? { executablePath: process.env.BLOOM_BROWSER_PATH } : { channel: 'msedge' }),
  });
  const page = await browser.newPage({ viewport: { width: 440, height: 450 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(7000);
  const results = [];
  let pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  for (const id of ids) {
    for (const [size, dimensions] of Object.entries(sizes)) {
      const result = { id, size };
      pageErrors = [];
      url.search = new URLSearchParams({ embed: id, size, reduce: '1' });
      const frame = page.locator(`.bw-frame[data-widget="${id}"]`);
      try {
        await page.goto(url.href, { waitUntil: 'domcontentloaded' });
        await frame.waitFor();
        await page.evaluate(() => document.fonts.ready);
        result.before = await inspectLayout(frame);
        assert.deepEqual(result.before.dimensions, dimensions);
        assert(result.before.controls > 0, 'No visible controls');
        await cases[id](frame, page, size);
        result.action = 'passed';
        result.after = await inspectLayout(frame);
        for (const state of [result.before, result.after]) {
          assert.deepEqual(state.clippedControls, [], 'Controls outside the card');
          assert.deepEqual(state.clippedText, [], 'Text outside the card');
        }
        assert.deepEqual(pageErrors, [], 'Unhandled JavaScript errors');
      } catch (error) {
        result.error = error.message.split('\nCall log:')[0];
      }
      if (args.screenshots || result.error) {
        await frame.screenshot({ path: fileURLToPath(new URL(`${id}-${size}.png`, output)), timeout: 1000 }).catch(() => {});
      }
      results.push(result);
    }
    const failed = results.filter(result => result.id === id && result.error);
    console.log(failed.length ? `${id}: ${failed.map(result => `${result.size} ${result.error.split('\n')[0]}`).join(' | ')}` : `${id}: action and layout passed in all three sizes`);
  }

  await writeFile(new URL('report.json', output), JSON.stringify(results, null, 2) + '\n');
  const passed = results.filter(result => !result.error).length;
  console.log(`${passed}/${results.length} web states passed; ${results.filter(result => result.action === 'passed').length} primary actions confirmed.`);
  if (passed !== results.length) process.exitCode = 1;
} finally {
  await browser?.close();
  await server?.close();
}
