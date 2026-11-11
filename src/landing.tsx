import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { flushSync } from 'react-dom';
import { ChartNoAxesCombined, Github, Grid2X2, HeartPulse, House, Layers3, Moon, Send, Star, Sun, type LucideIcon } from 'lucide-react';
import { BloomWidget, tones, widgetCatalog, type Category, type Tone } from './widgets';
import { packBento, randomFrom, shuffle, type TileFit } from './bento-layout';
import './landing.css';

const repository = 'redheadesign/widgets';
const telegram = 'https://t.me/redheadesign';
const themeKey = 'redheadesign:theme';
const gap = 12;
const filters: { id: 'all' | Category; label: string; icon: LucideIcon }[] = [
  { id: 'all', label: 'Все', icon: Grid2X2 },
  { id: 'analytics', label: 'Аналитика', icon: ChartNoAxesCombined },
  { id: 'health', label: 'Здоровье', icon: HeartPulse },
  { id: 'weather', label: 'Погода', icon: Sun },
  { id: 'home', label: 'Дом', icon: House },
  { id: 'everyday', label: 'На каждый день', icon: Layers3 },
];
const palette = (Object.keys(tones) as Tone[]).filter(tone => tone !== 'amber' && tone !== 'olive');
const accents = ['#bfe4ee', '#d7caff', '#85f2dd', '#ffaac6', '#a6caff', '#ffd5e9', '#f3f3fd', '#ffa18a', '#a8f1a0', '#84dfff'];
type Theme = 'light' | 'dark';
const wideWidgets = new Set(['music', 'glucose', 'funnel']);
const portraitWidgets = new Set(['hydration', 'breathing', 'lock', 'lights', 'clock', 'weather', 'thermostat']);
const preferredFit = (id: string): TileFit | undefined => {
  if (id === 'timer') return 'short';
  if (wideWidgets.has(id)) return 'wide';
  if (portraitWidgets.has(id)) return 'portrait';
  return undefined;
};

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(themeKey);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // The landing also works in an iframe that restricts storage.
  }
  return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function ThemeSwitch({ theme, change }: { theme: Theme; change: (theme: Theme) => void }) {
  const changing = useRef(false);
  async function toggle(button: HTMLButtonElement) {
    if (changing.current) return;
    const next = theme === 'dark' ? 'light' : 'dark';
    if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      change(next);
      return;
    }
    changing.current = true;
    const bounds = button.getBoundingClientRect();
    const x = bounds.left + bounds.width / 2;
    const y = bounds.top + bounds.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const transition = document.startViewTransition(() => flushSync(() => change(next)));
    try {
      await transition.ready;
      document.documentElement.animate({
        clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`],
      }, { duration: 720, easing: 'cubic-bezier(.22,1,.36,1)', pseudoElement: '::view-transition-new(root)' });
      await transition.finished;
    } catch {
      // A hidden document can skip the ripple while still changing theme.
    } finally {
      changing.current = false;
    }
  }
  return (
    <button className="bento-link bento-theme" type="button" role="switch" aria-checked={theme === 'dark'}
      aria-label="Тёмная тема" onClick={event => void toggle(event.currentTarget)}>
      {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  );
}

function GitHubLink() {
  const [stars, setStars] = useState<number>();
  useEffect(() => {
    const controller = new AbortController();
    fetch(`https://api.github.com/repos/${repository}`, { signal: controller.signal })
      .then(response => response.ok ? response.json() : undefined)
      .then(data => { if (Number.isInteger(data?.stargazers_count)) setStars(data.stargazers_count); })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return (
    <a className="bento-link" href={`https://github.com/${repository}`} target="_blank" rel="noreferrer"
      aria-label={stars === undefined ? 'Виджеты на GitHub' : `Виджеты на GitHub, звёзд: ${stars}`}>
      <Github size={17} aria-hidden="true" />
      {stars !== undefined && <span className="bento-stars"><Star size={12} aria-hidden="true" />{new Intl.NumberFormat('ru-RU').format(stars)}</span>}
    </a>
  );
}

export function BentoLanding() {
  const [seed] = useState(() => crypto.getRandomValues(new Uint32Array(1))[0]);
  const [theme, setTheme] = useState(initialTheme);
  const [filter, setFilter] = useState<'all' | Category>('all');
  const [columnLimit, setColumnLimit] = useState(1);
  const grid = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const node = grid.current!;
    function measure() {
      setColumnLimit(Math.min(5, Math.max(1, Math.floor((node.clientWidth + gap) / (160 + gap)))));
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(themeKey, theme);
    } catch { /* Storage can be unavailable in an embedded document. */ }
  }, [theme]);

  const deck = useMemo(() => {
    const random = randomFrom(seed);
    const backgrounds = shuffle(palette, random);
    const highlights = shuffle(accents, random);
    return shuffle(widgetCatalog, random).map((widget, index) => ({
      widget, tone: backgrounds[index % backgrounds.length],
      settings: { accent: highlights[index % highlights.length] },
    }));
  }, [seed]);
  const cards = useMemo(() => deck.filter(card => filter === 'all' || card.widget.category === filter), [deck, filter]);
  const columns = Math.min(columnLimit, cards.length);
  const placements = useMemo(() => {
    const tiles = packBento(cards.length, columns, seed ^ columns, {
      wide: cards.filter(card => preferredFit(card.widget.id) === 'wide').length,
      short: cards.some(card => preferredFit(card.widget.id) === 'short'),
      portrait: cards.filter(card => preferredFit(card.widget.id) === 'portrait').length,
    });
    const waiting = [...cards];
    const reserved = new Map<number, typeof cards[number]>();
    tiles.forEach((tile, index) => {
      if (!tile.fit) return;
      const match = waiting.findIndex(card => preferredFit(card.widget.id) === tile.fit);
      if (match !== -1) reserved.set(index, waiting.splice(match, 1)[0]);
    });
    return tiles.map((tile, index) => ({ tile, ...(reserved.get(index) ?? waiting.shift()!) }));
  }, [cards, columns, seed]);

  return (
    <div className="bento-page" data-theme={theme}>
      <header className="bento-header">
        <a className="bento-brand" href={window.location.href} aria-label="Виджеты, новая раскладка">
          <img src={`${import.meta.env.BASE_URL}redheadesign.svg`} alt="" width="30" height="30" />
          <span>Виджеты</span>
        </a>
        <nav className="bento-nav" aria-label="Категории виджетов">
          {filters.map(({ id, label, icon: Icon }) => (
            <button type="button" key={id} aria-label={label} title={label} aria-pressed={filter === id} onClick={() => setFilter(id)}>
              <Icon size={18} aria-hidden="true" /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="bento-actions">
          <GitHubLink />
          <a className="bento-link" href={telegram} target="_blank" rel="noreferrer" aria-label="Telegram Redheadesign">
            <Send size={17} aria-hidden="true" />
          </a>
          <ThemeSwitch theme={theme} change={setTheme} />
        </div>
      </header>
      <main className="bento-grid" ref={grid} aria-label="Виджеты"
        style={{ '--bento-columns': columns, '--bento-gap': `${gap}px` } as CSSProperties}>
        {placements.map(({ widget, tone, settings, tile }) => {
          return (
            <div className="bento-tile" key={widget.id} style={{
              gridColumn: `${tile.column + 1} / span ${tile.width}`,
              gridRow: `${tile.row + 1} / span ${tile.height}`,
            }}>
              <BloomWidget id={widget.id} tone={tone} settings={settings} fill />
            </div>
          );
        })}
      </main>
    </div>
  );
}
