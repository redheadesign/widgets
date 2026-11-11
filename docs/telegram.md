# Виджеты в сообщениях Telegram

В личный чат с ботом можно отправить самостоятельный HTML-файл виджета через `sendWidget`. Этот способ появился в Bot API 10.4 9 ноября 2026 года. В рабочей среде виджеты сейчас доступны в личных чатах с ботом. Группы, пересылка и inline-режим доступны на тестовом сервере. [Журнал изменений](https://core.telegram.org/bots/api-changelog#november-9-2026) · [Доступность](https://core.telegram.org/bots/widgets#availability)

## Скачать и проверить

В студии выберите виджет и откройте режим Telegram. Настройте цвет акцента, оттенок карточки, свечение и скорость, затем скачайте HTML. Для экспорта всех 30 файлов с исходными настройками запустите команду из папки проекта. Для `--exact` нужен Python 3 в `PATH`.

```powershell
npm run check:telegram -- --exact --write
```

Команда проверяет размер, синтаксис JavaScript и ряд ограничений профиля для исходной и двух пользовательских настроек каждой карточки. Флаг `--write` сохраняет исходные варианты в `telegram-dist/`. С флагом `--exact` команда использует zlib уровня 9 в Python, как на сервере Telegram. Допустимый объём составляет 32 768 байт HTML в UTF-8 и 4096 байт после сжатия. Отдельный скачанный файл можно проверить той же библиотекой. [Проверка размера](https://core.telegram.org/bots/widgets#counting-the-size)

```powershell
python -c "import pathlib,zlib; print(len(zlib.compress(pathlib.Path('telegram-dist/timer.html').read_bytes(),9)))"
```

Проверка в Chromium открывает все 30 карточек на ширине 200, 320, 390, 430 и 600 px. Она проверяет касания на 200 px, клики на 320 px, компоновку после смены состояния и безопасную область под время сообщения. Для запуска нужны `playwright-core` и установленный Microsoft Edge. Чтобы проверить одну карточку, передайте её идентификатор, например `hydration`.

```powershell
node --experimental-strip-types qa/telegram-verify.mjs
```

## Отправить в личный чат

Пользователь должен открыть чат с ботом и нажать «Старт». Возьмите ID чата из `message.chat.id` полученного ботом обновления. Установите `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` в окружении, затем выполните пример с Node.js из папки проекта. Подпись видна в уведомлениях и освобождает нижний угол виджета от времени сообщения. [Метод sendWidget](https://core.telegram.org/bots/api#sendwidget) · [Время сообщения](https://core.telegram.org/bots/widgets#the-time-in-the-corner)

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
    body: JSON.stringify({ chat_id: chatId, html, caption: 'Таймер на 16 минут. Можно изменить длительность, поставить на паузу и сбросить.' }),
  })
} catch {
  throw new Error('Failed to connect to the Telegram Bot API')
}
const result = await response.json()
if (!response.ok || !result.ok) throw new Error(result.description || `Telegram HTTP ${response.status}`)
console.log('Message ID:', result.result.message_id)
'@ | node --input-type=module -
```

## Как устроен экспорт

`buildTelegramHtml(id, { accent, tint, glow, speed, reducedMotion })` генерирует один документ без внешних ресурсов. Акцент и оттенок принимают `#RRGGBB`, свечение принимает значения от 0 до 2, скорость от 0,25 до 3. Заголовки и обычные числа используют системный шрифт, а точечные цифры нарисованы SVG. В Hydration уровень воды соответствует количеству стаканов. При уменьшенном движении волны остаются статичными, а уровень меняется сразу. Учитываются настройки студии и `prefers-reduced-motion`. [Профиль виджета](https://core.telegram.org/bots/widgets#what-widgets-support)

Превью студии подстраивает высоту рамки под содержимое. При отправке опустите `width` и `height` или передайте `0`, чтобы Telegram измерил карточку по содержимому на всю ширину пузыря. Нижний отступ виджета учитывает безопасную область для времени сообщения. [Размеры и время сообщения](https://core.telegram.org/bots/widgets#sizes)

Графики сна, шагов, прогноза, выручки, расхода энергии и котировок реагируют на касание и горизонтальное перетаскивание. Когорты и этапы воронки выбираются касанием ячеек. Вертикальный жест прокручивает чат. Замок реагирует на удержание и сбрасывает удержание, если жест отменён. [Жесты Telegram](https://core.telegram.org/bots/widgets#gestures)

Часы, календарь и таймер работают по времени устройства. Календарь содержит пример расписания для текущей недели. Погода, котировки, аналитика и показатели здоровья используют данные примера. В музыкальной карточке работают таймлайн и переключение треков. Звук доступен в веб-версии, поскольку профиль Telegram не поддерживает воспроизведение аудио. Замок и домашние приборы имитируют локальные состояния. [Профиль виджета](https://core.telegram.org/bots/widgets#what-widgets-support)

Для данных от бота можно передать `chat_data` или `public_data` и обновлять их через Bot API. Действия с ответом бота потребуют `allow_queries: true`, `TelegramWidget.request()` и обработчика `widget_query`. После отправки код HTML фиксируется в сообщении. Для изменения разметки или стилей отправьте новую версию. [Состояние и запросы](https://core.telegram.org/bots/widgets#sending-widgets)

Клиент Telegram использует собственный рендерер и применяет ограничения профиля. Для проверки в чате отправьте итоговый HTML тестовым ботом и сравните входящий пузырь в светлой и тёмной теме. В подпись сообщения включите основные данные и действия карточки, поскольку клиент пока не обрабатывает её ARIA-семантику. Для размещения полного React-виджета внутри Telegram разместите сборку по HTTPS и откройте её как Mini App. [Проверка в Telegram](https://core.telegram.org/bots/widgets#testing) · [Правила интерфейса](https://core.telegram.org/bots/widgets#design-guidelines) · [Mini Apps](https://core.telegram.org/bots/webapps)
