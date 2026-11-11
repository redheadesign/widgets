import { useEffect, useId, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { DotNumber, Icon, usePulse, useWidgetSettings, WidgetCard } from './core';
import type { WidgetDefinition } from './core.js';
import { referenceSurface } from './lighting';
import './health-weather.css';

function Circle({ icon, label, onClick, light = false, pressed, disabled = false, filledIcon = false }: {
  icon: string;
  label: string;
  onClick: () => void;
  light?: boolean;
  pressed?: boolean;
  disabled?: boolean;
  filledIcon?: boolean;
}) {
  return <button type="button" className={`bw-circle hw-circle${light ? ' hw-circle--light' : ''}`} aria-label={label} aria-pressed={pressed} disabled={disabled} onClick={onClick}><Icon name={icon} size={15} fill={filledIcon ? 'currentColor' : undefined} /></button>;
}

function Action({ children, icon, onClick, pressed, compactIcon }: {
  children: ReactNode;
  icon: string;
  onClick: () => void;
  pressed?: boolean;
  compactIcon?: boolean;
}) {
  return <button type="button" className="bw-action hw-action" data-compact-icon={compactIcon} aria-pressed={pressed} onClick={onClick}>
    <span className="hw-action-label">{children}</span><span className="hw-action-icon"><Icon name={icon} size={13} /></span>
  </button>;
}

function Tabs({ choices, selected, onChange, label }: {
  choices: readonly { label: string; accessibleName?: string }[];
  selected: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return <div className="bw-tabs hw-tabs" role="group" aria-label={label}>{choices.map((choice, index) => (
    <button key={choice.label} type="button" aria-label={choice.accessibleName} aria-pressed={index === selected} onClick={() => onChange(index)}>{choice.label}</button>
  ))}</div>;
}

function Scrub({ label, min = 0, max, value, onChange, valueText, children }: {
  label: string;
  min?: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  valueText: string;
  children: ReactNode;
}) {
  return <div className="hw-scrub">
    {children}
    <input type="range" min={min} max={max} value={value} aria-label={label} aria-valuetext={valueText} onChange={event => onChange(event.currentTarget.valueAsNumber)} />
  </div>;
}

function useWidgetMotion() {
  const { paused, speed, reducedMotion } = useWidgetSettings();
  const reduce = useReducedMotion() || reducedMotion;
  return { reduce, duration: (seconds: number) => paused || reduce ? 0 : seconds / speed };
}

function useProgress(interval: number, duration: number) {
  const { paused, speed } = useWidgetSettings();
  const [elapsed, setElapsed] = useState<number | null>(null);
  const active = elapsed !== null && elapsed < duration;
  useEffect(() => {
    if (!active || paused) return;
    let previousTime = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const delta = (now - previousTime) * speed;
      previousTime = now;
      setElapsed(value => value === null ? null : Math.min(duration, value + delta));
    }, Math.max(16, interval / speed));
    return () => window.clearInterval(timer);
  }, [active, duration, interval, paused, speed]);
  return {
    elapsed,
    active,
    toggle: () => setElapsed(value => value !== null && value < duration ? null : 0),
  };
}

const HEART_BEATS = [73, 75, 75, 76, 76, 78, 78, 74];
const HEART_SEGMENT = 'h13 q2.4 -5 4.7 0 h4 l2.8 7 3.6 -34 3.1 45 3.2 -18 h5.2 q4.6 -10 9.2 0 h35.2';
const HEART_TRACE = `M-78 35 ${HEART_SEGMENT.repeat(6)}`;

function HeartRate() {
  const [measuring, setMeasuring] = useState(false);
  const { reduce } = useWidgetMotion();
  const tick = usePulse(measuring ? 720 : 2300, measuring || !reduce);
  const value = HEART_BEATS[tick % HEART_BEATS.length];
  return <WidgetCard title="Heart rate" icon="heart-pulse" aside={<Action compactIcon icon={measuring ? 'pause' : 'activity'} pressed={measuring} onClick={() => setMeasuring(active => !active)}>{measuring ? 'Stop' : 'Measure'}</Action>}>
    <div className="hw-stack hw-heart" data-measuring={measuring}>
      <div className="hw-between hw-heart-top"><div className="hw-number-line"><DotNumber value={value} size={38} label={`${value} beats per minute`} /><span className="bw-unit">bpm</span></div><div className="hw-heart-stats"><div><span>Min</span><strong>58</strong></div><div><span>Max</span><strong>124</strong></div></div></div>
      <svg className="hw-graphic hw-heart-chart hw-plot-fade" viewBox="0 0 336 60" preserveAspectRatio="none" aria-hidden="true">
        <path className="hw-heart-trace" d={HEART_TRACE} stroke="var(--bw-accent)" strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" fill="none" />
      </svg>
    </div>
  </WidgetCard>;
}

