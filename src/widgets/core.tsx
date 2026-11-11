import { createContext, useContext, useEffect, useRef, useState, type ComponentType, type CSSProperties, type ReactNode } from 'react';
import { MotionConfig } from 'motion/react';
import { referenceSurface } from './lighting';
import {
  Activity, AirVent, ArrowDown, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight,
  AudioLines, BatteryCharging, Calendar, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight,
  CircleHelp, Clock, Cloud, CloudRain, CloudSun, Compass, Droplet, Droplets, Fan, Filter,
  Flower2, Footprints, Gauge, Globe, Goal, Grid3X3, Heart, HeartPulse, Info, Leaf, Lightbulb,
  ListChecks, Lock, LockOpen, MapPin, Minus, Moon, Music2, Pause, Play, Plus,
  RotateCcw, SkipBack, SkipForward, Sparkles, Sun, Sunrise, Sunset, Target,
  Thermometer, Timer, TrendingDown, TrendingUp, Users, Waves, Wind, Zap, type LucideIcon,
} from 'lucide-react';

export type Category = 'health' | 'weather' | 'analytics' | 'home' | 'everyday';
export type Size = 'small' | 'wide' | 'large';
export type Tone = keyof typeof tones;
export type WidgetDefinition = {
  id: string;
  title: string;
  category: Category;
  size: Size;
  tone: Tone;
  interaction: string;
  Component: ComponentType;
};

export const tones = {
  red: '#a42825', graphite: '#45464d', pink: '#9d286e', rose: '#9d244c',
  blue: '#235d9c', indigo: '#3539b1', violet: '#672ca6', olive: '#777820',
  ember: '#a4381c', amber: '#9a611b', green: '#17806a', cyan: '#187e9b',
  teal: '#236e61', plum: '#996264',
  azure: '#285ebc', cobalt: '#4231bf', mint: '#178951', orchid: '#9527ac',
  coral: '#c44a3d', smoke: '#55555c', slate: '#3d4853',
} as const;

const toneSurfaces: Record<Tone, string> = {
  red: 'heart-rate', graphite: 'clock', pink: 'lung-capacity', rose: 'breathing',
  blue: 'hydration', indigo: 'sleep', violet: 'revenue', olive: 'air-quality',
  ember: 'uv-index', amber: 'sun', green: 'thermostat', cyan: 'thermostat', teal: 'wind', plum: 'glucose',
  azure: 'thermostat', cobalt: 'thermostat', mint: 'thermostat', orchid: 'revenue', coral: 'uv-index', smoke: 'lock', slate: 'weather-tokyo',
};
const toneSurfaceFilters: Partial<Record<Tone, string>> = {
  cyan: 'hue-rotate(42deg)', azure: 'hue-rotate(78deg)', cobalt: 'hue-rotate(113deg)',
  mint: 'hue-rotate(-35deg)', orchid: 'hue-rotate(30deg)', coral: 'hue-rotate(-16deg)',
  smoke: 'saturate(.12)', slate: 'saturate(.22) brightness(.86)',
};

export const dimensions: Record<Size, [number, number]> = { small: [176, 176], wide: [368, 176], large: [368, 368] };

export type WidgetLayout = {
  size?: Size;
  fill?: boolean;
  style?: CSSProperties;
};

export type WidgetSettings = {
  paused: boolean;
  speed: number;
  reducedMotion: boolean;
  glow: number;
  accent?: string;
};

export const defaultWidgetSettings: WidgetSettings = {
  paused: false, speed: 1, reducedMotion: false, glow: 100,
};

const SettingsContext = createContext(defaultWidgetSettings);
export const useWidgetSettings = () => useContext(SettingsContext);

export function usePulse(intervalMs: number, active = true) {
  const { paused, speed } = useWidgetSettings();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active || paused) return;
    const timer = window.setInterval(() => setTick(n => n + 1), Math.max(16, intervalMs / speed));
    return () => window.clearInterval(timer);
  }, [active, paused, speed, intervalMs]);
  return tick;
}

