# Виджеты · Redheadesign

[Витрина](https://redheadesign.com/widgets/) · [Библиотека React](docs/library.md) · [Виджеты в Telegram](docs/telegram.md)

30 интерактивных карточек для сайтов, bento-сеток и сообщений Telegram. На витрине от одной до пяти колонок: карточки занимают один или несколько квадратных модулей, а раскладка, порядок и палитра меняются при каждом открытии. В студии можно переключить формат, настроить цвет и движение, посмотреть вариант для Telegram и забрать HTML или iframe.

## Запустить студию

Нужен Node.js 22.18+ или 24 LTS.

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

- [Студия](http://127.0.0.1:5173/) — каталог, предпросмотр и экспорт.
- [Витрина](http://127.0.0.1:5173/widgets/) — интерактивная сетка с фильтрами по категориям.
- [Отдельный виджет](http://127.0.0.1:5173/?embed=hydration) — прозрачный фон для iframe. Контейнер iframe задаёт его ширину и высоту.

## Подключить к React

Установите [архив релиза](https://github.com/redheadesign/widgets/releases/latest), затем подключите стили один раз:

```tsx
import { Widget } from '@redheadesign/widgets';
import '@redheadesign/widgets/style.css';

export function Dashboard() {
  return <div style={{ height: 176 }}><Widget id="hydration" fill /></div>;
}
```

`size="small"`, `"wide"` или `"large"` задаёт номинальный формат 1 × 1, 2 × 1 или 2 × 2. Для адаптивной сетки используйте `fill` и задайте размер родителю. Рекомендуемый минимум — 160 × 160 px. [Параметры, каталог и примеры](docs/library.md).

## Собрать и проверить

```sh
npm run build
npm run check:library
npm run check:telegram -- --exact --write
```

Сайт собирается в `dist/`. Отдельные HTML для `sendWidget` сохраняются в `telegram-dist/`. Для `--exact` нужен Python 3. [Ограничения Telegram и пример отправки](docs/telegram.md).

При запущенной студии `npm run qa:landing` проверяет геометрию сетки, фильтры, рандомизацию и переключение темы в Edge.

Карточки здоровья, погоды, аналитики и умного дома используют демонстрационные данные. Плеер воспроизводит пять записей CC0 на вебе. [Сведения об аудио, обложке и шрифте](ATTRIBUTION.md).