const ACTIVITY = [
  { name: 'Move', amount: '486/590 kcal', percent: 82, color: '#ff377f' },
  { name: 'Exercise', amount: '18/30 min', percent: 60, color: '#c9d65c' },
  { name: 'Stand', amount: '9/12 h', percent: 75, color: '#51badc' },
];

function Activity() {
  const [selected, setSelected] = useState(0);
  const item = ACTIVITY[selected];
  return <WidgetCard label="Activity">
    <div className="hw-stack hw-activity">
      <button className="hw-activity-control" type="button" onClick={() => setSelected(index => (index + 1) % ACTIVITY.length)} aria-label={`${item.name} ${item.percent} percent. Show next activity ring`}>
        <svg viewBox="0 0 104 104" aria-hidden="true">{ACTIVITY.map((ring, index) => {
          const radius = 45 - index * 10;
          return <g key={ring.name} transform="rotate(-90 52 52)">
            <circle cx="52" cy="52" r={radius} fill="none" stroke={ring.color} strokeWidth="8" opacity=".2" />
            <circle className="hw-activity-ring" data-selected={index === selected} cx="52" cy="52" r={radius} fill="none" stroke={ring.color} strokeWidth="8" strokeLinecap="round" pathLength="100" strokeDasharray={`${ring.percent} 100`} />
          </g>;
        })}</svg>
        <strong>{item.percent}%</strong>
      </button>
      <p className="hw-activity-footer hw-center bw-muted"><span className="hw-white">{item.name}</span> {item.amount}</p>
    </div>
  </WidgetCard>;
}

const STEPS = [6950, 8432, 9560, 5128, 9132, 10125, 4140];
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const WHOLE_NUMBER = new Intl.NumberFormat('en-US');

function Steps() {
  const [day, setDay] = useState(1);
  const progress = Math.round(STEPS[day] / 100);
  return <WidgetCard label="Steps">
    <div className="hw-steps">
      <div className="hw-steps-readout"><DotNumber value={WHOLE_NUMBER.format(STEPS[day])} size={34} /><p className="bw-muted">{WEEKDAYS[day]} · {progress}% of goal</p><div className="hw-step-progress" style={{ '--hw-step-progress': `${Math.min(100, progress)}%` } as CSSProperties} aria-hidden="true"><span className="hw-step-progress-marker" /></div></div>
      <div className="hw-step-days" role="group" aria-label="Day of week">{WEEKDAYS.map((weekday, index) => (
        <button type="button" key={weekday} aria-label={weekday} aria-pressed={day === index} data-near-goal={STEPS[index] >= 9000} onClick={() => setDay(index)}><span className="hw-step-column" aria-hidden="true">{Array.from({ length: Math.round(STEPS[index] / 990) }, (_, point) => <i key={point} />)}</span><span>{weekday[0]}</span></button>
      ))}</div>
    </div>
  </WidgetCard>;
}

const SLEEP_STAGES = [2, 3, 3, 2, 1, 2, 3, 2, 1, 1, 2, 0, 2, 3, 2, 1, 1, 2, 2, 1, 1, 2, 1, 1, 3, 2, 1, 1, 1, 3, 1, 0];
const STAGE_NAMES = ['Awake', 'REM', 'Light', 'Deep'];
const STAGE_COLORS = ['#e69786', '#dfea69', '#a4a0c0', '#e7e6ff'];

