import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  ArrowDownToLine, ArrowUpRight, AudioLines, Check, ChevronDown, ChevronRight,
  Code2, Copy, Grid2X2, Grid3X3, HeartPulse, House, Layers3, Link, Minus,
  Pause, Play, Plus, RotateCcw, Search, SlidersHorizontal, Sparkles, Sun, TrendingUp, X,
} from 'lucide-react';
import {
  BloomWidget, defaultWidgetSettings, dimensions, widgetCatalog, widgetsById, tones,
  type Category, type Size, type Tone, type WidgetDefinition, type WidgetSettings,
} from './widgets';
import { buildTelegramHtml } from './telegram';
import './studio.css';

const categories = [
  { id: 'analytics', label: 'Аналитика', icon: TrendingUp },
  { id: 'health', label: 'Здоровье', icon: HeartPulse },
  { id: 'weather', label: 'Погода', icon: Sun },
  { id: 'home', label: 'Дом', icon: House },
  { id: 'everyday', label: 'На каждый день', icon: Layers3 },
] as const;
const presets = ['#e4f765', '#bba7ff', '#72e9cc', '#ff8cae', '#81b7ff'];
const toneNames: Record<Tone, string> = {
  red: 'Красный', graphite: 'Графит', pink: 'Фуксия', rose: 'Малина', blue: 'Синий',
  indigo: 'Индиго', violet: 'Фиолетовый', olive: 'Оливковый', ember: 'Терракота',
  amber: 'Янтарный', green: 'Изумрудный', cyan: 'Голубой', teal: 'Бирюзовый', plum: 'Сливовый',
  azure: 'Лазурный', cobalt: 'Кобальтовый', mint: 'Мятный', orchid: 'Орхидейный', coral: 'Коралловый', smoke: 'Дымчатый', slate: 'Сланцевый',
};
const sizeNames = { small: '1 × 1', wide: '2 × 1', large: '2 × 2' };
const sizeParams: Record<Size, string> = { small: '1x1', wide: '2x1', large: '2x2' };
const sizes = Object.keys(sizeParams) as Size[];
const readSize = (value: string | null) => sizes.find(size => sizeParams[size] === value);
const slugLabels: Record<string, string> = {
  'heart-rate': 'Пульс ЭКГ', activity: 'Кольца активности', steps: 'Шаги', sleep: 'Сон',
  'lung-capacity': 'Дыхательный тест', hydration: 'Вода', glucose: 'Глюкоза', breathing: 'Дыхание',
  weather: 'Погода город', hourly: 'Прогноз по часам', 'air-quality': 'Качество воздуха',
  'uv-index': 'УФ индекс', wind: 'Ветер', sun: 'Восход закат',
  revenue: 'Выручка доход', users: 'Пользователи', funnel: 'Воронка конверсия', traffic: 'Трафик',
  goal: 'Цель', retention: 'Удержание когорты', thermostat: 'Термостат температура', lights: 'Свет яркость',
  energy: 'Энергия', timer: 'Таймер', lock: 'Замок дверь', clock: 'Часы',
  calendar: 'Календарь', reminders: 'Напоминания задачи', music: 'Музыка плеер', stocks: 'Акции котировки',
};
type View = 'studio' | 'gallery';
type Target = 'web' | 'telegram';
type Background = 'graphite' | 'ink' | 'paper';
const frameReviewIds = new Set(['hydration', 'heart-rate']);
const urlParams = () => new URLSearchParams(window.location.search);
const knownWidget = (id: string | null) => id && Object.hasOwn(widgetsById, id) ? id : 'revenue';
const numberFmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
const validHex = (input: string | null) => input && /^#[0-9a-f]{6}$/i.test(input) ? input : undefined;
const validTone = (input: string | null) => input && Object.hasOwn(tones, input) ? input as Tone : undefined;
const limit = (value: string | null, fallback: number, min: number, max: number) => {
  const n = value === null ? NaN : Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
};

