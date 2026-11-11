import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { buildTelegramHtml, TELEGRAM_WIDGET_IDS } from '../src/telegram.ts'

const requested = process.argv.slice(2)
assert.ok(requested.every(id => TELEGRAM_WIDGET_IDS.includes(id)), 'Pass Telegram widget IDs or omit arguments to verify all widgets')
const ids = requested.length ? requested : TELEGRAM_WIDGET_IDS

const browser = await chromium.launch({ channel: 'msedge' })
const page = await browser.newPage({ viewport: { width: 320, height: 600 }, hasTouch: true })
const errors = []
const dimensions = []
page.on('pageerror', error => errors.push(error.message))

async function show(html, width, corner = 0) {
  await page.setViewportSize({ width, height: 600 })
  await page.setContent('<style>html,body{margin:0;background:#0c0c11}iframe{display:block;border:0;width:100%;height:590px}</style><iframe sandbox="allow-scripts"></iframe>')
  const iframe = page.locator('iframe')
  await iframe.evaluate((element, source) => new Promise(resolve => {
    element.addEventListener('load', resolve, { once: true })
    element.srcdoc = source
  }), corner ? html.replace('<style>', `<style>:root{--tg-content-safe-area-inset-bottom:${corner}px}`) : html)
  const frame = iframe.contentFrame()
  const card = frame.locator('main.card')
  await card.waitFor()
  return { frame, card }
}

const measure = (card, corner = 0) => card.evaluate((element, inset) => {
  const { width, height } = element.getBoundingClientRect()
  const beyond = Array.from(element.querySelectorAll('button,h1,.detail,.value,.dots,.unit,.art')).filter(child => {
    const bounds = child.getBoundingClientRect()
    return bounds.left < -.1 || bounds.right > width + .1 || bounds.top < -.1 ||
      bounds.bottom > height - inset + .1 || child.scrollWidth > child.clientWidth + 1
  }).map(child => child.getAttribute('aria-label') || child.textContent || child.getAttribute('class') || child.tagName)
  return { width, height, beyond, scroll: document.documentElement.scrollWidth }
}, corner)

function checkLayout(id, width, size) {
  assert.equal(size.width, width, id)
  assert.equal(size.scroll, width, id)
  assert.ok(size.height >= 50 && size.height < 560, id)
  assert.deepEqual(size.beyond, [], `${id} at ${width}px`)
}

async function checkValue(frame, expected) {
  const value = await frame.locator('#value').evaluate(node => node.getAttribute('aria-label') || node.textContent)
  assert.equal(value, expected)
}