function Sleep() {
  const [selected, setSelected] = useState(14);
  const minutes = 23 * 60 + 10 + Math.round(selected * (462 / 31));
  const time = `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  const stage = `${time} · ${STAGE_NAMES[SLEEP_STAGES[selected]]}`;
  return <WidgetCard label="Sleep">
    <div className="hw-stack hw-sleep">
      <div className="hw-sleep-summary">
        <DotNumber value="7:42" size={28} label="7 hours 42 minutes" />
        <span className="bw-unit">Sleep</span>
      </div>
      <Scrub label="Sleep stage" max={31} value={selected} valueText={stage} onChange={setSelected}>
        <span className="hw-sleep-selection bw-muted hw-caption" aria-hidden="true">{stage}</span>
        <svg className="hw-graphic" viewBox="0 0 320 58" preserveAspectRatio="none" aria-hidden="true">
          <g className="hw-plot-fade">
            {STAGE_NAMES.map((name, index) => (
              <path key={name} d={`M0 ${8 + index * 14} H320`} stroke="#e9e0ff18" strokeDasharray="1 4" />
            ))}
            {SLEEP_STAGES.slice(0, -1).map((state, index) => (
              <path key={index} d={`M${index * 10 + 4.5} ${8 + state * 14} H${index * 10 + 9.5} V${8 + SLEEP_STAGES[index + 1] * 14} H${index * 10 + 14.5}`} stroke="#dad4ff49" fill="none" strokeWidth=".65" />
            ))}
          </g>
          {SLEEP_STAGES.map((state, index) => (
            <rect className="hw-sleep-stage" key={index} x={index * 10} y={5.2 + state * 14} width="9" height="5.6" rx="2.8" fill={STAGE_COLORS[state]} opacity={index === selected ? 1 : .78} />
          ))}
          <g className="hw-scrub-selection">
            <path d={`M${selected * 10 + 4.5} 0 V57`} stroke="var(--bw-accent)" strokeWidth=".9" />
            <rect className="hw-scrub-halo" x={selected * 10 - 1} y={4.2 + SLEEP_STAGES[selected] * 14} width="11" height="7.6" rx="3.8" fill="none" stroke="var(--bw-accent)" />
          </g>
        </svg>
      </Scrub>
      <div className="hw-between bw-muted hw-caption"><span>23:10</span><span>03:00</span><span>06:52</span></div>
    </div>
  </WidgetCard>;
}

const LUNG_DURATION = 3300;
const LUNG_NUMBER = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const LUNG_ARCS = [
  { center: 143, width: 95, height: 89 },
  { center: 193, width: 95, height: 89 },
  { center: 118, width: 70, height: 64 },
  { center: 168, width: 70, height: 64 },
  { center: 218, width: 70, height: 64 },
];

function lungArc(arc: typeof LUNG_ARCS[number]) {
  return `M${arc.center - arc.width} 100 A${arc.width} ${arc.height} 0 0 1 ${arc.center + arc.width} 100`;
}

function LungCapacity() {
  const { duration } = useWidgetMotion();
  const { elapsed, active: running, toggle } = useProgress(50, LUNG_DURATION);
  const progress = (elapsed ?? 0) / LUNG_DURATION;
  const value = elapsed === null ? 3.3 : 3.6 * (1 - (1 - progress) ** 1.7);
  const markerAngle = Math.PI * (elapsed === null ? .207 : progress);
  const [mainArc] = LUNG_ARCS;
  const markerX = mainArc.center - mainArc.width * Math.cos(markerAngle);
  const markerY = 100 - mainArc.height * Math.sin(markerAngle);
  return <WidgetCard label="Lung capacity demo">
    <div className="hw-stack hw-lung">
      <div className="hw-lung-value"><DotNumber value={LUNG_NUMBER.format(value)} size={64} /><span className="bw-muted">Liters</span></div>
      <div className="hw-lung-visual">
        <svg className="hw-graphic" viewBox="0 0 336 103" aria-hidden="true">
          <g className="hw-plot-fade">
            {LUNG_ARCS.map(arc => <path key={`${arc.center}-${arc.width}`} d={lungArc(arc)} stroke="#f4cce650" strokeWidth=".85" strokeDasharray="1.2 4" fill="none" />)}
          </g>
          {running && <path d={lungArc(mainArc)} stroke="#f6bcf0" strokeOpacity=".36" strokeWidth="1.4" fill="none" pathLength="1" strokeDasharray={`${progress} 1`} />}
          <motion.circle cx={markerX} cy={markerY} r="3" fill="white" initial={false} animate={{ opacity: running ? 1 : .95 }} transition={{ duration: duration(.16) }} />
        </svg>
      </div>
      <div className="hw-between hw-lung-footer"><div><p aria-live="polite">{running ? 'Test in progress' : 'Lung capacity'}</p><p className="bw-muted hw-caption"><span className="hw-lung-best-long">Personal best</span><span className="hw-lung-best-short">Best</span> · 3.6 L</p></div><Action compactIcon icon={running ? 'pause' : 'rotate-ccw'} onClick={toggle}>{running ? 'Stop' : 'Repeat'}</Action></div>
    </div>
  </WidgetCard>;
}

const GLASS_PLURAL = new Intl.PluralRules('en-US');
const WATER_LAYERS = [
  { name: 'back', start: 8, period: 216, wave: 'c36 -11 72 -11 108 0 s72 11 108 0', color: '#719be6', opacity: .27 },
  { name: 'middle', start: 15, period: 192, wave: 'c32 9 64 9 96 0 s64 -9 96 0', color: '#537ac8', opacity: .18 },
  { name: 'front', start: 22, period: 180, wave: 'c30 -8 60 -8 90 0 s60 8 90 0', color: undefined, opacity: .50 },
] as const;

function WaterSurface({ glasses }: { glasses: number }) {
  const depthId = useId();
  const surfaceOffset = glasses === 0 ? 107 : (1 - Math.min(1, glasses / 8)) * 100;
  return <div aria-hidden="true" className="hw-water" style={{ '--hw-water-offset': `${surfaceOffset}%` } as CSSProperties}>
    <div className="hw-water-fill">
      <svg viewBox="0 0 176 192" preserveAspectRatio="none">
        <defs>
          <linearGradient id={depthId} gradientUnits="userSpaceOnUse" x1="0" y1="16" x2="0" y2="192">
            <stop stopColor="#648bd6" />
            <stop offset=".16" stopColor="#4569b0" />
            <stop offset=".56" stopColor="#33548c" />
            <stop offset="1" stopColor="#384b9f" />
          </linearGradient>
        </defs>
        {WATER_LAYERS.map(layer => (
          <path key={layer.name} className={`hw-water-wave hw-water-wave--${layer.name}`}
            style={{ '--hw-wave-travel': `${-layer.period / 176 * 100}%` } as CSSProperties}
            d={`M${-layer.period} ${layer.start} ${`${layer.wave} `.repeat(4)}V198 H${-layer.period}Z`}
            fill={layer.color ?? `url(#${depthId})`} fillOpacity={layer.opacity} />
        ))}
      </svg>
    </div>
  </div>;
}