const icons: Record<string, LucideIcon> = {
  activity: Activity, 'air-vent': AirVent, 'arrow-down': ArrowDown, 'arrow-down-right': ArrowDownRight,
  'arrow-left': ArrowLeft, 'arrow-right': ArrowRight, 'arrow-up': ArrowUp, 'arrow-up-right': ArrowUpRight,
  'audio-lines': AudioLines, 'battery-charging': BatteryCharging, calendar: Calendar,
  'calendar-days': CalendarDays, check: Check, 'chevron-down': ChevronDown, 'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight, 'circle-help': CircleHelp, clock: Clock, cloud: Cloud, 'cloud-rain': CloudRain,
  'cloud-sun': CloudSun, compass: Compass, droplet: Droplet, droplets: Droplets, fan: Fan, filter: Filter,
  'flower-2': Flower2, footprints: Footprints, gauge: Gauge, globe: Globe, goal: Goal, 'grid-3x3': Grid3X3, 'grid-3-x-3': Grid3X3,
  heart: Heart, 'heart-pulse': HeartPulse, info: Info, leaf: Leaf, lightbulb: Lightbulb, 'list-checks': ListChecks,
  lock: Lock, 'lock-open': LockOpen, 'map-pin': MapPin, minus: Minus, moon: Moon, music: Music2, 'music-2': Music2,
  pause: Pause, play: Play, plus: Plus, 'rotate-ccw': RotateCcw, 'skip-back': SkipBack,
  'skip-forward': SkipForward, sparkles: Sparkles, sun: Sun, sunrise: Sunrise, sunset: Sunset,
  target: Target, thermometer: Thermometer, timer: Timer, 'trending-down': TrendingDown,
  'trending-up': TrendingUp, users: Users, waves: Waves, wind: Wind, zap: Zap,
};

export function Icon({ name, size = 14 }: { name: string; size?: number }) {
  const Symbol = icons[name] || Activity;
  return <Symbol aria-hidden="true" size={size} strokeWidth={1.65} />;
}

export function WidgetCard({ title, icon, aside, children, className = '' }: {
  title: ReactNode; icon?: string; aside?: ReactNode; children?: ReactNode; className?: string;
}) {
  return (
    <section className={`bw-card ${className}`}>
      <header className="bw-header">
        <div className="bw-label">{icon ? <Icon name={icon} /> : null}<span>{title}</span></div>
        {aside != null ? <div className="bw-aside">{aside}</div> : null}
      </header>
      <div className="bw-body">{children}</div>
    </section>
  );
}

const glyphs: Record<string, string> = {
  '0': '01110/10001/10011/10101/11001/10001/01110',
  '1': '00100/01100/00100/00100/00100/00100/01110',
  '2': '01110/10001/00001/00010/00100/01000/11111',
  '3': '01110/10001/00001/00110/00001/10001/01110',
  '4': '00010/00110/01010/10010/11111/00010/00010',
  '5': '11111/10000/11110/00001/00001/10001/01110',
  '6': '00110/01000/10000/11110/10001/10001/01110',
  '7': '11111/00001/00010/00100/01000/01000/01000',
  '8': '01110/10001/10001/01110/10001/10001/01110',
  '9': '01110/10001/10001/01111/00001/00010/01100',
  ':': '0/1/1/0/1/1/0', '.': '0/0/0/0/0/0/1', ',': '00/00/00/00/00/01/10',
  '–': '000/000/000/111/000/000/000', '-': '000/000/000/111/000/000/000',
  '%': '11001/11010/00100/00100/01011/10011/00000',
  '°': '11/11/00/00/00/00/00', '+': '000/010/010/111/010/010/000',
  ' ': '00/00/00/00/00/00/00',
};

export function DotNumber({ value, size = 38, label }: { value: string | number; size?: number; label?: string }) {
  const str = String(value);
  const dots: ReactNode[] = [];
  let width = 0;
  for (const char of str) {
    const rows = (glyphs[char] || glyphs['–']).split('/');
    rows.forEach((row, y) => [...row].forEach((on, x) => {
      dots.push(<circle key={`${width + x}-${y}`} cx={width + x + .5} cy={y + .5} r={on === '1' ? .315 : .22} opacity={on === '1' ? 1 : .055} />);
    }));
    width += rows[0].length + 1;
  }
  const drawnWidth = Math.max(1, width - 1);
  return (
    <svg className="bw-dot-number" width={drawnWidth * size / 7} height={size} viewBox={`0 0 ${drawnWidth} 7`}
      role="img" aria-label={label ?? str} fill="currentColor">
      {dots}
    </svg>
  );
}

const pressableSelector = 'button:not(:disabled), [role="button"], [role="checkbox"], [role="switch"]';