const pressMethod = () => page.viewportSize().width === 200 ? 'tap' : 'click'
const click = (frame, name) => frame.getByRole('button', { name, exact: true })[pressMethod()]()
const checkNote = async (frame, expected) => assert.equal(await frame.locator('#detail').textContent(), expected)
const checkRow = async (frame, selector) => {
  const row = await frame.locator(selector).evaluateAll(nodes => nodes.map(node => {
    const { top, height } = node.getBoundingClientRect()
    return top + height / 2
  }))
  assert.ok(Math.max(...row) - Math.min(...row) < 5, `Controls should share one row (${selector})`)
}
const scrubAt = async (frame, fraction) => {
  const area = frame.locator('#scrub')
  const size = await area.boundingBox()
  await area[pressMethod()]({ position: { x: size.width * fraction, y: size.height / 2 } })
}
const tests = {
  'heart-rate': async frame => {
    await click(frame, 'Measure')
    await checkNote(frame, 'Measuring · Demo')
    await click(frame, 'Stop')
    await checkNote(frame, 'Resting · Demo')
  },
  activity: async frame => {
    await click(frame, 'Show next activity ring')
    await checkValue(frame, '60')
  },
  steps: async frame => {
    await click(frame, 'Previous day')
    await checkValue(frame, '6,950')
    await scrubAt(frame, .95)
    await checkValue(frame, '4,140')
  },
  sleep: async frame => {
    await click(frame, 'Previous sleep stage')
    await checkNote(frame, '02:24 · Deep')
    await scrubAt(frame, .99)
    await checkNote(frame, '06:52 · Awake')
  },
  'lung-capacity': async frame => {
    await checkValue(frame, '3.3')
    await click(frame, 'Repeat')
    assert.equal(await frame.locator('h1').textContent(), 'Test in progress')
    await click(frame, 'Stop')
    assert.equal(await frame.locator('h1').textContent(), 'Latest test')
  },
  hydration: async frame => {
    const wave = frame.locator('.front')
    assert.equal(await wave.evaluate(element => getComputedStyle(element).animationName), 'wave')
    const initial = await frame.locator('.water').evaluate(element => element.getBoundingClientRect().height)
    const add = frame.locator('#up')
    await add.hover()
    await page.mouse.down()
    const pressedScale = await add.evaluate(async element => {
      getComputedStyle(element).transform
      await Promise.all(element.getAnimations().map(animation => animation.finished))
      return new DOMMatrix(getComputedStyle(element).transform).a
    })
    assert.ok(pressedScale < 1)
    await page.mouse.up()
    await checkValue(frame, '1,500')
    assert.equal(await frame.locator('#glasses').textContent(), '6 glasses')
    assert.equal(await frame.locator('.water').evaluate(element => element.style.getPropertyValue('--level')), '58.5%')
    await frame.locator('.water').evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished)))
    assert.ok(await frame.locator('.water').evaluate(element => element.getBoundingClientRect().height) > initial)
    for (let count = 6; count < 12; count++) await click(frame, 'Add a glass of water')
    await checkValue(frame, '3,000')
    assert.ok(await frame.locator('#up').isDisabled())
    assert.equal(await frame.locator('.water').evaluate(element => element.style.getPropertyValue('--level')), '78%')
    for (let count = 0; count < 12; count++) await click(frame, 'Remove a glass of water')
    await checkValue(frame, '0')
    assert.ok(await frame.locator('#down').isDisabled())
    await click(frame, 'Add a glass of water')
    assert.equal(await frame.locator('#glasses').textContent(), '1 glass')
  },
  glucose: async frame => {
    await click(frame, 'Week')
    await checkValue(frame, '91')
    assert.equal(await frame.locator('#range').textContent(), '91%')
  },
  breathing: async frame => {
    await click(frame, 'Start breathing')
    await checkNote(frame, 'Inhale')
    await click(frame, 'Stop breathing')
    await checkNote(frame, 'One-minute session')
  },
  weather: async frame => {
    await click(frame, 'Next city')
    await checkValue(frame, '14')
    assert.equal(await frame.locator('#sky').getAttribute('data-sky'), 'clear')
    await click(frame, 'Next city')
    assert.equal(await frame.locator('#sky').getAttribute('data-sky'), 'rain')
  },
  hourly: async frame => {
    await click(frame, 'Next hour'); await checkValue(frame, '22')
    await scrubAt(frame, .95); await checkNote(frame, '4 pm · 14% rain')
  },
  'air-quality': async frame => {
    await click(frame, 'Ozone')
    await checkValue(frame, '34')
  },
  'uv-index': async frame => {
    await click(frame, 'Peak')
    await checkValue(frame, '9')
  },
  wind: async frame => {
    await click(frame, 'Next reading')
    await checkNote(frame, 'E · Gusts of 19 km/h')
  },
  sun: async frame => {
    await click(frame, 'Next hour')
    await checkValue(frame, '15:12')
    assert.equal(await frame.locator('#sun').getAttribute('cx'), '187')
    await scrubAt(frame, .99)
    assert.ok(await frame.locator('#dusk').evaluate(element => Number(element.style.opacity)) > .95)
    await scrubAt(frame, .05)
    assert.equal(await frame.locator('#dusk').evaluate(element => Number(element.style.opacity)), 0)
    assert.equal(await frame.locator('#scrub').evaluate(element => getComputedStyle(element).userSelect), 'none')
  },
  revenue: async frame => {
    for (const period of ['Week', 'Month', 'Year']) {
      await click(frame, period)
      const alignment = await frame.locator('#bars').evaluate(element => {
        const bounds = element.getBoundingClientRect()
        const bars = [...element.querySelectorAll('.bar:not([hidden])')]
        return bars.map((bar, index) => {
          const barBounds = bar.getBoundingClientRect()
          const label = bar.firstElementChild.getBoundingClientRect()
          const center = bounds.left + bounds.width * (index + .5) / bars.length
          return Math.max(Math.abs(barBounds.left + barBounds.width / 2 - center), Math.abs(label.left + label.width / 2 - center))
        })
      })
      assert.ok(alignment.every(error => error < .5), `${period} labels and bars should share the same centers`)
    }
    await checkValue(frame, '$638,520')
    await scrubAt(frame, .1)
    await checkNote(frame, 'Jan–Feb · $72,430 · +18.1%')
  },
  users: async frame => {
    await click(frame, 'Pause live users')
    await checkNote(frame, 'Paused')
  },
  funnel: async frame => {
    await click(frame, 'Checkout')
    await checkValue(frame, '12')
  },
  traffic: async frame => {
    await click(frame, 'Direct')
    await checkValue(frame, '26.3')
    assert.equal(await frame.locator('#source1').getAttribute('stroke-width'), '10')
    await click(frame, 'Referral')
    await checkValue(frame, '12.3')
  },
  goal: async frame => {
    await click(frame, 'Increase progress')
    await checkValue(frame, '79')
    await scrubAt(frame, .75)
    await checkValue(frame, '75')
  },
  retention: async frame => {
    await click(frame, 'Jun, week 7, 34%')
    await checkValue(frame, '34')
    assert.equal(await frame.locator('.cohort [aria-pressed=true]').count(), 1)
  },
  thermostat: async frame => {
    await click(frame, 'Increase temperature')
    await checkValue(frame, '25')
    await scrubAt(frame, .96)
    await checkValue(frame, '29')
    await click(frame, 'Cool')
    await checkNote(frame, 'Cooling to')
    await click(frame, 'Fan')
    assert.equal(await frame.locator('#fan').getAttribute('aria-pressed'), 'false')
  },
  lights: async frame => {
    await click(frame, 'Turn lights off')
    await checkValue(frame, '0')
    await click(frame, 'Turn lights on')
    await checkValue(frame, '65')
  },
  energy: async frame => {
    await click(frame, 'Next hour')
    await checkValue(frame, '2.5')
    await scrubAt(frame, .04)
    await checkNote(frame, '00:00')
  },
  timer: async frame => {
    await checkRow(frame, '.foot button')
    await click(frame, 'Add one minute')
    await checkValue(frame, '17:00')
    await click(frame, 'Remove one minute')
    await checkValue(frame, '16:00')
    await click(frame, 'Start timer')
    await checkNote(frame, 'Running')
    await click(frame, 'Reset timer')
    await checkValue(frame, '16:00')
  },
  lock: async frame => {
    const lock = frame.locator('#hold')
    await lock.hover()
    await page.mouse.down()
    await lock.evaluate(element => element.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, bubbles: true })))
    await page.waitForTimeout(900)
    await page.mouse.up()
    await checkNote(frame, 'Hold to unlock · Demo')
    await lock.click({ delay: 890 })
    await checkNote(frame, 'Hold to lock · Demo')
  },
  clock: async frame => {
    await click(frame, 'UTC')
    await checkNote(frame, 'Coordinated Universal Time')
    await click(frame, 'Show digital clock')
    assert.equal(await frame.locator('#digital-clock').isVisible(), true)
    await click(frame, 'Show analog clock')
    assert.equal(await frame.locator('#digital-clock').isVisible(), false)
  },
  calendar: async frame => {
    await checkRow(frame, '.head h1,.head button')
    const previous = await frame.locator('#detail').textContent(); await click(frame, 'Previous week')
    assert.notEqual(await frame.locator('#detail').textContent(), previous)
    await click(frame, 'Next week')
    const monday = frame.locator('.date').first()
    await monday[pressMethod()]()
    assert.equal(await monday.getAttribute('aria-pressed'), 'true')
    assert.match(await frame.locator('#agenda').textContent(), /Design sync/)
  },
  reminders: async frame => {
    await frame.locator('#reminders button').last().click()
    await checkValue(frame, '2')
  },
  music: async frame => {
    await click(frame, 'Play track')
    await click(frame, 'Next track')
    await checkNote(frame, 'Nocturne Op. 9 No. 2 · Frédéric Chopin')
    await click(frame, 'Pause track')
    await scrubAt(frame, .5)
    await checkValue(frame, '2:10')
  },
  stocks: async frame => {
    await click(frame, 'ETH')
    await checkValue(frame, '$3,526')
    await scrubAt(frame, .01)
    await checkValue(frame, '$3,460')
  },
}