function Hydration() {
  const [glasses, setGlasses] = useState(5);
  const milliliters = WHOLE_NUMBER.format(glasses * 250);
  const unit = GLASS_PLURAL.select(glasses) === 'one' ? 'glass' : 'glasses';
  return <WidgetCard title="Hydration" icon="droplets" className="hw-hydration-card">
    <WaterSurface glasses={glasses} />
    <div className="hw-stack hw-hydration">
      <div><DotNumber value={milliliters} size={28} label={`${milliliters} milliliters`} /><p className="bw-muted hw-hydration-unit">ml of 2,000</p></div>
      <div className="hw-hydration-controls">
        <Circle icon="minus" label="Remove a glass of water" disabled={glasses === 0} onClick={() => setGlasses(count => Math.max(0, count - 1))} />
        <span className="hw-caption" aria-live="polite">{glasses} {unit}</span>
        <Circle icon="plus" label="Add a glass of water" disabled={glasses === 12} onClick={() => setGlasses(count => Math.min(12, count + 1))} light />
      </div>
    </div>
  </WidgetCard>;
}

const GLUCOSE = [{ amount: 84, range: 94, time: 'Today' }, { amount: 91, range: 91, time: 'This week' }, { amount: 88, range: 96, time: 'This month' }];
const GLUCOSE_PERIODS = [{ label: 'D', accessibleName: 'Day' }, { label: 'W', accessibleName: 'Week' }, { label: 'M', accessibleName: 'Month' }];

function Glucose() {
  const [period, setPeriod] = useState(0);
  const data = GLUCOSE[period];
  return <WidgetCard title="Average glucose" className="hw-glucose-card" aside={<Tabs choices={GLUCOSE_PERIODS} selected={period} onChange={setPeriod} label="Glucose period" />}>
    <div className="hw-between hw-glucose">
      <div>
        <div className="hw-number-line"><strong className="bw-value hw-glucose-value">{data.amount}</strong><span className="bw-unit">mg/dl</span></div>
        <p className="bw-muted hw-caption">
          {data.time} · <span className="hw-glucose-target-long">target 70 to 180</span>
          <span className="hw-glucose-target-short"><span className="bw-visually-hidden">target 70 to 180</span><span aria-hidden="true">70–180</span></span>
        </p>
      </div>
      <div className="hw-glucose-ring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" opacity=".28" /><circle className="hw-glucose-progress" cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1.9" pathLength="100" style={{ strokeDasharray: `${data.range} 100` }} transform="rotate(-90 50 50)" /></svg><DotNumber value={`${data.range}%`} size={22} /><span className="hw-caption">in range</span></div>
    </div>
  </WidgetCard>;
}

const BREATH_POINTS = [
  { x: 50, y: 15, r: 4.5 }, { x: 78, y: 28, r: 6 }, { x: 83, y: 58, r: 4 },
  { x: 64, y: 81, r: 6.5 }, { x: 35, y: 81, r: 3.5 }, { x: 18, y: 61, r: 5 },
  { x: 24, y: 30, r: 6 },
];

