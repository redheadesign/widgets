# Widgets · Redheadesign

[Live gallery](https://redheadesign.com/widgets/) · [Download the release](https://github.com/redheadesign/widgets/releases/latest/download/widgets-kit.zip) · [React guide](docs/library.md) · [Telegram guide](docs/telegram.md)

30 interactive React components for websites, dashboards, and bento grids. Use the studio to adjust a widget's size, color, and animation, preview the Telegram version, and copy the HTML or iframe embed code. The Telegram export runs as a standalone HTML widget inside a bot message in a private chat.

The live gallery features 29 cards, including two experiments, Compass and Moon Phase. The grid adapts to one, two, or three columns, and its layout and colors change on each visit. Filter the cards by category and try their controls directly in the gallery.

![The dark widget gallery in a three-column layout](docs/images/widgets-desktop.webp)

<details>
<summary>Gallery on mobile</summary>

<img src="docs/images/widgets-phone.webp" width="390" alt="The widget gallery in a two-column layout on mobile">

</details>

## Widget gallery

### Analytics

![Revenue, live users, and cohort retention](docs/images/widgets-analytics.webp)
![Conversion funnel, monthly goal, and Bitcoin price](docs/images/widgets-finance.webp)

### Health and habits

![Steps, heart rate, and activity rings](docs/images/widgets-activity.webp)
![Sleep, average glucose, and lung capacity](docs/images/widgets-health.webp)
![Hydration, guided breathing, and timer](docs/images/widgets-routines.webp)

### Weather

![Current weather, air quality, and UV index](docs/images/widgets-weather.webp)
![Sun path, wind direction, and moon phase](docs/images/widgets-sky.webp)

### Home and navigation

![Thermostat, lights, and front door lock in a 1 × 2 layout](docs/images/widgets-home.webp)
![Energy use and compass](docs/images/widgets-energy.webp)

### Everyday

![Music player, clock, and reminders](docs/images/widgets-everyday.webp)

<details>
<summary>Three more widgets from the studio</summary>

![Calendar, traffic sources, and hourly forecast](docs/images/widgets-studio-extra.webp)

</details>

## Run the studio locally

Requires Node.js 22.18+ or 24 LTS.

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

- [Studio](http://127.0.0.1:5173/) for browsing, previewing, and exporting widgets.
- [Gallery](http://127.0.0.1:5173/widgets/) with an interactive grid and category filters.
- [Single-widget embed](http://127.0.0.1:5173/?embed=hydration) with a transparent background. The iframe container sets its width and height.

## Use with React

For React 19, install the package from the latest release.

```sh
npm install https://github.com/redheadesign/widgets/releases/download/v1.0.4/redheadesign-widgets-1.0.4.tgz
```

To build from `main`, clone the repository and run `npm ci` and `npm pack`. Install the resulting `.tgz` file in your app.

Import the stylesheet once in your app's entry point.

```tsx
import { Widget } from '@redheadesign/widgets';
import '@redheadesign/widgets/style.css';

export function Dashboard() {
  return <div style={{ height: 176 }}><Widget id="hydration" fill /></div>;
}
```

`size="small"`, `"wide"`, and `"large"` correspond to 1 × 1, 2 × 1, and 2 × 2 layouts. For a responsive grid, use `fill` and set the size of the parent container. The recommended minimum is 160 × 160 px. [Props, widget IDs, and examples](docs/library.md)

## Send a widget with a Telegram bot

Download the HTML from the studio or generate it with `buildTelegramHtml('hydration')` from `@redheadesign/widgets/telegram`. The user opens a private chat with the bot and taps **Start**. The bot can then pass the HTML and `chat_id` to `sendWidget`. [Bot API example and HTML limits](docs/telegram.md)

## Build and test

```sh
npm run build
npm run check:library
npm run check:telegram -- --exact --write
```

The website builds into `dist/`. Standalone HTML files for `sendWidget` are written to `telegram-dist/`. The `--exact` flag requires Python 3. [Telegram export guide](docs/telegram.md)

With the studio running, `npm run qa:landing` checks the gallery layout, filters, and randomization in Edge. `npm run qa:web` tests the primary widget interactions at three sizes.

Health, weather, analytics, and smart home widgets use sample data. The web music player includes five CC0 recordings. [Audio, cover art, and font credits](ATTRIBUTION.md) · [NASA SVS Moon image](src/widgets/astronomy-assets/ATTRIBUTION.md)