function showPress(layer: HTMLDivElement, target: EventTarget | null, speed: number, point?: [number, number]) {
  if (!(target instanceof Element)) return;
  const button = target.closest<HTMLElement>(pressableSelector);
  if (!button || button.closest('[data-bw-feedback="none"]') || button.getAttribute('aria-disabled') === 'true') return;

  const surface = layer.getBoundingClientRect();
  const rect = button.getBoundingClientRect();
  const scale = surface.width / layer.clientWidth;
  if (!scale || !rect.width || !rect.height) return;
  const w = rect.width / scale;
  const h = rect.height / scale;
  // Plot-sized hit zones already draw their own selection marker.
  if (h > 82 || w > 285) return;
  const x = point ? (point[0] - rect.left) / scale : w / 2;
  const y = point ? (point[1] - rect.top) / scale : h / 2;
  const reach = Math.hypot(Math.max(x, w - x), Math.max(y, h - y));
  const style = getComputedStyle(button);
  const rgb = style.backgroundColor.match(/[\d.]+/g)?.map(Number);
  const bright = !!rgb && (rgb[3] ?? 1) > .5 && (rgb[0] * .213 + rgb[1] * .715 + rgb[2] * .072) > 165;
  const viewport = document.createElement('span');
  viewport.className = 'bw-press-clip';
  viewport.dataset.ink = String(bright);
  Object.assign(viewport.style, {
    width: `${w}px`, height: `${h}px`, left: `${(rect.left - surface.left) / scale}px`,
    top: `${(rect.top - surface.top) / scale}px`, borderRadius: style.borderRadius,
  });
  const ripple = document.createElement('span');
  ripple.className = 'bw-press-ripple';
  Object.assign(ripple.style, {
    width: `${reach * 2}px`, height: `${reach * 2}px`, left: `${x - reach}px`, top: `${y - reach}px`,
  });
  viewport.append(ripple);
  layer.append(viewport);
  const wave = ripple.animate([
    { opacity: .85, transform: 'scale(.12)' },
    { opacity: .42, transform: 'scale(.62)', offset: .35 },
    { opacity: 0, transform: 'scale(1)' },
  ], { duration: 420 / speed, easing: 'cubic-bezier(.2,.68,.28,1)' });
  wave.finished.then(() => viewport.remove(), () => viewport.remove());
}

export function WidgetFrame({ definition, settings, tone, children, size = definition.size, fill = false, style }: WidgetLayout & {
  definition: WidgetDefinition; settings?: Partial<WidgetSettings>; tone?: Tone; children?: ReactNode;
}) {
  const palette = tone ?? definition.tone;
  const [width, height] = dimensions[size];
  const opts = { ...defaultWidgetSettings, ...settings };
  const filters = [tone ? toneSurfaceFilters[tone] : undefined, opts.glow > 100 ? `brightness(${opts.glow / 100})` : undefined];
  const feedback = useRef<HTMLDivElement>(null);
  const frameStyle = {
    ...style,
    '--bw-width': `${width}px`, '--bw-height': `${height}px`,
    '--bw-tint': tones[palette], '--bw-accent': opts.accent || '#e4f765',
    '--bw-glow': opts.glow / 100, '--bw-speed': opts.speed,
    '--bw-light-filter': filters.filter(Boolean).join(' ') || 'none',
    '--bw-surface': referenceSurface(tone ? toneSurfaces[tone] : definition.id),
  } as CSSProperties;
  const Component = definition.Component;
  function press(target: EventTarget | null, point?: [number, number]) {
    const layer = feedback.current;
    if (!layer || opts.paused || opts.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    showPress(layer, target, Math.max(.25, opts.speed), point);
  }
  return (
    <SettingsContext.Provider value={opts}>
      <MotionConfig reducedMotion={opts.reducedMotion ? 'always' : 'user'}>
        <div className="bw-frame" style={frameStyle} data-size={size} data-fill={fill} data-widget={definition.id}
          data-paused={opts.paused} data-reduced={opts.reducedMotion} data-custom-tone={tone !== undefined}
          onPointerDownCapture={event => {
            if (!event.isPrimary || event.button !== 0) return;
            if (event.target instanceof Element && event.target.closest('button, input, [tabindex]')) {
              event.currentTarget.dataset.pointer = '';
            }
            press(event.target, [event.clientX, event.clientY]);
          }}
          onKeyDownCapture={event => { delete event.currentTarget.dataset.pointer; }}
          onBlurCapture={event => {
            if (!event.currentTarget.contains(event.relatedTarget)) delete event.currentTarget.dataset.pointer;
          }}
          onClickCapture={event => {
            if (event.detail === 0) press(event.target);
          }}>
          {children ?? <Component />}
          <div className="bw-press-layer" ref={feedback} aria-hidden="true" />
        </div>
      </MotionConfig>
    </SettingsContext.Provider>
  );
}
