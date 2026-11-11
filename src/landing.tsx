import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { flushSync } from 'react-dom';
import { Github, Moon, Send, Star, Sun } from 'lucide-react';
import { BloomWidget, widgetCatalog, type Category, type Tone } from './widgets';
import { packBento, randomFrom, shuffle } from './bento-layout';
import './landing.css';

const repository = 'redheadesign/widgets';
const telegram = 'https://t.me/redheadesign';
const themeKey = 'redheadesign:theme';
const gap = 12;
const filters: { id: 'all' | Category; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'analytics', label: 'Аналитика' },
  { id: 'health', label: 'Здоровье' },
  { id: 'weather', label: 'Погода' },
  { id: 'home', label: 'Дом' },
  { id: 'everyday', label: 'На каждый день' },
];
const palette: Tone[] = ['red', 'graphite', 'pink', 'rose', 'blue', 'indigo', 'violet', 'olive', 'ember', 'amber', 'green', 'teal', 'plum'];
const accents = ['#e4f765', '#d7caff', '#85f2dd', '#ffaac6', '#a6caff', '#ffd393'];
type Theme = 'light' | 'dark';

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
    <button className="bento-theme" type="button" role="switch" aria-checked={theme === 'dark'}
      aria-label="Тёмная тема" onClick={event => void toggle(event.currentTarget)}>
      <Moon size={13} aria-hidden="true" /><Sun size={13} aria-hidden="true" />
      <span className="bento-theme-thumb" aria-hidden="true" />
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
      setColumnLimit(Math.max(1, Math.floor((node.clientWidth + gap) / (160 + gap))));
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
    return shuffle(widgetCatalog, random).map(widget => ({
      widget, tone: palette[Math.floor(random() * palette.length)],
      settings: { accent: accents[Math.floor(random() * accents.length)] },
    }));
  }, [seed]);
  const cards = useMemo(() => deck.filter(card => filter === 'all' || card.widget.category === filter), [deck, filter]);
  const columns = Math.min(columnLimit, cards.length);
  const tiles = useMemo(() => packBento(cards.length, columns, seed ^ columns), [cards.length, columns, seed]);

  return (
    <div className="bento-page" data-theme={theme}>
      <header className="bento-header">
        <a className="bento-brand" href={window.location.href} aria-label="Виджеты, новая раскладка">
          <img src={`${import.meta.env.BASE_URL}redheadesign.svg`} alt="" width="24" height="24" />
          <span>Виджеты</span>
        </a>
        <nav className="bento-nav" aria-label="Категории виджетов">
          {filters.map(({ id, label }) => (
            <button type="button" key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>
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
        {cards.map(({ widget, tone, settings }, index) => {
          const tile = tiles[index];
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
