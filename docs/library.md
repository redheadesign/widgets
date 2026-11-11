# React widget library

`@redheadesign/widgets` is an ESM package with 30 components for React 19, including TypeScript types, styles, and widget backgrounds. The studio uses the full catalog. The live gallery shows 27 widgets from the catalog plus two experiments, Compass and Moon Phase. The Telegram HTML exporter has its own entry point and runs in Node.js without a DOM.

## Install

The [complete kit](https://github.com/redheadesign/widgets/releases/latest/download/widgets-kit.zip) contains the React package, 30 Telegram HTML widgets, and setup instructions. To install just the React package, which includes compiled JavaScript, styles, types, and media, run the following command.

```sh
npm install https://github.com/redheadesign/widgets/releases/download/v1.0.3/redheadesign-widgets-1.0.3.tgz
```

To install from GitHub source, pin the dependency to a commit SHA.

```sh
npm install 'github:redheadesign/widgets#<commit-sha>'
```

To build a local archive, run `npm ci` and `npm pack` in the repository, then install the archive from your app. The filename includes the version from `package.json`.

```sh
npm install /path/to/redheadesign-widgets-1.0.3.tgz
```

## Use with React

Import the stylesheet once in your app's entry point. With the Next.js App Router, import it in the root layout.

```tsx
import { Widget } from '@redheadesign/widgets';
import '@redheadesign/widgets/style.css';

export function Dashboard() {
  return (
    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))' }}>
      <section style={{ minWidth: 0, height: 192 }}>
        <Widget id="hydration" fill />
      </section>
      <section style={{ minWidth: 0, height: 192 }}>
        <Widget id="timer" fill tone="teal" settings={{ accent: '#e4f765', glow: 85 }} />
      </section>
    </div>
  );
}
```

| Prop | Behavior |
| --- | --- |
| `id` | Widget ID from `widgetCatalog`. An unknown ID returns `null`. |
| `size` | `small` is 176 × 176, `wide` is 368 × 176, and `large` is 368 × 368 CSS pixels. Defaults to the size defined in the catalog. |
| `fill` | Fills the container in both dimensions. Set its height through a grid row, `height`, or `aspect-ratio`. For dense grids, keep each cell at least 160 × 160 px. |
| `tone` | Background palette from `tones`. Defaults to the widget's own palette. |
| `settings` | `accent` accepts a CSS color. `glow` sets the glow percentage (default 100). `speed` is a speed multiplier. `paused` pauses background motion, and `reducedMotion` reduces animation. |
| `style` | Additional styles for the outer frame, such as `{ height: 192 }`. |

`widgetCatalog` lists each widget's ID, title, category, default size, palette, interaction instructions, and React component. Use `widgetsById` to look up a widget by ID. Build your own cards with `WidgetFrame`, `WidgetCard`, `DotNumber`, and the `WidgetDefinition` type. To preview a catalog widget with its styles, palette, and animation context, render `Widget` or pass its definition to `WidgetFrame`.

### Widget IDs

| Category | `id` for React and HTML export |
| --- | --- |
| Analytics | `revenue`, `users`, `funnel`, `traffic`, `goal`, `retention` |
| Health | `heart-rate`, `activity`, `steps`, `sleep`, `lung-capacity`, `hydration`, `glucose`, `breathing` |
| Weather | `weather`, `hourly`, `air-quality`, `uv-index`, `wind`, `sun` |
| Home | `thermostat`, `lights`, `energy`, `timer`, `lock` |
| Everyday | `clock`, `calendar`, `reminders`, `music`, `stocks` |

Each widget instance holds its own interaction state. Remounting resets it. Health, weather, price, and analytics widgets use sample data. The clock, calendar, and timer use the device clock. To connect your own data, adapt the widget's source or build a card with `WidgetFrame`.

For a bento grid, use a square unit up to 176 px with a 16 px gap. Give horizontal charts a square or wide slot. Readouts and switches stay at the top of the card, with a height-limited chart at the bottom. Decorative edge fades leave labels and controls clear.

## HTML for Telegram messages

```js
import { writeFile } from 'node:fs/promises';
import { buildTelegramHtml } from '@redheadesign/widgets/telegram';

const html = buildTelegramHtml('hydration', { tint: '#3539b1', accent: '#a9e1ff' });
await writeFile('hydration.html', html);
```

`TELEGRAM_WIDGET_IDS` lists the supported widget IDs. See the [Telegram guide](telegram.md) for dimensions, limits, and sending widgets through the Bot API.

## Build and test

- `npm run build:library` writes the package files to `lib/`.
- `npm run check:library` installs the archive in a clean project and checks types, the consuming app's build, widget backgrounds, and browser interactions. Use Microsoft Edge or set `BLOOM_BROWSER_PATH` to a Chromium executable.
- `npm run build` builds the web studio and gallery into `dist/`.