try {
  for (const id of ids) {
    for (const width of [200, 320, 390, 430, 600]) {
      const corner = width === 200 ? 21 : 0
      await page.emulateMedia({ colorScheme: width === 390 ? 'light' : 'dark' })
      const { frame, card } = await show(buildTelegramHtml(id), width, corner)
      const size = await measure(card, corner)
      dimensions.push({ id, ...size })
      checkLayout(id, width, size)
      if (width === 200 || width === 320) {
        await tests[id](frame)
        checkLayout(id, width, await measure(card, corner))
      }
    }
    assert.deepEqual(errors, [], id)
    console.log(`${id}: layout and interactions passed`)
  }
  if (ids.includes('hydration')) {
    for (const systemReduce of [false, true]) {
      await page.emulateMedia({ reducedMotion: systemReduce ? 'reduce' : 'no-preference' })
      const { frame } = await show(buildTelegramHtml('hydration', { reducedMotion: !systemReduce }), 320)
      assert.equal(await frame.locator('.front').evaluate(element => getComputedStyle(element).animationName), 'none')
      assert.equal(await frame.locator('.water').evaluate(element => getComputedStyle(element).transitionProperty), 'none')
      await click(frame, 'Add a glass of water'); await checkValue(frame, '1,500')
    }
  }
  assert.deepEqual(errors, [])
  const tallest = dimensions.reduce((a, b) => a.height >= b.height ? a : b)
  console.log(`${ids.length} widgets checked in Chromium at 200, 320, 390, 430 and 600 px. Tallest: ${Math.ceil(tallest.height)} px (${tallest.id} at ${tallest.width}px).`)
} finally {
  await browser.close()
}