function Breathing() {
  const { reduce, duration } = useWidgetMotion();
  const { elapsed, active, toggle } = useProgress(70, 60000);
  const seconds = Math.floor((elapsed ?? 0) / 1000);
  const breathTime = ((elapsed ?? 0) / 1000) % 10;
  const inhaling = breathTime < 4;
  const phase = inhaling ? 'Inhale' : 'Exhale';
  const phaseProgress = inhaling ? breathTime / 4 : (10 - breathTime) / 6;
  const volume = active && !reduce ? (1 - Math.cos(Math.PI * phaseProgress)) / 2 : 0;
  const status = active ? `${phase} · ${60 - seconds}s` : seconds === 60 ? 'Complete' : '1 minute';
  return <WidgetCard title="Breathe" icon="flower-2">
    <div className="hw-stack hw-breathing">
      <div className="hw-breathe-visual" aria-hidden="true">
        <motion.svg className="hw-breathe-orbit" viewBox="0 0 100 100" initial={false}
          animate={{ scale: 1 + .26 * volume }} transition={{ duration: duration(.075), ease: 'linear' }}>
          <g className="hw-breathe-track">
            {BREATH_POINTS.map(({ x, y, r }, index) => <circle key={x} className="hw-breathe-point"
              cx={x} cy={y} r={r * (1 + .28 * volume)} style={{ '--hw-point-delay': `${index * -.34}s` } as CSSProperties} />)}
          </g>
          <g className="hw-breathe-track hw-breathe-track--inner">
            <circle className="hw-breathe-point" cx="45" cy="33" r={3.4 + 1.4 * volume} />
            <circle className="hw-breathe-point" cx="60" cy="62" r={4.2 + 1.6 * volume} />
          </g>
        </motion.svg>
      </div>
      <div className="hw-between"><span className="hw-caption hw-breathe-caption" aria-hidden={active || undefined}>{status}</span><span className="bw-visually-hidden" role="status">{active ? phase : seconds === 60 ? 'Session complete' : ''}</span><Circle icon={active ? 'pause' : 'play'} label={active ? 'Stop breathing session' : 'Start one-minute breathing session'} onClick={toggle} filledIcon={!active} light /></div>
    </div>
  </WidgetCard>;
}

const CITIES = [
  { city: 'Caracas', temperature: 28, high: 31, low: 22, condition: 'Partly cloudy', sky: 'clouds' },
  { city: 'Madrid', temperature: 14, high: 17, low: 6, condition: 'Clear', sky: 'clear' },
  { city: 'Tokyo', temperature: 19, high: 21, low: 15, condition: 'Light rain', sky: 'rain' },
] as const;
const MADRID_SURFACE = referenceSurface('weather-madrid');
const TOKYO_SURFACE = referenceSurface('weather-tokyo');

function WeatherSky({ sky }: { sky: typeof CITIES[number]['sky'] }) {
  const id = useId();
  const sun = `${id}-sun`;
  const cloud = `${id}-cloud`;
  const sunBlur = `${id}-sun-blur`;
  const cloudBlur = `${id}-cloud-blur`;
  return <svg className={`hw-sky hw-sky--${sky}`} viewBox="0 0 132 102" aria-hidden="true">
    <defs>
      <linearGradient id={sun} x1="10%" y1="75%" x2="94%" y2="25%">
        <stop stopColor={sky === 'clear' ? '#49351a' : '#161d27'} stopOpacity=".46" />
        <stop offset=".48" stopColor={sky === 'clear' ? '#8a6330' : '#555148'} stopOpacity=".55" />
        <stop offset="1" stopColor="#a17629" stopOpacity=".65" />
      </linearGradient>
      <linearGradient id={cloud}>
        <stop stopColor="#60616e" stopOpacity=".18" />
        <stop offset=".52" stopColor="#858995" stopOpacity=".5" />
        <stop offset="1" stopColor="#a5aab5" stopOpacity=".76" />
      </linearGradient>
      <filter id={sunBlur} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation={sky === 'clear' ? 4 : 1.6} />
      </filter>
      <filter id={cloudBlur} x="-30%" y="-40%" width="160%" height="180%">
        <feGaussianBlur stdDeviation="5.2" />
      </filter>
    </defs>
    {sky !== 'rain' && <circle cx="85" cy="40" r="37" fill={`url(#${sun})`} filter={`url(#${sunBlur})`} />}
    {sky !== 'clear' && <g className="hw-sky-cloud" filter={`url(#${cloudBlur})`}>
      <path d="M12 77C23 63 40 69 50 64C63 61 64 55 74 53C87 49 92 55 98 63C111 60 122 64 127 73C131 78 128 87 122 88C96 92 79 88 57 87C35 89 9 88 12 77Z" fill={`url(#${cloud})`} />
      <path d="M71 83C85 73 104 71 118 79C125 84 121 88 111 89C98 90 83 87 71 83Z" fill="#a7b9cc" opacity=".25" />
    </g>}
    {sky === 'rain' && <path className="hw-sky-rain" d="M56 83l-3 6m15-6-3 8m14-10-4 9m16-8-4 10m17-13-4 11m17-12-4 9m14-11-3 7" fill="none" stroke="#a1abff" strokeLinecap="round" strokeWidth="1.2" />}
  </svg>;
}

