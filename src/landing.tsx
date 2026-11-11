import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ChartNoAxesCombined, Github, Grid2X2, HeartPulse, House, Layers3, Send, Star, Sun, type LucideIcon } from 'lucide-react';
import { BloomWidget, tones, widgetCatalog, type Category, type Tone } from './widgets';
import { packBento, randomFrom, shuffle, type TileFit } from './bento-layout';
import './landing.css';

const repository = 'redheadesign/widgets';
const telegram = 'https://t.me/redheadesign';
const gap = 16;
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
const wideWidgets = new Set(['music', 'glucose', 'funnel']);
const portraitWidgets = new Set(['hydration', 'breathing', 'lock', 'lights', 'clock', 'weather', 'thermostat']);
const preferredFit = (id: string): TileFit | undefined => {
  if (id === 'timer') return 'short';
  if (wideWidgets.has(id)) return 'wide';
  if (portraitWidgets.has(id)) return 'portrait';
  return undefined;
};

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
  const [filter, setFilter] = useState<'all' | Category>('all');
  const [columnLimit, setColumnLimit] = useState(1);
  const stage = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const node = stage.current!;
    function measure() {
      setColumnLimit(Math.min(5, Math.max(1, Math.floor((node.clientWidth + gap) / (160 + gap)))));
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const deck = useMemo(() => {
    const random = randomFrom(seed);
    const backgrounds = shuffle(palette, random);
    const highlights = shuffle(accents, random);
    return shuffle(widgetCatalog, random).map((widget, index) => ({
      widget, tone: widget.id === 'hydration' ? undefined : backgrounds[index % backgrounds.length],
      settings: { accent: widget.id === 'hydration' ? '#a8c8f2' : highlights[index % highlights.length] },
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
    <div className="bento-page">
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
        </div>
      </header>
      <main className="bento-stage" ref={stage} aria-label="Виджеты">
        <div className="bento-grid" style={{ '--bento-columns': columns, '--bento-gap': `${gap}px` } as CSSProperties}>
          {placements.map(({ widget, tone, settings, tile }) => (
            <div className="bento-tile" key={widget.id} style={{
              gridColumn: `${tile.column + 1} / span ${tile.width}`,
              gridRow: `${tile.row + 1} / span ${tile.height}`,
            }}>
              <BloomWidget id={widget.id} tone={tone} settings={settings} fill />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
