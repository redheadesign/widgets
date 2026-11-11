# Виджеты · Redheadesign

[Витрина](https://redheadesign.com/widgets/) · [Скачать набор](https://github.com/redheadesign/widgets/releases/latest/download/widgets-kit.zip) · [Библиотека React](docs/library.md) · [Виджеты в Telegram](docs/telegram.md)

30 интерактивных карточек для сайтов, bento-сеток и сообщений Telegram. На широком экране витрина показывает три колонки и пропорционально увеличивает карточки вместе с текстом и графиками. На узких экранах сетка переходит на две или одну колонку. Раскладка, порядок и палитра меняются при каждом открытии. В студии можно переключить формат, настроить цвет и движение, посмотреть вариант для Telegram и забрать HTML или iframe.

![Тёмная витрина виджетов в трёх колонках](docs/images/widgets-desktop.webp)

<details>
<summary>Витрина на телефоне</summary>

![Виджеты в двух колонках на телефоне](docs/images/widgets-phone.webp)

</details>

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

Установите React-пакет из релиза:

```sh
npm install https://github.com/redheadesign/widgets/releases/download/v1.0.3/redheadesign-widgets-1.0.3.tgz
```

Подключите стили один раз в точке входа приложения:

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

При запущенной студии `npm run qa:landing` проверяет геометрию, фильтры и рандомизацию витрины в Edge. `npm run qa:web` запускает основные действия всех веб-карточек в трёх форматах.

Карточки здоровья, погоды, аналитики и умного дома используют демонстрационные данные. Плеер воспроизводит пять записей CC0 на вебе. [Сведения об аудио, обложке и шрифте](ATTRIBUTION.md).