function Weather() {
  const [cityChanges, setCityChanges] = useState(0);
  const { duration } = useWidgetMotion();
  const { city, temperature, high, low, condition, sky } = CITIES[cityChanges % CITIES.length];
  const transitionDuration = duration(.24);
  return <WidgetCard title={city} icon="map-pin" className={`hw-weather-card hw-weather-card--${sky}`} aside={<Action compactIcon icon="chevron-right" onClick={() => setCityChanges(count => count + 1)}>City</Action>}>
    <div className="hw-weather-backdrop" aria-hidden="true">
      <div className="hw-weather-backdrop-state hw-weather-backdrop-state--clear" style={{ backgroundImage: MADRID_SURFACE }} />
      <div className="hw-weather-backdrop-state hw-weather-backdrop-state--rain" style={{ backgroundImage: TOKYO_SURFACE }} />
    </div>
    <motion.div className="hw-stack hw-weather" key={city} initial={cityChanges && transitionDuration ? { opacity: .62, y: 3 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: transitionDuration, ease: 'easeOut' }}>
      <WeatherSky sky={sky} />
      <div className="hw-temperature" aria-label={`${temperature} degrees`}>{temperature}°</div>
      <div className="hw-weather-reading"><strong>{condition}</strong><p className="bw-muted">H {high}° · L {low}°</p></div>
    </motion.div>
  </WidgetCard>;
}

const HOURLY = [
  { temp: 24, rain: 4, y: 51 }, { temp: 25, rain: 5, y: 46 }, { temp: 27, rain: 10, y: 35 },
  { temp: 28, rain: 10, y: 30 }, { temp: 30, rain: 15, y: 20 }, { temp: 31, rain: 25, y: 15 },
  { temp: 30, rain: 35, y: 19 }, { temp: 28, rain: 49, y: 29 }, { temp: 26, rain: 39, y: 40 },
  { temp: 25, rain: 29, y: 45 }, { temp: 24, rain: 15, y: 50 }, { temp: 23, rain: 9, y: 56 },
];
const hourlyX = (hour: number) => 8 + hour * 320 / (HOURLY.length - 1);
const hourlyPath = HOURLY.reduce((path, { y }, index) => {
  const x = hourlyX(index);
  if (index === 0) return `M ${x} ${y}`;
  const previousY = HOURLY[index - 1].y;
  const leftY = HOURLY[Math.max(0, index - 2)].y;
  const rightY = HOURLY[Math.min(HOURLY.length - 1, index + 1)].y;
  return `${path} C ${x - 19.4} ${previousY + (y - leftY) / 6}, ${x - 9.7} ${y - (rightY - previousY) / 6}, ${x} ${y}`;
}, '');

function Hourly() {
  const [hour, setHour] = useState(5);
  const gradient = useId();
  const data = HOURLY[hour];
  const markerX = hourlyX(hour);
  const summary = `${String(hour + 9).padStart(2, '0')}:00 · ${data.temp}°`;
  const readout = `${summary} · ${data.rain}% rain`;
  return <WidgetCard label="Hourly forecast" title={summary} icon="cloud-sun">
    <div className="hw-stack hw-hourly">
      <Scrub label="Hourly forecast" max={HOURLY.length - 1} value={hour} valueText={readout} onChange={setHour}>
        <svg className="hw-graphic" viewBox="0 0 336 82" preserveAspectRatio="none" aria-hidden="true">
          <defs><linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1"><stop stopColor="#f0e7ff" stopOpacity=".2" /><stop offset="1" stopColor="#f0e7ff" stopOpacity="0" /></linearGradient></defs>
          <g className="hw-plot-fade">
            <path d={`${hourlyPath} V80 H8Z`} fill={`url(#${gradient})`} />
            <path d={hourlyPath} stroke="#fff" strokeWidth="1.5" vectorEffect="non-scaling-stroke" fill="none" />
          </g>
          {HOURLY.map(({ rain }, index) => (
            <rect className="hw-hourly-rain" key={index} x={hourlyX(index) - 1.5} y={79 - rain * .29} width="3" height={rain * .29} rx="1.5" fill={index === hour ? '#c3c8ff' : '#9197d289'} />
          ))}
          <path d={`M${markerX} 2 V79`} stroke="var(--bw-accent)" strokeDasharray="1.5 3" opacity=".8" />
          <circle className="hw-scrub-halo" cx={markerX} cy={data.y} r="7.8" fill="none" stroke="var(--bw-accent)" />
          <circle cx={markerX} cy={data.y} r="4.9" fill="var(--bw-accent)" stroke="#171126" strokeWidth="1.5" />
        </svg>
      </Scrub>
      <div className="hw-between bw-muted hw-caption"><span>9h</span><span>12h</span><span>15h</span><span>18h</span><span>20h</span></div>
    </div>
  </WidgetCard>;
}