function initialSettings(): WidgetSettings {
  const p = urlParams();
  return {
    ...defaultWidgetSettings,
    accent: validHex(p.get('accent')),
    glow: limit(p.get('glow'), 100, 0, 140),
    speed: limit(p.get('speed'), 1, .25, 2),
    reducedMotion: p.get('reduce') === '1' || matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
}

function fitStyles(w: number, h: number, scale: number) {
  return { width: w * scale, height: h * scale, '--scale': scale } as CSSProperties;
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    function measure(width: number, height: number) {
      setSize(prev => prev.width === width && prev.height === height ? prev : { width, height });
    }
    const padding = getComputedStyle(node);
    measure(node.clientWidth - parseFloat(padding.paddingLeft) - parseFloat(padding.paddingRight),
      node.clientHeight - parseFloat(padding.paddingTop) - parseFloat(padding.paddingBottom));
    const observer = new ResizeObserver(([{ contentRect }]) => measure(contentRect.width, contentRect.height));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}

function ToolButton({ label, children, onClick, pressed, disabled }: {
  label: string; children: ReactNode; onClick: () => void; pressed?: boolean; disabled?: boolean;
}) {
  return <button type="button" className="tool-button" title={label} aria-label={label}
    aria-pressed={pressed} disabled={disabled} onClick={onClick}>{children}</button>;
}

function Toggle({ title, on, change }: { title: string; on: boolean; change: (next: boolean) => void }) {
  return <button type="button" className="toggle-row" role="switch" aria-checked={on} onClick={() => change(!on)}>
    {title}<span className="switch-track" aria-hidden="true"><span /></span>
  </button>;
}

function TopBar({ view, choose, showExport }: { view: View; choose: (v: View) => void; showExport: () => void }) {
  return <header className="top-bar">
    <button type="button" className="wordmark" aria-label="Виджеты" onClick={() => choose('studio')}>
      <img src={`${import.meta.env.BASE_URL}redheadesign.svg`} width="34" height="34" alt="" />
      <span>Виджеты</span>
    </button>
    <nav className="top-navigation" aria-label="Режим работы">
      <button type="button" aria-pressed={view === 'studio'} onClick={() => choose('studio')}><SlidersHorizontal size={15} />Студия</button>
      <button type="button" aria-pressed={view === 'gallery'} onClick={() => choose('gallery')}><Grid2X2 size={15} />Галерея</button>
      <a href="?view=landing"><ArrowUpRight size={15} />Витрина</a>
    </nav>
    <div className="top-actions">
      <button type="button" className="button button-primary" aria-label="Экспорт" onClick={showExport}><ArrowDownToLine size={15} /><span>Экспорт</span></button>
    </div>
  </header>;
}

function Library({ id, select }: { id: string; select: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [closed, setClosed] = useState<string[]>([]);
  const q = query.trim().toLocaleLowerCase('ru');
  const matches = widgetCatalog.filter(item => `${item.title} ${slugLabels[item.id]}`.toLocaleLowerCase('ru').includes(q));
  return <aside className="library" aria-label="Библиотека">
    <div className="library-top">
      <div className="section-title"><h2>Библиотека</h2><span className="count">{widgetCatalog.length}</span></div>
      <label className="search-box"><Search size={15} aria-hidden="true" />
        <input value={query} type="search" placeholder="Найти виджет" aria-label="Найти виджет" onChange={e => setQuery(e.target.value)} />
      </label>
    </div>
    <div className="library-scroll">
      {categories.map(({ id: group, label, icon: Symbol }) => {
        const items = matches.filter(item => item.category === group);
        if (!items.length) return null;
        const open = q || !closed.includes(group);
        return <div className="library-group" key={group}>
          <button type="button" className="group-button" aria-expanded={Boolean(open)}
            onClick={() => setClosed(arr => arr.includes(group) ? arr.filter(g => g !== group) : [...arr, group])}>
            <Symbol size={14} aria-hidden="true" /><span>{label}</span>
            <ChevronDown size={13} className={open ? '' : 'is-folded'} aria-hidden="true" />
          </button>
          {open && items.map(item => <button type="button" className="library-item"
            key={item.id} aria-current={id === item.id ? 'true' : undefined} onClick={() => select(item.id)}>
            <span className="card-sample" style={{ '--sample': tones[item.tone] } as CSSProperties} aria-hidden="true" />
            <span className="library-item-title">{item.title}</span>
            <span className="library-size">{sizeNames[item.size]}</span>
          </button>)}
        </div>;
      })}
      {!matches.length && <p className="library-empty">Ничего не нашлось. Попробуйте другое название.</p>}
    </div>
    <div className="library-footer"><Layers3 size={14} aria-hidden="true" />{widgetCatalog.length} виджетов · 5 категорий</div>
  </aside>;
}

function Inspector({ item, settings, update, tone, changeTone, reset, target, download, reviewPhase, setReviewPhase, size, changeSize }: {
  item: WidgetDefinition; settings: WidgetSettings; update: (s: Partial<WidgetSettings>) => void;
  tone?: Tone; changeTone: (t?: Tone) => void; reset: () => void; target: Target; download: () => void;
  reviewPhase: number | null; setReviewPhase: (phase: number | null) => void;
  size: Size; changeSize: (size: Size) => void;
}) {
  return <aside className="inspector" aria-label="Настройки">
    <div className="section-title inspector-title"><h2>Настройки</h2><ToolButton label="Сбросить настройки" onClick={reset}><RotateCcw size={15} /></ToolButton></div>
    <section className="inspector-section">
      <h3><Sparkles size={15} />Оформление</h3>
      {target === 'web' && (
        <div className="size-field">
          <div className="inspector-row">Формат</div>
          <div className="segmented size-select" role="group" aria-label="Формат карточки">
            {sizes.map(option => (
              <button key={option} type="button" aria-pressed={size === option} onClick={() => changeSize(option)}>
                {sizeNames[option]}
              </button>
            ))}
          </div>
        </div>
      )}
      <label className="select-row">Палитра
        <select value={tone ?? ''} onChange={e => changeTone(validTone(e.target.value))}>
          <option value="">Как в карточке · {toneNames[item.tone]}</option>
          {(Object.keys(tones) as Tone[]).map(key => <option key={key} value={key}>{toneNames[key]}</option>)}
        </select>
      </label>
      <div className="inspector-row"><span>Цвет акцента</span><code>{settings.accent ?? presets[0]}</code></div>
      <div className="swatches" aria-label="Цвет акцента">
        {presets.map((color, index) => <button type="button" key={color} className="swatch"
          style={{ '--swatch': color } as CSSProperties} aria-pressed={(settings.accent ?? presets[0]) === color}
          aria-label={['Лаймовый', 'Сиреневый', 'Мятный', 'Розовый', 'Голубой'][index]}
          onClick={() => update({ accent: color })}>
          {(settings.accent ?? presets[0]) === color && <Check size={13} />}
        </button>)}
        <label className="custom-swatch" title="Выбрать свой цвет"><Plus size={15} /><input type="color"
          value={settings.accent ?? presets[0]} aria-label="Свой цвет" onChange={e => update({ accent: e.target.value })} /></label>
      </div>
      <label className="range-row">
        <span className="inspector-row"><span>Свечение</span><code>{settings.glow}%</code></span>
        <input type="range" min="0" max="140" step="1" value={settings.glow} onChange={e => update({ glow: +e.target.value })} />
      </label>
    </section>
    <section className="inspector-section">
      <h3><AudioLines size={15} />Анимация</h3>
      <div className="inspector-row"><span>Скорость</span><code>{numberFmt.format(settings.speed)}×</code></div>
      <div className="segmented speed-select" aria-label="Скорость анимации">
        {[.25, .5, 1, 2].map(speed => <button type="button" key={speed} aria-pressed={settings.speed === speed}
          onClick={() => update({ speed })}>{numberFmt.format(speed)}×</button>)}
      </div>
      <Toggle title="Меньше движения" on={settings.reducedMotion} change={reducedMotion => update({ reducedMotion })} />
      {target === 'web' && frameReviewIds.has(item.id) && !settings.reducedMotion && (
        <details className="frame-review">
          <summary>Разбор по кадрам</summary>
          <div className="frame-review-fields">
            <Toggle title="Остановить цикл" on={reviewPhase !== null}
              change={on => setReviewPhase(on ? 35 : null)} />
            <label className="range-row">
              <span className="inspector-row"><span>Кадр цикла</span><code>{reviewPhase ?? 0}%</code></span>
              <input type="range" min="0" max="99" value={reviewPhase ?? 0} disabled={reviewPhase === null}
                aria-valuetext={`${reviewPhase ?? 0}% цикла`} onChange={e => setReviewPhase(e.target.valueAsNumber)} />
            </label>
          </div>
        </details>
      )}
    </section>
    <section className="inspector-section component-info">
      <h3><Code2 size={15} />Компонент</h3>
      <div className="inspector-row"><span>Имя</span><code>{item.id}</code></div>
      {target === 'web' && <div className="inspector-row"><span>Размер</span><code>{dimensions[size].join(' × ')} px</code></div>}
      {target === 'telegram' && <button type="button" className="button full-width" onClick={download}><ArrowDownToLine size={14} />Скачать HTML</button>}
    </section>
  </aside>;
}

const telegramFitScript = `<style>:root{--tg-content-safe-area-inset-bottom:17px}</style><script>(()=>{const card=document.querySelector('main.card,.card');if(!card)return;const send=()=>parent.postMessage({type:'bloom:telegram-size',height:Math.ceil(card.getBoundingClientRect().height)},'*');addEventListener('message',event=>{if(event.source===parent&&event.data==='bloom:measure')send()});send();if(typeof ResizeObserver==='function')new ResizeObserver(send).observe(card)})();</script>`;
const telegramBubbleWidth = (availableWidth: number) => availableWidth ? Math.min(332, Math.floor(availableWidth - 22)) : 332;

function TelegramPreview({ html, title, availableWidth, availableHeight }: {
  html: string; title: string; availableWidth: number; availableHeight: number;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState<number>();
  const previewHtml = useMemo(() => html.replace(/<\/body>/i, telegramFitScript + '</body>'), [html]);

  useLayoutEffect(() => {
    function resize(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow || event.data?.type !== 'bloom:telegram-size') return;
      const h = event.data.height;
      if (typeof h === 'number' && Number.isFinite(h) && h >= 50 && h <= 600) setHeight(h);
    }
    window.addEventListener('message', resize);
    return () => window.removeEventListener('message', resize);
  }, []);

  const width = telegramBubbleWidth(availableWidth);
  const bubbleHeight = (height ?? 222) + 12;
  const scale = Math.min(1, availableHeight ? Math.max(1, availableHeight - 12) / bubbleHeight : 1);
  return (
    <div className="fit-box" style={fitStyles(width, bubbleHeight, scale)}>
      <div className="fit-child">
        <div className="telegram-stage" style={{ width }}>
          <iframe ref={frame} title={`${title} в Telegram`} sandbox="allow-scripts" srcDoc={previewHtml}
            style={{ height: height ?? 222 }} data-fitted={height !== undefined}
            onLoad={() => frame.current?.contentWindow?.postMessage('bloom:measure', '*')} />
          <span className="telegram-time" aria-hidden="true">14:32 <Check size={11} /></span>
        </div>
      </div>
    </div>
  );
}

function Stage({ item, id, settings, tone, target, setTarget, update, telegram, select, reviewPhase, size }: {
  item: WidgetDefinition; id: string; settings: WidgetSettings; tone?: Tone; target: Target;
  setTarget: (target: Target) => void; update: (s: Partial<WidgetSettings>) => void; telegram: string; select: (id: string) => void;
  reviewPhase: number | null; size: Size;
}) {
  const [background, setBackground] = useState<Background>('graphite');
  const [grid, setGrid] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [replay, setReplay] = useState(0);
  const [ref, { width: stageWidth, height: stageHeight }] = useWidth();
  useEffect(() => {
    if (reviewPhase === null) return;
    const scene = ref.current?.querySelector('.bw-frame');
    if (!scene) return;
    const raf = requestAnimationFrame(() => {
      for (const animation of scene.getAnimations({ subtree: true })) {
        if (!(animation instanceof CSSAnimation) || !['hw-water-drift', 'hw-ecg-sweep'].includes(animation.animationName)) continue;
        const duration = animation.effect?.getTiming().duration;
        if (typeof duration === 'number') animation.currentTime = duration * reviewPhase / 100;
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [id, ref, reviewPhase, settings.speed]);
  const category = categories.find(c => c.id === item.category)!;
  const [nominalWidth, h] = dimensions[size];
  const w = stageWidth ? Math.min(nominalWidth, Math.max(160, Math.floor(stageWidth - 28))) : nominalWidth;
  const maxScale = Math.min(1.5, stageWidth ? (stageWidth - 28) / w : 1.5, stageHeight ? Math.max(1, stageHeight - 12) / h : 1.5);
  const scale = Math.max(.3, Math.min(zoom, maxScale));
  const cleanPreview = (target === 'web' && scale !== zoom) ? `${Math.round(scale * 100)}%` : `${Math.round(zoom * 100)}%`;
  const Symbol = category.icon;
  return <main className="workspace-main">
    <div className="mobile-library"><label>Виджет
      <select value={id} onChange={e => select(e.target.value)}>
        {categories.map(c => <optgroup label={c.label} key={c.id}>
          {widgetCatalog.filter(x => x.category === c.id).map(x => <option key={x.id} value={x.id}>{x.title}</option>)}
        </optgroup>)}
      </select>
    </label></div>
    <div className="workspace-heading">
      <div className="breadcrumb"><Symbol size={14} aria-hidden="true" />{category.label}<ChevronRight size={13} aria-hidden="true" />Виджет</div>
      <h1>{item.title}</h1>
    </div>
    <div className="stage" data-background={background} data-grid={grid}>
      <div className="stage-top">
        <div className="segmented mode-switch" aria-label="Среда просмотра">
          <button type="button" aria-pressed={target === 'web'} onClick={() => setTarget('web')}>Веб</button>
          <button type="button" aria-pressed={target === 'telegram'} onClick={() => setTarget('telegram')}>Telegram</button>
        </div>
        <div className="stage-top-actions">
          <span className="stage-dimension">{target === 'web' ? `${w} × ${h}` : `${telegramBubbleWidth(stageWidth) - 12} px`}</span>
          <ToolButton label="Сетка" pressed={grid} onClick={() => setGrid(!grid)}><Grid3X3 size={16} /></ToolButton>
        </div>
      </div>
      <div className="stage-work" ref={ref}>
        {target === 'web' ? <div className="fit-box stage-box" style={fitStyles(w, h, scale)}>
          <div className="fit-child" style={{ width: w, height: h }} key={`${id}:${replay}`}>
            <BloomWidget id={id} settings={settings} tone={tone} size={size} fill />
          </div>
        </div> : <TelegramPreview key={`${id}:${replay}`} html={telegram} title={item.title}
          availableWidth={stageWidth} availableHeight={stageHeight} />}
      </div>
      <div className="stage-bottom">
        <div className="stage-control">
          {target === 'web' && <ToolButton label={settings.paused ? 'Возобновить анимацию' : 'Пауза анимации'}
            pressed={settings.paused} onClick={() => update({ paused: !settings.paused })}>{settings.paused ? <Play size={16} /> : <Pause size={16} />}</ToolButton>}
          <ToolButton label="Повторить с начала" onClick={() => { update({ paused: false }); setReplay(n => n + 1); }}><RotateCcw size={16} /></ToolButton>
        </div>
        <div className="stage-control stage-backgrounds" aria-label="Фон превью">
          {([['graphite', 'Графитовый'], ['ink', 'Чёрный'], ['paper', 'Светлый']] as const).map(([key, label]) =>
            <button type="button" key={key} aria-pressed={background === key} title={label} aria-label={label}
              onClick={() => setBackground(key)}><i data-tone={key} /></button>)}
        </div>
        {target === 'web' ? <div className="stage-control">
          <ToolButton label="Уменьшить" disabled={zoom <= .5} onClick={() => setZoom(n => Math.max(.5, n - .25))}><Minus size={15} /></ToolButton>
          <button type="button" className="zoom-readout" title="Масштаб 100%" onClick={() => setZoom(1)}>{cleanPreview}</button>
          <ToolButton label="Увеличить" disabled={zoom >= 1.5 || scale >= maxScale}
            onClick={() => setZoom(n => Math.min(1.5, n + .25))}><Plus size={15} /></ToolButton>
        </div> : <span className="stage-spacer" />}
      </div>
    </div>
  </main>;
}

function Gallery({ edit }: { edit: (id: string) => void }) {
  const [filter, setFilter] = useState<Category | 'all'>('all');
  const entries = filter === 'all' ? categories : categories.filter(c => c.id === filter);
  return <main className="gallery">
    <div className="gallery-intro">
      <h1>Галерея</h1>
      <div className="segmented gallery-filters" aria-label="Категория">
        <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>Все</button>
        {categories.map(c => <button type="button" key={c.id} aria-pressed={filter === c.id} onClick={() => setFilter(c.id)}>{c.label}</button>)}
      </div>
    </div>
    {entries.map(c => <section className="gallery-section" key={c.id}>
      <h2><c.icon size={18} />{c.label}</h2>
      <div className="gallery-grid" data-editable="true">
        {widgetCatalog.filter(item => item.category === c.id).map(item => <article className="gallery-tile"
          data-size={item.size} key={item.id}>
          <BloomWidget id={item.id} fill />
          <button type="button" className="gallery-tile-link" onClick={() => edit(item.id)} aria-label={`Открыть ${item.title} в студии`}>
            {item.title}<ArrowUpRight size={14} />
          </button>
        </article>)}
      </div>
    </section>)}
  </main>;
}

function ExportDialog({ id, settings, tone, download, telegram, layoutSize }: {
  id: string; settings: WidgetSettings; tone?: Tone; download: () => void; telegram: string; layoutSize: Size;
}) {
  const [copied, setCopied] = useState<'url' | 'code' | 'html' | 'error' | ''>('');
  const size = new TextEncoder().encode(telegram).byteLength;
  const url = new URL(window.location.pathname, window.location.origin);
  url.searchParams.set('embed', id);
  if (layoutSize !== widgetsById[id].size) url.searchParams.set('size', sizeParams[layoutSize]);
  if (settings.accent) url.searchParams.set('accent', settings.accent);
  if (tone) url.searchParams.set('tone', tone);
  if (settings.glow !== 100) url.searchParams.set('glow', String(settings.glow));
  if (settings.speed !== 1) url.searchParams.set('speed', String(settings.speed));
  if (settings.reducedMotion) url.searchParams.set('reduce', '1');
  const [w, h] = dimensions[layoutSize];
  const code = `<iframe src="${url.toString().replaceAll('&', '&amp;')}" title="${widgetsById[id].title}" width="${w}" height="${h}" style="display:block;width:100%;height:var(--bloom-height,${h}px);border:0" loading="lazy"></iframe>`;
  async function copy(value: string, kind: 'url' | 'code' | 'html') {
    try { await navigator.clipboard.writeText(value); setCopied(kind); }
    catch { setCopied('error'); }
  }
  return <>
    <section className="export-section">
      <h3><ArrowDownToLine size={16} />Сообщение в Telegram</h3>
      <p>Один HTML-файл для метода <code>sendWidget</code>. Внешние файлы не нужны.</p>
      <div className="export-actions">
        <button type="button" className="button button-primary" onClick={download}><ArrowDownToLine size={15} />Скачать HTML</button>
        <button type="button" className="button" onClick={() => void copy(telegram, 'html')}><Copy size={15} />Скопировать HTML</button>
      </div>
      <small>{numberFmt.format(size)} байт до сжатия · <a href="https://core.telegram.org/bots/widgets" target="_blank" rel="noreferrer">Документация Telegram <ArrowUpRight size={12} /></a></small>
    </section>
    <section className="export-section">
      <h3><Code2 size={16} />Виджет для сайта</h3>
      <p>Замените localhost на адрес сборки. В сетке задайте высоту iframe через <code>--bloom-height</code>.</p>
      <textarea className="embed-code" aria-label="Код для вставки" readOnly value={code} onFocus={e => e.target.select()} />
      <div className="export-actions">
        <button type="button" className="button" onClick={() => void copy(code, 'code')}><Copy size={15} />Скопировать iframe</button>
        <button type="button" className="button" onClick={() => void copy(url.href, 'url')}><Link size={15} />Скопировать ссылку</button>
        <a className="button" href={url.href} target="_blank" rel="noreferrer"><ArrowUpRight size={15} />Открыть</a>
      </div>
    </section>
    <div role="status" className="export-feedback">
      {copied === 'error' ? 'Не удалось скопировать. Выделите код вручную.' : copied ? 'Скопировано' : ''}
    </div>
  </>;
}

export function App() {
  const [view, setView] = useState<View>(() => urlParams().get('view') === 'gallery' ? 'gallery' : 'studio');
  const [id, setId] = useState(() => knownWidget(urlParams().get('widget')));
  const [settings, setSettings] = useState(initialSettings);
  const [tone, setTone] = useState<Tone | undefined>(() => validTone(urlParams().get('tone')));
  const [sizeOverride, setSizeOverride] = useState(() => readSize(urlParams().get('size')));
  const [target, setTarget] = useState<Target>(() => urlParams().get('target') === 'telegram' ? 'telegram' : 'web');
  const [frameReview, setFrameReview] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const item = widgetsById[id];
  const size = sizeOverride ?? item.size;
  const embed = urlParams().get('embed');
  const telegram = useMemo(() => embed !== null ? '' : buildTelegramHtml(id, {
    accent: settings.accent, tint: tone ? tones[tone] : undefined,
    glow: settings.glow / 100, speed: settings.speed, reducedMotion: settings.reducedMotion,
  }), [embed, id, tone, settings.accent, settings.glow, settings.speed, settings.reducedMotion]);
  useEffect(() => {
    if (embed !== null) return;
    const next = new URL(window.location.href);
    if (view === 'gallery' || /^\/widgets\/?$/.test(next.pathname)) next.searchParams.set('view', view); else next.searchParams.delete('view');
    next.searchParams.set('widget', id);
    if (sizeOverride) next.searchParams.set('size', sizeParams[sizeOverride]); else next.searchParams.delete('size');
    if (target === 'telegram') next.searchParams.set('target', target); else next.searchParams.delete('target');
    if (settings.accent) next.searchParams.set('accent', settings.accent); else next.searchParams.delete('accent');
    if (tone) next.searchParams.set('tone', tone); else next.searchParams.delete('tone');
    if (settings.glow !== 100) next.searchParams.set('glow', String(settings.glow)); else next.searchParams.delete('glow');
    if (settings.speed !== 1) next.searchParams.set('speed', String(settings.speed)); else next.searchParams.delete('speed');
    if (settings.reducedMotion) next.searchParams.set('reduce', '1'); else next.searchParams.delete('reduce');
    window.history.replaceState(null, '', next);
  }, [id, view, target, embed, tone, sizeOverride, settings.accent, settings.glow, settings.speed, settings.reducedMotion]);
  if (embed !== null) {
    const fill = window.self !== window.top || urlParams().get('fit') === 'container';
    return <main className="embed-view" data-fill={fill}>
      <BloomWidget id={knownWidget(embed)} settings={settings} tone={tone} size={sizeOverride} fill={fill} />
    </main>;
  }
  const update = (next: Partial<WidgetSettings>) => {
    if (next.paused === false || next.reducedMotion) setFrameReview(null);
    setSettings(current => ({ ...current, ...next }));
  };
  const reviewPhase = target === 'web' && frameReviewIds.has(id) && !settings.reducedMotion ? frameReview : null;
  const previewSettings = reviewPhase === null ? settings : { ...settings, paused: true };
  const chooseWidget = (widget: string) => {
    if (widget !== id) setSizeOverride(undefined);
    setId(widget);
    setFrameReview(null);
  };
  const chooseTarget = (value: Target) => { setTarget(value); setFrameReview(null); };
  function download() {
    const url = URL.createObjectURL(new Blob([telegram], { type: 'text/html;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `bloom-${id}.html`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="app-shell" data-view={view}>
    <TopBar view={view} choose={setView} showExport={() => dialog.current?.showModal()} />
    {view === 'studio' ? <div className="studio-layout">
      <Library id={id} select={chooseWidget} />
      <Stage item={item} id={id} settings={previewSettings} tone={tone} target={target} setTarget={chooseTarget} update={update}
        telegram={telegram} select={chooseWidget} reviewPhase={reviewPhase} size={size} />
      <Inspector item={item} settings={settings} update={update} tone={tone} changeTone={setTone} target={target} download={download}
        reviewPhase={reviewPhase} setReviewPhase={setFrameReview} size={size}
        changeSize={value => setSizeOverride(value === item.size ? undefined : value)}
        reset={() => { setSettings({ ...defaultWidgetSettings, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches }); setTone(undefined); setFrameReview(null); setSizeOverride(undefined); }} />
    </div> : <Gallery edit={widget => { chooseWidget(widget); setView('studio'); }} />}
    <dialog className="export-dialog" ref={dialog} aria-labelledby="export-title" onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }}>
      <div className="export-inner">
        <div className="section-title"><h2 id="export-title">Экспорт · {item.title}</h2><ToolButton label="Закрыть" onClick={() => dialog.current?.close()}><X size={18} /></ToolButton></div>
        <ExportDialog key={id} id={id} settings={settings} tone={tone} download={download} telegram={telegram} layoutSize={size} />
      </div>
    </dialog>
  </div>;
}
