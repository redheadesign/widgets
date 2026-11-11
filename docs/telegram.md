# Widgets in Telegram messages

Bots can send a self-contained HTML widget to a private chat with `sendWidget`, introduced in Bot API 10.4 on November 9, 2026. The production environment supports private chats with the bot. Group chats, forwarding, and inline mode are available on the test server. [Bot API changelog](https://core.telegram.org/bots/api-changelog#november-9-2026) · [Widget availability](https://core.telegram.org/bots/widgets#availability)

## Download and validate

Choose a widget in the studio and switch to Telegram mode. Adjust the accent color, card tint, glow, and animation speed, then download the HTML. To export all 30 widgets with their default settings, run this command from the project directory. The `--exact` flag requires Python 3 on your `PATH`.

```powershell
npm run check:telegram -- --exact --write
```

The command checks size, JavaScript syntax, and several Telegram widget constraints for the default settings and two custom configurations of each widget. The `--write` flag saves the default exports to `telegram-dist/`. The `--exact` flag uses Python's zlib at level 9, matching the compression level used by Telegram. The limits are 32,768 bytes of UTF-8 HTML and 4,096 bytes after compression. You can use the same library to check an individual download. [How Telegram counts widget size](https://core.telegram.org/bots/widgets#counting-the-size)

```powershell
python -c "import pathlib,zlib; print(len(zlib.compress(pathlib.Path('telegram-dist/timer.html').read_bytes(),9)))"
```

The Chromium checks open all 30 widgets at widths of 200, 320, 390, 430, and 600 px. They cover touch input at 200 px, clicks at 320 px, layout after state changes, and clearance for the message timestamp. They require `playwright-core` and Microsoft Edge. To check a single widget, pass its ID, such as `hydration`.

```powershell
node --experimental-strip-types qa/telegram-verify.mjs
```

## Send to a private chat

The user opens a private chat with the bot and taps **Start**. Get the chat ID from `message.chat.id` in the update the bot receives. Set the `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` environment variables, then run the Node.js example from the project directory. The caption appears in notifications and keeps the timestamp clear of the widget's lower corner. [sendWidget](https://core.telegram.org/bots/api#sendwidget) · [Message timestamp](https://core.telegram.org/bots/widgets#the-time-in-the-corner)

```powershell
@'
import { readFile } from 'node:fs/promises'

const token = process.env.TELEGRAM_BOT_TOKEN
const chatId = process.env.TELEGRAM_CHAT_ID
if (!token || !chatId) throw new Error('Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID')

const html = await readFile('telegram-dist/timer.html', 'utf8')
let response
try {
  response = await fetch(`https://api.telegram.org/bot${token}/sendWidget`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, html, caption: 'A 16-minute timer. Adjust the duration, pause, or reset it.' }),
  })
} catch {
  throw new Error('Failed to connect to the Telegram Bot API')
}
const result = await response.json()
if (!response.ok || !result.ok) throw new Error(result.description || `Telegram HTTP ${response.status}`)
console.log('Message ID:', result.result.message_id)
'@ | node --input-type=module -
```

## How the export works

`buildTelegramHtml(id, { accent, tint, glow, speed, reducedMotion })` generates one self-contained document. Accent and tint accept `#RRGGBB` colors, glow ranges from 0 to 2, and speed ranges from 0.25 to 3. Titles and standard numbers use the system font, and dot-matrix digits use SVG. In Hydration, the water level reflects the glass count. With reduced motion, the waves stay still and the level updates immediately. The export respects the studio settings and `prefers-reduced-motion`. [Supported widget features](https://core.telegram.org/bots/widgets#what-widgets-support)

The studio preview adjusts the frame height to the content. When sending a widget, omit `width` and `height` or pass `0` to let Telegram size the card to its content across the full width of the message bubble. The bottom padding leaves room for the message timestamp. [Dimensions and timestamp](https://core.telegram.org/bots/widgets#sizes)

The sleep, steps, forecast, revenue, energy, and price charts respond to taps and horizontal drags. Tap a cell to select a cohort or a funnel stage. Vertical gestures scroll the chat. The door lock responds to a long press and clears its progress if the gesture is canceled. [Telegram gestures](https://core.telegram.org/bots/widgets#gestures)

The clock, calendar, and timer use the device clock. The calendar shows a sample agenda for the current week. Weather, prices, analytics, and health metrics use sample data. The music widget supports seeking and switching tracks, with audio playback available in the web version. The door lock and smart home controls simulate device states locally. [Supported widget features](https://core.telegram.org/bots/widgets#what-widgets-support)

Bots can pass data through `chat_data` or `public_data` and update it through the Bot API. Actions that need a response from the bot require `allow_queries: true`, `TelegramWidget.request()`, and a `widget_query` handler. The HTML is fixed once the message is sent. Send a new version to change its markup or styles. [Widget state and requests](https://core.telegram.org/bots/widgets#sending-widgets)

Telegram renders widgets with its own renderer and enforces its widget constraints. To test the final HTML in a chat, send it from a test bot and check the incoming message in both light and dark themes. Include the widget's main information and actions in the caption so users can access them even when the client does not interpret the widget's ARIA semantics. To run the full React widget in Telegram, host the build over HTTPS and open it as a Mini App. [Testing in Telegram](https://core.telegram.org/bots/widgets#testing) · [Design guidelines](https://core.telegram.org/bots/widgets#design-guidelines) · [Mini Apps](https://core.telegram.org/bots/webapps)