const AIR = [
  { label: 'PM', accessibleName: 'Particulate matter', index: 42, status: 'Good', line: 'M 0 17 H 21 V 23 H 43 V 11 H 65 V 17 H 76 V 6 H 98 V 17 H 120 V 23', x: 76, y: 6 },
  { label: 'O₃', accessibleName: 'Ozone', index: 34, status: 'Good', line: 'M 0 21 H 21 V 14 H 43 V 17 H 65 V 8 H 76 V 12 H 98 V 15 H 120 V 14', x: 65, y: 8 },
];

function AirQuality() {
  const [selected, setSelected] = useState(0);
  const { duration } = useWidgetMotion();
  const pollutant = AIR[selected];
  return <WidgetCard title="Air quality" icon="leaf" className="hw-air-card">
    <div className="hw-stack hw-air">
      <svg className="hw-graphic hw-air-chart" viewBox="-6 -4 132 38" aria-hidden="true">
        <g className="hw-plot-fade">
          <motion.path initial={false} animate={{ d: pollutant.line }} transition={{ duration: duration(.24), ease: 'easeOut' }} fill="none" stroke="white" strokeWidth="1.3" />
        </g>
        <motion.circle initial={false} animate={{ cx: pollutant.x, cy: pollutant.y }} transition={{ duration: duration(.24), ease: 'easeOut' }} r="3.2" fill="var(--bw-accent)" />
      </svg>
      <DotNumber value={pollutant.index} size={28} />
      <div className="hw-between"><span className="bw-muted">{pollutant.status}</span><Tabs choices={AIR} selected={selected} onChange={setSelected} label="Air pollutant" /></div>
    </div>
  </WidgetCard>;
}

function polar(cx: number, cy: number, radius: number, degrees: number) {
  const radians = degrees * Math.PI / 180;
  return { x: cx + Math.cos(radians) * radius, y: cy + Math.sin(radians) * radius };
}

function UvIndex() {
  const [peak, setPeak] = useState(false);
  const value = peak ? 9 : 6;
  const ticks = 23;
  const active = Math.round((value / 11) * (ticks - 1));
  const markerAngle = 180 * active / (ticks - 1) - 90;
  return <WidgetCard title="UV index" icon="sun" aside={<button className="hw-chip" type="button" aria-label={peak ? 'Show current UV index' : 'Show peak UV index'} aria-pressed={peak} onClick={() => setPeak(value => !value)}>{peak ? 'Peak' : 'Now'}</button>}>
    <div className="hw-stack hw-uv">
      <svg className="hw-graphic" viewBox="0 0 144 69" aria-hidden="true">
        {Array.from({ length: ticks }, (_, index) => {
          const point = polar(72, 57, 47, 180 + 180 * index / (ticks - 1));
          return <circle className="hw-uv-tick" key={index} cx={point.x} cy={point.y} r={index <= active ? 2.3 : 1.6} fill={`hsl(${114 - index * 5.1} 94% 66%)`} opacity={index <= active ? 1 : .27} />;
        })}
        <circle className="hw-uv-marker" cx="72" cy="10" r="5.7" style={{ rotate: `${markerAngle}deg` }} fill="white" />
      </svg>
      <div className="hw-between"><DotNumber value={value} size={34} /><span>{peak ? 'Very high' : 'High'}</span></div>
    </div>
  </WidgetCard>;
}

const WIND = [
  { direction: 'NE', degrees: -45, speed: 14, gusts: 22 }, { direction: 'E', degrees: 0, speed: 12, gusts: 19 },
  { direction: 'SE', degrees: 45, speed: 17, gusts: 25 }, { direction: 'N', degrees: -90, speed: 9, gusts: 16 },
];

function Wind() {
  const [index, setIndex] = useState(0);
  const reading = WIND[index];
  return <WidgetCard label="Wind">
    <div className="hw-stack hw-wind">
      <button className="hw-wind-control" type="button" onClick={() => setIndex(value => (value + 1) % WIND.length)} aria-label={`${reading.direction} wind, ${reading.speed} kilometers per hour. Show next reading`}>
        <svg viewBox="0 0 104 104" aria-hidden="true">{Array.from({ length: 48 }, (_, i) => {
          const dot = polar(52, 52, 48, i * 7.5);
          return <circle key={i} cx={dot.x} cy={dot.y} r={i % 12 === 0 ? 2.1 : .82} fill="white" opacity={i % 12 === 0 ? 1 : .43} />;
        })}<g className="hw-wind-needle" style={{ rotate: `${reading.degrees}deg` }}>
          <path d="M11 0 L-8 -7 L-5 0 L-8 7Z" transform="translate(80 52)" fill="var(--bw-accent)" />
        </g>
          <text className="hw-wind-north" x="52" y="20">N</text>
          <text className="hw-wind-value" x="52" y="48">{reading.speed}</text>
          <text className="hw-wind-unit" x="52" y="66">km/h</text>
        </svg>
      </button>
      <p className="hw-center hw-caption">{reading.direction} · gusts of {reading.gusts} km/h</p>
    </div>
  </WidgetCard>;
}

