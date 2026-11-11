# Библиотека компонентов

`@redheadesign/widgets` — ESM-пакет для React 19 с типами TypeScript, стилями и фонами карточек. Он использует те же компоненты, что и студия и галерея. HTML-экспорт для сообщений Telegram доступен через отдельный импорт и работает в Node.js без DOM.

## Установка

[Скачать весь набор](https://github.com/redheadesign/widgets/releases/latest/download/widgets-kit.zip): в ZIP есть React-пакет, 30 HTML-виджетов для Telegram и инструкции. React-пакет содержит готовые JavaScript, стили, типы и медиа. Можно установить его отдельно:

```sh
npm install https://github.com/redheadesign/widgets/releases/download/v1.0.2/redheadesign-widgets-1.0.2.tgz
```

Для сборки из исходников GitHub закрепите SHA коммита в зависимости.

```sh
npm install 'github:redheadesign/widgets#<commit-sha>'
```

Из локальной копии можно собрать архив. Запустите `npm ci` и `npm pack` в репозитории, затем установите архив из своего приложения. Имя архива включает версию из `package.json`.

```sh
npm install /path/to/redheadesign-widgets-1.0.2.tgz
```

## Использование в React

Подключите CSS один раз в точке входа приложения. В Next.js App Router подключите его в корневом layout.

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

| Параметр | Что меняет |
| --- | --- |
| `id` | Идентификатор из `widgetCatalog`. Неизвестный идентификатор возвращает `null`. |
| `size` | `small` — 176 × 176, `wide` — 368 × 176, `large` — 368 × 368 CSS-пикселей. По умолчанию берётся размер карточки из каталога. |
| `fill` | Карточка заполняет контейнер по ширине и высоте. Задайте высоту через строку Grid, `height` или `aspect-ratio`. Для плотной сетки держите размеры ячейки от 160 × 160 px. |
| `tone` | Палитра подложки из `tones`. По умолчанию карточка берёт свою палитру. |
| `settings` | `accent` задаёт акцент CSS-цветом, `glow` управляет свечением в процентах (100 по умолчанию), `speed` задаёт множитель скорости, `paused` приостанавливает фоновое движение, `reducedMotion` уменьшает анимацию. |
| `style` | Дополнительные CSS-свойства внешней рамки, например `{ height: 192 }`. |

`widgetCatalog` содержит идентификатор, название, категорию, исходный размер, палитру, описание управления и React-компонент каждой карточки. Для поиска по идентификатору используйте `widgetsById`. Экспорты `WidgetFrame`, `WidgetCard`, `DotNumber` и тип `WidgetDefinition` позволяют оформить собственную карточку. Для предпросмотра компонента из каталога рендерьте `Widget` или передавайте его описание в `WidgetFrame`, чтобы у него были стили, палитра и контекст анимации.

Виджеты хранят интерактивное состояние внутри экземпляра. Перемонтирование сбрасывает его. Данные здоровья, погоды, котировок и аналитики заданы в примерах, а часы, календарь и таймер используют время устройства. Для подключения собственных данных используйте исходник карточки или соберите её на `WidgetFrame`.

В bento-сетке используйте квадратный модуль до 176 px и отступ 16 px. Не ставьте горизонтальный график в узкий формат 1 × 2. Внутри карточки показание и переключатели остаются сверху, а график с ограниченной высотой — снизу. Декоративное затухание на краях применяется отдельно от подписей и зоны управления.

## HTML для сообщений Telegram

```js
import { writeFile } from 'node:fs/promises';
import { buildTelegramHtml } from '@redheadesign/widgets/telegram';

const html = buildTelegramHtml('hydration', { tint: '#3539b1', accent: '#a9e1ff' });
await writeFile('hydration.html', html);
```

Список идентификаторов доступен в `TELEGRAM_WIDGET_IDS`. Размеры, ограничения и отправка через Bot API описаны в [инструкции по Telegram](telegram.md).

## Сборка и проверка

- `npm run build:library` создаёт файлы пакета в `lib/`.
- `npm run check:library` устанавливает архив в чистый проект, проверяет типы, сборку потребителя, фон и управление карточкой в браузере. Для браузерной проверки нужен Microsoft Edge или путь к Chromium в `BLOOM_BROWSER_PATH`.
- `npm run build` собирает студию и галерею для веба в `dist/`.
