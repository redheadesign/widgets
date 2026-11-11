import { spawnSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { Script } from 'node:vm'
import { deflateSync } from 'node:zlib'
import { buildTelegramHtml, TELEGRAM_WIDGET_IDS } from '../src/telegram.ts'

const args = process.argv.slice(2)
if (args.some(argument => !['--exact', '--write'].includes(argument))) {
  throw new Error('Usage: npm run check:telegram -- [--exact] [--write]')
}

const maxHtmlBytes = 32_768
const maxDeflatedBytes = 4_096
const compressedBudget = 3_900
const bannedTags = /<(?:audio|video|iframe|object|embed|link|meta|input|select|textarea|dialog|clipPath|mask|pattern|marker|filter|animate(?:Motion|Transform)?|foreignObject)\b|<script\s+src=/i
const bannedCss = /@(?:import|font-face|container|layer|property)\b|:has\(|:focus(?:-\w+)?\b|\b(?:oklch|color-mix)\(|\b\d+(?:vh|dvh|svh|lvh)\b/i
const unavailableCalls = /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|Worker|postMessage)\s*\(/

function validate(id, html, deflated, exact) {
  const bytes = Buffer.byteLength(html, 'utf8')
  if (bytes > maxHtmlBytes || deflated > maxDeflatedBytes) {
    throw new Error(`${id}: Telegram limit exceeded (${bytes} raw, ${deflated} compressed)`)
  }
  if (!exact && deflated > compressedBudget) {
    throw new Error(`${id}: ${deflated} compressed bytes are close to the limit. Recheck with --exact.`)
  }
  if (html.includes('\u0000') || bannedTags.test(html) || bannedCss.test(html) || unavailableCalls.test(html)) {
    throw new Error(`${id}: contains an unsupported Telegram widget feature`)
  }
  const scripts = Array.from(html.matchAll(/<script>([\s\S]*?)<\/script>/g), match => match[1])
  if (scripts.length !== 1) throw new Error(`${id}: expected exactly one inline script`)
  new Script(scripts[0], { filename: `${id}.js` })
  return { bytes, deflated }
}

function exactSizes(documents) {
  const python = process.platform === 'win32' ? 'python' : 'python3'
  const result = spawnSync(python, ['-c', `import json, sys, zlib
html = json.load(sys.stdin.buffer)
json.dump([len(zlib.compress(doc.encode('utf-8'), 9)) for doc in html], sys.stdout)`], {
    input: JSON.stringify(documents), encoding: 'utf8', windowsHide: true,
  })
  if (result.error || result.status !== 0) {
    throw new Error(`Exact sizing requires Python 3 on PATH. ${result.error?.message ?? result.stderr}`)
  }
  return JSON.parse(result.stdout)
}

const variants = [
  undefined,
  { accent: '#123456', tint: '#654321', glow: 1.98, speed: 0.25, reducedMotion: true },
  { accent: '#efeedc', tint: '#f1d9e9', glow: 0, speed: 3 },
]
const documents = TELEGRAM_WIDGET_IDS.flatMap(id => variants.map((options, index) => ({
  id, variant: index, html: buildTelegramHtml(id, options),
})))
const exact = args.includes('--exact')
const sizes = exact ? exactSizes(documents.map(({ html }) => html)) : documents.map(({ html }) => deflateSync(html, { level: 9 }).length)
const checked = documents.map(({ id, variant, html }, i) => {
  const label = variant ? `${id} (custom ${variant})` : id
  return { id, variant, html, ...validate(label, html, sizes[i], exact) }
})

if (args.includes('--write')) {
  const folder = new URL('../telegram-dist/', import.meta.url)
  const exports = checked.filter(({ variant }) => variant === 0)
  await mkdir(folder, { recursive: true })
  await Promise.all(exports.map(({ id, html }) => writeFile(new URL(`${id}.html`, folder), html)))
  console.log(`Wrote ${exports.length} standalone files to telegram-dist/`)
}

const largest = checked.reduce((a, b) => a.deflated >= b.deflated ? a : b)
const maxBytes = Math.max(...checked.map(widget => widget.bytes))
console.log(`${TELEGRAM_WIDGET_IDS.length} widgets checked (${checked.length} documents). Largest raw: ${maxBytes}/${maxHtmlBytes} B. Largest compressed: ${largest.deflated}/${maxDeflatedBytes} B (${largest.id}, ${exact ? 'Python' : 'Node.js'} zlib level 9).`)