const SUNRISE = 6 * 60 + 18;
const SUNSET = 18 * 60 + 24;
const formatHour = (minutes: number) => `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;

function SunPath() {
  const [minutes, setMinutes] = useState(14 * 60 + 12);
  const progress = (minutes - SUNRISE) / (SUNSET - SUNRISE);
  const twilight = Math.max(0, (progress - .58) / .42);
  const dusk = twilight * twilight * (3 - 2 * twilight);
  const remaining = SUNSET - minutes;
  const readout = `${formatHour(minutes)} · ${Math.floor(remaining / 60)} h ${remaining % 60} min of light left`;
  const sunX = (27 + 282 * progress) / 336;
  const sunY = (69 - 58 * 4 * progress * (1 - progress)) / 87;
  return <WidgetCard label="Sun" className="hw-sun-card">
    <div className="hw-stack hw-sun" style={{ '--hw-sun-dusk': dusk, '--hw-sun-x': `${sunX * 100}%` } as CSSProperties}>
      <div className="hw-sun-dusk" aria-hidden="true" />
      <Scrub label="Time of day" min={SUNRISE} max={SUNSET} value={minutes} valueText={readout} onChange={setMinutes}>
        <div className="hw-sun-ground" aria-hidden="true" />
        <svg className="hw-graphic hw-plot-fade" viewBox="0 0 336 87" preserveAspectRatio="none" aria-hidden="true">
          <path d="M27 69 Q168 -47 309 69" fill="none" stroke="#ffe1a07a" strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="hw-sun-marker" aria-hidden="true" style={{ top: `${sunY * 100}%` }} />
      </Scrub>
      <div className="hw-between bw-muted hw-caption hw-sun-times">
        <span>Sunrise<strong>{formatHour(SUNRISE)}</strong></span>
        <span>Sunset<strong>{formatHour(SUNSET)}</strong></span>
      </div>
    </div>
  </WidgetCard>;
}

export const healthWeather: WidgetDefinition[] = [
  { id: 'heart-rate', title: 'Heart rate', category: 'health', size: 'wide', tone: 'red', Component: HeartRate, interaction: 'Start a reading and watch the ECG' },
  { id: 'activity', title: 'Activity', category: 'health', size: 'small', tone: 'graphite', Component: Activity, interaction: 'Cycle through Move, Exercise, and Stand' },
  { id: 'steps', title: 'Steps', category: 'health', size: 'wide', tone: 'graphite', Component: Steps, interaction: 'Select a day to see steps and goal progress' },
  { id: 'sleep', title: 'Sleep', category: 'health', size: 'wide', tone: 'indigo', Component: Sleep, interaction: 'Scrub across the timeline to see each stage' },
  { id: 'lung-capacity', title: 'Lung capacity', category: 'health', size: 'large', tone: 'pink', Component: LungCapacity, interaction: 'Repeat the demo to see the capacity curve' },
  { id: 'hydration', title: 'Hydration', category: 'health', size: 'small', tone: 'indigo', Component: Hydration, interaction: 'Add or remove glasses of water' },
  { id: 'glucose', title: 'Average glucose', category: 'health', size: 'wide', tone: 'plum', Component: Glucose, interaction: 'Switch between day, week, and month' },
  { id: 'breathing', title: 'Breathe', category: 'health', size: 'small', tone: 'rose', Component: Breathing, interaction: 'Start a one-minute guided breathing session' },
  { id: 'weather', title: 'Current weather', category: 'weather', size: 'wide', tone: 'blue', Component: Weather, interaction: 'Switch between cities to compare the weather' },
  { id: 'hourly', title: 'Next hours', category: 'weather', size: 'wide', tone: 'violet', Component: Hourly, interaction: 'Scrub across the chart for hourly forecasts' },
  { id: 'air-quality', title: 'Air quality', category: 'weather', size: 'small', tone: 'olive', Component: AirQuality, interaction: 'Compare particulate matter and ozone' },
  { id: 'uv-index', title: 'UV index', category: 'weather', size: 'small', tone: 'ember', Component: UvIndex, interaction: 'Compare the current and peak UV index' },
  { id: 'wind', title: 'Wind', category: 'weather', size: 'small', tone: 'teal', Component: Wind, interaction: 'Cycle through compass readings' },
  { id: 'sun', title: 'Sun', category: 'weather', size: 'wide', tone: 'amber', Component: SunPath, interaction: 'Drag the sun across the day' },
];
