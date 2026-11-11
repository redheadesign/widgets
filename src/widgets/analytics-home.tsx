import { useEffect, useId, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { DotNumber, Icon, usePulse, useWidgetSettings, WidgetCard } from './core';
import type { WidgetDefinition } from './core.js';
import { musicTracks } from './music-tracks';
import './analytics-home.css';

const integers = new Intl.NumberFormat('en-US');
const decimals = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const compactMoney = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', minimumFractionDigits: 1, maximumFractionDigits: 1 });
const clockFormat = new Intl.NumberFormat('en-US', { minimumIntegerDigits: 2, useGrouping: false });
const accent = 'var(--bw-accent, #e4f765)';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function durationLabel(seconds: number) {
  return `${Math.floor(seconds / 60)}:${clockFormat.format(seconds % 60)}`;
}

function durationDigits(seconds: number) {
  return `${clockFormat.format(Math.floor(seconds / 60))}:${clockFormat.format(seconds % 60)}`;
}

function useTransition(seconds = 0.26) {
  const { speed, reducedMotion, paused } = useWidgetSettings();
  const systemReducedMotion = useReducedMotion();
  return { duration: paused || reducedMotion || systemReducedMotion ? 0 : seconds / Math.max(0.05, speed), ease: 'easeOut' as const };
}

type PressProps = ButtonHTMLAttributes<HTMLButtonElement> & { icon?: string; bright?: boolean };

function Press({ icon, bright, children, className = '', ...props }: PressProps) {
  return (
    // ai-design-check-ignore-next-line use-shared-components -- This is the shared button for these widgets.
    <button type="button" className={`ah-press ${bright ? 'ah-bright' : ''} ${icon && !children ? 'bw-circle' : ''} ${className}`} {...props}>
      {icon && <Icon name={icon} size={14} />}{children}
    </button>
  );
}

function moveSelection(event: KeyboardEvent<HTMLElement>, select?: (index: number) => void) {
  const keys = ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown', 'Home', 'End'];
  const key = keys.indexOf(event.key);
  if (key < 0) return;
  const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
  const index = buttons.indexOf(event.target as HTMLButtonElement);
  if (index < 0) return;
  event.preventDefault();
  const next = key === 4 ? 0 : key === 5 ? buttons.length - 1 : (index + (key < 2 ? -1 : 1) + buttons.length) % buttons.length;
  buttons[next]?.focus();
  select?.(next);
}

function inspect(select: () => void) {
  return {
    onClick: select,
    onFocus: select,
    onPointerEnter: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.pointerType === 'mouse') select();
    },
  };
}

function ScrubRange({ label, valueText, max, value, onValue, hover, pointerValue }: {
  label: string; valueText: string; max: number; value: number; onValue: (next: number) => void;
  hover?: boolean; pointerValue?: (x: number, y: number) => number;
}) {
  const scrub = (event: PointerEvent<HTMLInputElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    onValue(Math.round(clamp(pointerValue ? pointerValue(x, y) : x, 0, 1) * max));
  };
  return (
    // ai-design-check-ignore-next-line use-shared-components -- This is the shared chart slider and retains native range semantics.
    <input type="range" min={0} max={max} value={value} aria-label={label} aria-valuetext={valueText}
      className="ah-overlay-range" onChange={(event) => onValue(event.currentTarget.valueAsNumber)}
      onPointerDown={(event) => {
        if (event.button !== 0 || !event.isPrimary) return;
        event.preventDefault();
        event.currentTarget.focus({ preventScroll: true });
        event.currentTarget.setPointerCapture(event.pointerId);
        scrub(event);
      }} onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId) || (hover && event.pointerType === 'mouse' && !event.buttons)) scrub(event);
      }} />
  );
}

function Segments({ label, options, selected, onChange }: {
  label: string; options: readonly { title: string; short?: string }[]; selected: number; onChange: (index: number) => void;
}) {
  return (
    <div className="bw-tabs ah-segments" role="group" aria-label={label} onKeyDown={(event) => moveSelection(event, onChange)}
      style={{ '--ah-segment-offset': `${selected * 100}%` } as CSSProperties}>
      <span className="ah-segment-thumb" aria-hidden="true" />
      {options.map(({ title, short }, index) => (
        <Press key={title} aria-label={title} aria-pressed={index === selected} onClick={() => onChange(index)}>
          {short ?? title}
        </Press>
      ))}
    </div>
  );
}

type ChartPoint = readonly [number, number];

function smoothPath(points: readonly ChartPoint[]) {
  const [first] = points;
  let path = `M${first[0]} ${first[1]}`;
  points.slice(1).forEach(([x, y], index) => {
    const [px, py] = points[index];
    const [bx, by] = points[Math.max(0, index - 1)];
    const [nx, ny] = points[Math.min(points.length - 1, index + 2)];
    path += `C${px + (x - bx) / 6} ${py + (y - by) / 6} ${x - (nx - px) / 6} ${y - (ny - py) / 6} ${x} ${y}`;
  });
  return path;
}

const periods = [{ title: 'Week', short: 'W' }, { title: 'Month', short: 'M' }, { title: 'Year', short: 'Y' }];
const revenueData = [
  { change: 12.4, selected: 4, labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], names: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], amounts: [5860, 6390, 7090, 6210, 8900, 7610, 6155] },
  { change: 8.1, selected: 4, labels: ['W1', 'W2', 'W3', 'W4', 'W5'], names: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5 (in progress)'], amounts: [38400, 41500, 47740, 44300, 15000] },
  { change: 18.1, selected: 5, labels: ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'], names: ['January–February', 'March–April', 'May–June', 'July–August', 'September–October', 'November–December'], amounts: [72430, 103625, 93185, 110460, 117908, 140912] },
];

export function RevenueWidget() {
  const [period, setPeriod] = useState(0);
  const [active, setActive] = useState(revenueData[0].selected);
  const hasChangedPeriod = useRef(false);
  const transition = useTransition(0.27);
  const draw = hasChangedPeriod.current && transition.duration > 0;
  const data = revenueData[period];
  const label = data.names[active];
  const compactLabel = period === 2 ? label.split('–').map(month => month.slice(0, 3)).join('–') : label.replace(' (in progress)', '');
  const max = Math.max(...data.amounts);
  const span = 336 / data.amounts.length;
  const points = data.amounts.map((value, index) => [span * (index + 0.5), 178 - (value / max) * 152] as const);
  const curve = smoothPath(points);
  const selectPeriod = (index: number) => {
    if (index === period) return;
    hasChangedPeriod.current = true;
    setPeriod(index);
    setActive(revenueData[index].selected);
  };

  return (
    <WidgetCard className="ah-revenue-card" title="Revenue" icon="trending-up" aside={<Segments label="Revenue period" options={periods} selected={period} onChange={selectPeriod} />}>
      <motion.div key={period} className="ah-value-row ah-revenue-total" initial={draw ? { opacity: 0.5, y: 4 } : false}
        animate={{ opacity: 1, y: 0 }} transition={transition}>
        <span className="bw-value ah-revenue-value">{money.format(data.amounts.reduce((sum, value) => sum + value, 0))}</span>
        <span className="ah-positive"><Icon name="arrow-up-right" size={11} />{decimals.format(data.change)}%</span>
      </motion.div>
      <div className="bw-muted ah-revenue-caption">
        <span className="ah-revenue-caption-long">{label}</span><span className="ah-revenue-caption-short">{compactLabel}</span> · {compactMoney.format(data.amounts[active]).toLocaleLowerCase('en-US')}
      </div>
      <div className="ah-revenue-chart">
        <div className="ah-revenue-plot">
          <svg viewBox="0 0 336 178" preserveAspectRatio="none" aria-hidden="true" className="ah-fill-svg">
            <g className="ah-chart-fade">
              <path d="M0 92h336M0 135h336" stroke="white" strokeOpacity=".14" strokeDasharray=".7 5" />
            </g>
            {points.map(([x, y], index) => (
              <motion.rect key={`${period}-${index}`} x={x - 15} y={y} height={178 - y} width="30" rx="15"
                style={{ transformBox: 'fill-box', originX: '50%', originY: '100%' }} initial={draw ? { scaleY: 0.15 } : false}
                animate={{ scaleY: 1, opacity: active === index ? 1 : 0.17 }}
                transition={{ opacity: transition, scaleY: { ...transition, delay: transition.duration * index * 0.065 } }} fill="white" />
            ))}
            <motion.path d={curve} initial={draw ? { opacity: 0.18 } : false} animate={{ opacity: 0.55 }}
              transition={transition} key={`curve-${period}`} fill="none" stroke="white" strokeWidth="1.35" vectorEffect="non-scaling-stroke" />
          </svg>
          <motion.span className="ah-revenue-marker" aria-hidden="true" initial={false} transition={transition}
            animate={{ left: `${points[active][0] / 3.36}%`, top: `${(points[active][1] - 13.5) / 1.78}%` }} />
          <div className="ah-plot-targets" role="group" aria-label="Revenue by period" onKeyDown={moveSelection}
            style={{ gridTemplateColumns: `repeat(${points.length}, 1fr)` }}>
            {data.names.map((name, index) => (
              <Press key={name} aria-label={`${name}, ${money.format(data.amounts[index])}`} aria-pressed={active === index}
                tabIndex={active === index ? 0 : -1} {...inspect(() => setActive(index))} />
            ))}
          </div>
        </div>
        <div className="ah-plot-labels" aria-hidden="true">
          {data.labels.map((label, index) => <span key={index}>{label}</span>)}
        </div>
      </div>
    </WidgetCard>
  );
}

const userHistory = [1, 2, 3, 2, 3, 3, 3, 4, 3, 4, 4, 4, 4, 4];
const userVariation = [0, 8, -4, 12, 20, 13, -11, 2, 16, -6];

export function UsersWidget() {
  const [running, setRunning] = useState(true);
  const { paused } = useWidgetSettings();
  const tick = usePulse(1350, running);
  const live = running && !paused;
  const active = 1300 + userVariation[tick % userVariation.length];
  const transition = useTransition();
  const columns = userHistory.map((height, index) => {
    const count = clamp(height + (tick > 0 && index > 8 ? (tick + index) % 3 - 1 : 0), 1, 5);
    const latest = index === userHistory.length - 1;
    return Array.from({ length: 5 }, (_, step) => (
      <motion.rect key={`${index}-${step}`} x={index * 10.6} y={23 - step * 4.8} width="6.2" height="2.9" rx="1.25"
        fill={latest ? accent : 'white'} initial={false} animate={{ opacity: step < count ? (latest ? 1 : 0.28 + index / 25) : 0 }} transition={transition} />
    ));
  });
  return (
    <WidgetCard title="Users" icon="users" aside={
      <Press className="ah-live" aria-label={running ? 'Pause live users' : 'Resume live users'} aria-pressed={running} onClick={() => setRunning((value) => !value)}>
        <span className="ah-live-dot" data-live={live} />{live ? 'Live' : 'Paused'}
      </Press>
    }>
      <div className="ah-user-value"><DotNumber value={integers.format(active)} size={30} /><div className="bw-muted">active now</div></div>
      <svg viewBox="0 0 146 26" preserveAspectRatio="none" className="ah-user-chart" aria-hidden="true">
        <g className="ah-chart-fade">{columns.slice(0, -1)}</g>
        {columns.at(-1)}
      </svg>
    </WidgetCard>
  );
}

const funnel = [{ title: 'Visits', value: 24810 }, { title: 'Cart', value: 6204 }, { title: 'Checkout', value: 2977 }, { title: 'Purchase', value: 1861 }];

export function FunnelWidget() {
  const [selected, select] = useState(3);
  const ratio = (funnel[selected].value / funnel[0].value) * 100;
  return (
    <WidgetCard title={<><span className="ah-funnel-title-long">Conversion funnel</span><span className="ah-funnel-title-short">Funnel</span></>}
      icon="filter" aside={<span className="bw-muted">{selected === 3 ? 'Conv.' : funnel[selected].title} {decimals.format(ratio)}%</span>}>
      <div className="ah-funnel" role="group" aria-label="Funnel stages" onKeyDown={moveSelection}>
        {funnel.map(({ title, value }, index) => (
          <Press className="ah-funnel-row" key={title} aria-pressed={selected === index} tabIndex={selected === index ? 0 : -1}
            {...inspect(() => select(index))}>
            <span>{title}</span>
            <span className="ah-funnel-track"><span style={{ width: `${(value / funnel[0].value) * 100}%` }} /></span>
            <span>{integers.format(value)}</span>
          </Press>
        ))}
      </div>
    </WidgetCard>
  );
}

const channels = [
  { title: 'Organic', value: 41.6, color: '#fff' },
  { title: 'Direct', value: 26.3, color: '#e5f261' },
  { title: 'Social', value: 19.8, color: '#f58ab7' },
  { title: 'Referral', value: 12.3, color: '#9cb2ff' },
];

export function TrafficWidget() {
  const [selected, select] = useState(0);
  const transition = useTransition();
  const channel = channels[selected];
  return (
    <WidgetCard title="Traffic sources" icon="globe">
      <div className="ah-traffic">
        <div className="ah-donut" aria-label={`${channel.title} ${channel.value}%`}>
          <svg viewBox="0 0 96 96" aria-hidden="true" className="ah-fill-svg">
            <g className="ah-chart-fade"><circle cx="48" cy="48" r="40" fill="none" stroke="white" strokeOpacity=".06" strokeWidth="8" /></g>
            {channels.map(({ title, value, color }, index) => {
              const circumference = Math.PI * 80;
              const offset = channels.slice(0, index).reduce((sum, item) => sum + item.value, 0);
              return <motion.circle key={title} cx="48" cy="48" r="40" fill="none" stroke={color}
                strokeDasharray={`${circumference * (value - 1.4) / 100} ${circumference}`} strokeLinecap="round"
                strokeDashoffset={-circumference * offset / 100} transform="rotate(-90 48 48)" initial={false}
                animate={{ opacity: index === selected ? 1 : 0.55, strokeWidth: index === selected ? 11 : 7 }} transition={transition} />;
            })}
          </svg>
          <div className="ah-donut-caption"><strong>{channel.value}%</strong><small>{channel.title}</small></div>
        </div>
        <div className="ah-traffic-list" role="group" aria-label="Traffic sources" onKeyDown={moveSelection}>
          {channels.map(({ title, value, color }, index) => (
            <Press key={title} aria-label={`${title} ${value}%`} aria-pressed={selected === index} tabIndex={selected === index ? 0 : -1} {...inspect(() => select(index))}>
              <i style={{ background: color }} /><span>{title}</span><span>{value}%</span>
            </Press>
          ))}
        </div>
      </div>
    </WidgetCard>
  );
}

function polar(cx: number, cy: number, radius: number, degrees: number) {
  const angle = (degrees * Math.PI) / 180;
  return [cx + Math.sin(angle) * radius, cy - Math.cos(angle) * radius] as const;
}

export function GoalWidget() {
  const [value, setValue] = useState(78);
  const { duration, ease } = useTransition();
  const gradient = useId();
  const arc = 'M16 104a84 84 0 0 1 168 0';
  const progress = useMotionValue(value);
  const arcLength = useTransform(progress, (next) => next / 100);
  const arcOpacity = useTransform(progress, (next) => Number(next > 0));
  const knobX = useTransform(progress, (next) => polar(100, 104, 84, -90 + next * 1.8)[0]);
  const knobY = useTransform(progress, (next) => polar(100, 104, 84, -90 + next * 1.8)[1]);

  useEffect(() => {
    if (duration === 0) {
      progress.set(value);
      return;
    }
    const tween = animate(progress, value, { duration, ease });
    return () => tween.stop();
  }, [duration, ease, progress, value]);

  return (
    <WidgetCard title="Monthly goal" icon="target" aside={<span className="bw-muted">{money.format(value * 620)} of {money.format(62000)}</span>}>
      <div className="ah-goal">
        <svg viewBox="0 0 200 111" aria-hidden="true" className="ah-goal-svg">
          <defs><linearGradient id={gradient} gradientUnits="userSpaceOnUse" x1="16" x2="172" y1="0" y2="0"><stop stopColor="#3977f4" /><stop offset=".53" stopColor="#84d4f9" /><stop offset=".76" stopColor="#ffc669" /><stop offset="1" stopColor="#ff713e" /></linearGradient></defs>
          <g className="ah-chart-fade"><path d={arc} fill="none" stroke="white" strokeOpacity=".12" strokeWidth="22" strokeLinecap="round" /></g>
          <motion.path d={arc} fill="none" stroke={`url(#${gradient})`} strokeWidth="22" strokeLinecap="round" pathLength={arcLength} opacity={arcOpacity} />
          <motion.circle cx={knobX} cy={knobY} r="13" fill="white" />
        </svg>
        <div className="ah-goal-value"><DotNumber value={`${value}%`} size={27} /></div>
        <ScrubRange value={value} max={100} label="Monthly goal progress" valueText={`${value}%`} onValue={setValue}
          pointerValue={(x, y) => 0.5 + Math.atan2((x - 0.5) * 200, 104 - y * 111) / Math.PI} />
      </div>
    </WidgetCard>
  );
}

const cohorts = [
  { month: 'Jun', rates: [100, 81, 72, 66, 58, 47, 40, 34] },
  { month: 'Jul', rates: [100, 75, 68, 59, 51, 40, 35] },
  { month: 'Aug', rates: [100, 79, 64, 56, 49, 39] },
  { month: 'Sep', rates: [100, 74, 55, 48, 42] },
  { month: 'Oct', rates: [100, 84, 68, 51] },
];

export function RetentionWidget() {
  const [selected, select] = useState({ row: 3, column: 2 });
  const moveCohort = (event: KeyboardEvent<HTMLDivElement>) => {
    const cell = event.target as HTMLButtonElement;
    const row = Number(cell.dataset.row);
    const column = Number(cell.dataset.column);
    if (!Number.isInteger(row) || !Number.isInteger(column)) return;
    const offsets: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1], Home: [0, -8], End: [0, 8] };
    const offset = offsets[event.key];
    if (!offset) return;
    event.preventDefault();
    const nextRow = clamp(row + offset[0], 0, cohorts.length - 1);
    const nextColumn = clamp(column + offset[1], 0, cohorts[nextRow].rates.length - 1);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-row="${nextRow}"][data-column="${nextColumn}"]`)?.focus();
  };
  return (
    <WidgetCard title="Retention" icon="grid-3x3" aside={<span className="bw-muted">{cohorts[selected.row].month} · week {selected.column} · <strong>{cohorts[selected.row].rates[selected.column]}%</strong></span>}>
      <div className="ah-retention" role="group" aria-label="Retention by cohort and week" onKeyDown={moveCohort}>
        {cohorts.map(({ month, rates }, row) => (
          <div key={month} className="ah-retention-row"><span aria-hidden="true">{month}</span>
            {Array.from({ length: 8 }, (_, column) => {
              const rate = rates[column];
              if (rate === undefined) return <span className="ah-cohort-empty" aria-hidden="true" key={column} />;
              const active = selected.row === row && selected.column === column;
              return <Press key={column} className="ah-cohort" aria-label={`${month}, week ${column}, ${rate}%`}
                aria-pressed={active} tabIndex={active ? 0 : -1} data-row={row} data-column={column}
                style={{ '--ah-cell-alpha': rate / 100 } as CSSProperties} {...inspect(() => select({ row, column }))} />;
            })}
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}

const climateModes = [{ title: 'Cool' }, { title: 'Auto' }, { title: 'Heat' }];
const climateCaptions = ['Cooling to', 'Hold at', 'Heating to'];
const temperatureAngle = (temperature: number) => -135 + ((temperature - 16) / 14) * 270;

export function ThermostatWidget() {
  const [temperature, setTemperature] = useState(24);
  const [mode, setMode] = useState(1);
  const [fan, setFan] = useState(true);
  const [dragAngle, setDragAngle] = useState<number | null>(null);
  const transition = useTransition();
  const angle = dragAngle ?? temperatureAngle(temperature);
  const dialTransition = dragAngle === null ? transition : { duration: 0 };
  const pointerValue = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - bounds.left - bounds.width / 2;
    const dy = event.clientY - bounds.top - bounds.height / 2;
    if (Math.hypot(dx, dy) < bounds.width * .065) return;
    const pointerAngle = clamp(Math.atan2(dx, -dy) * 180 / Math.PI, -135, 135);
    setDragAngle(pointerAngle);
    setTemperature(Math.round(16 + ((pointerAngle + 135) / 270) * 14));
  };
  const keyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    const changes: Record<string, number> = { ArrowLeft: temperature - 1, ArrowDown: temperature - 1, ArrowRight: temperature + 1, ArrowUp: temperature + 1, PageDown: temperature - 2, PageUp: temperature + 2, Home: 16, End: 30 };
    const value = changes[event.key];
    if (value === undefined) return;
    event.preventDefault();
    setTemperature(clamp(value, 16, 30));
  };
  return (
    <WidgetCard className="ah-climate-card" title="Climate · Living room" icon="thermometer" aside={<Segments label="Climate mode" options={climateModes} selected={mode} onChange={setMode} />}>
      <div className="ah-climate-main">
        <div className="ah-dial" role="slider" tabIndex={0} aria-label="Target temperature" aria-valuemin={16} aria-valuemax={30} aria-valuenow={temperature} aria-valuetext={`${temperature} °C`}
          onKeyDown={keyboard} onPointerDown={(event) => {
            if (event.button !== 0 || !event.isPrimary) return;
            event.currentTarget.focus({ preventScroll: true });
            event.currentTarget.setPointerCapture(event.pointerId);
            pointerValue(event);
          }} onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) pointerValue(event);
          }} onLostPointerCapture={() => setDragAngle(null)}>
          <svg viewBox="0 0 224 224" aria-hidden="true" className="ah-fill-svg">
            <circle cx="112" cy="112" r="78" fill="#000" fillOpacity=".32" stroke="white" strokeOpacity=".10" />
            {Array.from({ length: 55 }, (_, index) => {
              const tickAngle = -135 + (index / 54) * 270;
              const [tx1, ty1] = polar(112, 112, 94, tickAngle);
              const [tx2, ty2] = polar(112, 112, 108, tickAngle);
              return <motion.line key={index} x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke="white" strokeWidth={tickAngle <= angle ? 2.2 : 1.55} strokeLinecap="round"
                initial={false} animate={{ opacity: tickAngle <= angle ? 1 : 0.22 }} transition={dialTransition} />;
            })}
            <motion.g style={{ transformBox: 'view-box', transformOrigin: '50% 50%' }} initial={false} animate={{ rotate: angle }} transition={dialTransition}>
              <circle cx="112" cy="10" r="13" fill="white" opacity=".19" />
              <circle cx="112" cy="10" r="9" fill="white" />
            </motion.g>
          </svg>
          <div className="ah-dial-caption" aria-hidden="true"><small>{climateCaptions[mode]}</small><div className="ah-value-row"><DotNumber value={temperature} size={42} /><span>°C</span></div><small>Drag to adjust</small></div>
        </div>
      </div>
      <div className="ah-bottom"><div className="ah-climate-readouts"><span><small>Indoor</small>26.4°</span><span><small>Humidity</small>54%</span></div><Press className="bw-action ah-fan" icon="fan" bright={fan} aria-pressed={fan} onClick={() => setFan((current) => !current)}>Fan</Press></div>
    </WidgetCard>
  );
}

export function LightsWidget() {
  const [brightness, setBrightness] = useState(68);
  const [on, setOn] = useState(true);
  const transition = useTransition();
  const level = on ? brightness : 0;
  return (
    <WidgetCard className="ah-light-card" title="Lights" icon="lightbulb" aside={<Press role="switch" aria-label="Lights" aria-checked={on} className="ah-switch" onClick={() => setOn((current) => !current)}><span /></Press>}>
      <div className="ah-lights">
        <div className="ah-value-row"><DotNumber value={level} size={37} /><span className="bw-muted">%</span></div>
        <div className="ah-light-track" data-on={on}>
          <motion.div initial={false} animate={{ width: `${level}%` }} transition={transition} />
          <ScrubRange value={level} max={100} label="Light brightness" valueText={`${level}%`} onValue={(next) => {
            if (next > 0) setBrightness(next);
            setOn(next > 0);
          }} />
        </div>
      </div>
    </WidgetCard>
  );
}

const energyData = [0.67, 0.53, 0.39, 0.39, 0.46, 0.8, 1.5, 2.13, 1.78, 1.29, 1.08, 1.22, 1.5, 1.36, 1.22, 1.29, 1.71, 2.27, 2.89, 3.1, 2.54, 1.92, 1.29, 0.87];
const energyValue = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const energyBars = energyData.map((amount, index) => {
  const height = (amount + 0.17) / 0.0696;
  return { x: index * (140 / 23), y: 53 - height, height };
});

export function EnergyWidget() {
  const [hour, setHour] = useState(19);
  const transition = useTransition();
  return (
    <WidgetCard title="Energy" icon="zap" aside={<span className="bw-muted">{clockFormat.format(hour)}:00</span>}>
      <div className="ah-energy">
        <div className="ah-value-row"><DotNumber value={energyValue.format(energyData[hour])} size={30} /><span className="bw-muted">kWh</span></div>
        <div className="ah-energy-plot">
          <svg viewBox="0 0 144 53" className="ah-fill-svg" preserveAspectRatio="none" aria-hidden="true">
            <g className="ah-chart-fade">
              {energyBars.map(bar => <rect key={bar.x} {...bar} width="4" rx="1.8" fill="white" fillOpacity=".36" />)}
            </g>
            <motion.rect initial={false} animate={energyBars[hour]} transition={transition} width="4" rx="1.8" fill={accent} />
          </svg>
          <ScrubRange hover value={hour} max={23} label="Energy usage by hour" valueText={`${clockFormat.format(hour)}:00, ${energyValue.format(energyData[hour])} kilowatt hours`}
            onValue={setHour} />
        </div>
        <div className="bw-muted">Today {energyValue.format(energyData.reduce((sum, amount) => sum + amount, 0))} kWh · −11%</div>
      </div>
    </WidgetCard>
  );
}

const defaultTimer = 16 * 60;
const timerTicks = [...Array<number>(42).fill(8), 11, 14, 18, 21, 24, 38];

export function TimerWidget() {
  const [seconds, setSeconds] = useState(defaultTimer);
  const [total, setTotal] = useState(defaultTimer);
  const [running, setRunning] = useState(false);
  const { paused, speed } = useWidgetSettings();
  const active = running && seconds > 0;
  const transition = useTransition();

  useEffect(() => {
    if (!active || paused) return;
    const timer = window.setInterval(() => setSeconds((time) => Math.max(0, time - 1)), 1000 / Math.max(speed, 0.05));
    return () => window.clearInterval(timer);
  }, [active, paused, speed]);

  const adjust = (amount: number) => {
    const next = clamp(seconds + amount, 0, 99 * 60 + 59);
    setSeconds(next);
    if (!active || next > total) setTotal(next);
    if (next === 0) setRunning(false);
  };
  const reset = () => {
    setRunning(false);
    setTotal(defaultTimer);
    setSeconds(defaultTimer);
  };
  const toggle = () => {
    if (seconds === 0) {
      setSeconds(total || defaultTimer);
      if (!total) setTotal(defaultTimer);
    }
    setRunning(!active);
  };
  const progress = total > 0 ? clamp(seconds / total, 0, 1) : 0;
  const playhead = progress * (timerTicks.length - 1);
  const before = Math.floor(playhead);
  const after = Math.min(before + 1, timerTicks.length - 1);
  const markerHeight = timerTicks[before] + (timerTicks[after] - timerTicks[before]) * (playhead - before);
  return (
    <WidgetCard className="ah-timer-card" title="Timer" icon="timer" aside={<span className="bw-muted" role="status">{seconds === 0 ? 'Done' : active && !paused ? 'Running' : 'Paused'}</span>}>
      <div className="ah-timer-main">
        <div role="timer"><DotNumber value={durationDigits(seconds)} size={36} /></div>
        <div className="ah-controls">
          <Press icon="minus" aria-label="Remove one minute" onClick={() => adjust(-60)} />
          <Press icon="plus" aria-label="Add one minute" onClick={() => adjust(60)} />
          <Press icon="rotate-ccw" aria-label="Reset timer" onClick={reset} />
          <Press icon={active ? 'pause' : 'play'} bright aria-label={active ? 'Pause timer' : 'Start timer'} onClick={toggle} />
        </div>
      </div>
      <svg viewBox="0 0 336 40" preserveAspectRatio="none" className="ah-timer-chart" aria-hidden="true">
        <g className="ah-chart-fade">
          {timerTicks.map((height, index) => (
            <motion.rect key={index} x={index * (334 / 47)} y={40 - height} width="1.55" height={height} rx=".775" fill="white"
              initial={false} animate={{ opacity: index <= playhead ? 0.68 : 0.2 }} transition={transition} />
          ))}
        </g>
        <motion.rect width="2" rx="1" fill={accent} initial={false} transition={transition}
          animate={{ x: playhead * (334 / 47), y: 40 - markerHeight, height: markerHeight }} />
      </svg>
    </WidgetCard>
  );
}

export function LockWidget() {
  const [locked, setLocked] = useState(true);
  const [holding, setHolding] = useState(false);
  const hold = useRef<number | null>(null);
  const hasToggled = useRef(false);
  const { speed } = useWidgetSettings();
  const transition = useTransition(0.2);
  const holdSeconds = 0.82 / Math.max(0.05, speed);

  useEffect(() => () => { if (hold.current !== null) window.clearTimeout(hold.current); }, []);

  const cancel = () => {
    if (hold.current !== null) window.clearTimeout(hold.current);
    hold.current = null;
    setHolding(false);
  };
  const toggle = () => {
    hasToggled.current = true;
    setLocked((value) => !value);
  };
  const start = () => {
    if (hold.current !== null) return;
    setHolding(true);
    hold.current = window.setTimeout(() => {
      hold.current = null;
      setHolding(false);
      toggle();
    }, holdSeconds * 1000);
  };
  return (
    <WidgetCard title="Front door">
      <div className="ah-lock">
        <Press className="ah-lock-press" data-holding={holding} aria-label={locked ? 'Hold to unlock front door' : 'Hold to lock front door'} aria-pressed={!locked}
          onPointerDown={(event) => {
            if (event.button !== 0 || !event.isPrimary) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            start();
          }} onPointerMove={(event) => {
            if (hold.current === null || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
            const { left, right, top, bottom } = event.currentTarget.getBoundingClientRect();
            if (event.clientX < left - 8 || event.clientX > right + 8 || event.clientY < top - 8 || event.clientY > bottom + 8) cancel();
          }} onPointerUp={cancel} onPointerCancel={cancel} onLostPointerCapture={cancel} onBlur={cancel}
          onKeyDown={(event) => {
            if (event.key === 'Escape') cancel();
            if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); if (!event.repeat) start(); }
          }} onKeyUp={(event) => {
            if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); cancel(); }
          }} onClick={(event) => { if (event.detail === 0) toggle(); }}>
          <motion.span className="ah-lock-icon" key={String(locked)} initial={hasToggled.current ? { opacity: 0.4, y: 3, scale: 0.88 } : false}
            animate={{ opacity: 1, y: 0, scale: 1 }} transition={transition}>
            <Icon name={locked ? 'lock' : 'lock-open'} size={24} />
          </motion.span>
          <svg viewBox="0 0 60 60" aria-hidden="true" className="ah-fill-svg">
            <motion.circle cx="30" cy="30" r="28" fill="none" stroke={accent} strokeWidth="1.8" strokeLinecap="round" transform="rotate(-90 30 30)"
              initial={false} animate={{ pathLength: holding ? 1 : 0, opacity: holding ? 1 : 0 }}
              transition={{ pathLength: { duration: holding && transition.duration > 0 ? holdSeconds : 0, ease: 'linear' }, opacity: { duration: transition.duration * 0.5 } }} />
          </svg>
        </Press>
        <div role="status">{locked ? 'Locked' : 'Unlocked'}</div>
        <div className="bw-muted">{holding ? (locked ? 'Unlocking…' : 'Locking…') : (locked ? 'Hold to unlock' : 'Hold to lock')}</div>
      </div>
    </WidgetCard>
  );
}

const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', timeZone: 'America/Caracas' });

export function ClockWidget() {
  const [digital, setDigital] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const { paused } = useWidgetSettings();
  const transition = useTransition(0.19);
  const anchor = useRef({ now, time: timeFormat.format(now).split(':').map(Number) });
  const lastUpdate = useRef(now);
  useEffect(() => {
    if (paused) return;
    const sync = () => setNow(Date.now());
    sync();
    const timer = window.setInterval(sync, 1000);
    return () => window.clearInterval(timer);
  }, [paused]);
  useEffect(() => { lastUpdate.current = now; }, [now]);

  const display = timeFormat.format(now);
  const [hour, minute, second] = anchor.current.time;
  const elapsed = Math.floor(now / 1000) - Math.floor(anchor.current.now / 1000);
  const minuteProgress = minute + (second + elapsed) / 60;
  const handTransition = Math.abs(now - lastUpdate.current) > 2000 ? { duration: 0 } : transition;
  const hand = (angle: number, length: number, color: string, width: number) => (
    <motion.line x1="50" y1="50" x2="50" y2={50 - length} stroke={color} strokeWidth={width} strokeLinecap="round"
      style={{ transformBox: 'view-box', transformOrigin: '50% 50%' }} initial={false} animate={{ rotate: angle }} transition={handTransition} />
  );
  return (
    <WidgetCard title="Local time" icon="clock">
      <Press className="ah-clock-face" aria-label={`${display.slice(0, 5)}, show ${digital ? 'analog' : 'digital'} clock`} onClick={() => setDigital((current) => !current)}>
        <motion.span className="ah-clock-dial" key={String(digital)} initial={digital ? { opacity: 0.4, scale: 0.94 } : false}
          animate={{ opacity: 1, scale: 1 }} transition={transition}>
          {digital ? <DotNumber value={display.slice(0, 5)} size={27} /> : (
            <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="48" fill="black" fillOpacity=".54" />
            {Array.from({ length: 60 }, (_, index) => {
              const [x, y] = polar(50, 50, 45, index * 6);
              return <circle key={index} cx={x} cy={y} r={index % 5 === 0 ? 1.45 : 0.45} fill="white" opacity={index % 5 === 0 ? 0.95 : 0.52} />;
            })}
            {hand((hour % 12) * 30 + minuteProgress / 2, 24, 'white', 2.8)}
            {hand(minuteProgress * 6, 36, 'white', 1.9)}
            {hand((second + elapsed) * 6, 39, accent, 0.95)}
            <circle cx="50" cy="50" r="2.3" fill={accent} />
            </svg>
          )}
        </motion.span>
      </Press>
      <div className="bw-muted ah-clock-foot">Caracas · UTC−4</div>
    </WidgetCard>
  );
}

const week = [
  { name: 'Monday', short: 'M', events: [['09:30', 'Design sync']] },
  { name: 'Tuesday', short: 'T', events: [['10:00', 'Widget kit review'], ['15:30', 'Client call']] },
  { name: 'Wednesday', short: 'W', events: [['11:15', 'Prototype review']] },
  { name: 'Thursday', short: 'T', events: [] },
  { name: 'Friday', short: 'F', events: [['14:00', 'Sprint planning']] },
  { name: 'Saturday', short: 'S', events: [['10:30', 'Studio time']] },
  { name: 'Sunday', short: 'S', events: [] },
];

export function CalendarWidget() {
  const [day, select] = useState(1);
  const transition = useTransition(0.19);
  const events = week[day].events;
  const eventLabel = new Intl.PluralRules('en-US').select(events.length) === 'one' ? 'event' : 'events';
  return (
    <WidgetCard title="November 2026" icon="calendar" aside={<span className="bw-muted">{events.length} {eventLabel}</span>}>
      <div className="ah-week" role="group" aria-label="November 9 to 15, 2026" onKeyDown={(event) => moveSelection(event, select)}>
        {week.map(({ name, short, events: entries }, index) => (
          <Press key={name} aria-label={`${name}, November ${9 + index}`} aria-pressed={index === day} tabIndex={index === day ? 0 : -1} onClick={() => select(index)}>
            <span>{short}</span>{entries.length > 0 && <i aria-hidden="true" />}
          </Press>
        ))}
      </div>
      <motion.div key={day} className="ah-agenda" initial={{ opacity: 0.45, y: 3 }} animate={{ opacity: 1, y: 0 }} transition={transition} aria-live="polite">
        {events.length ? events.map(([time, event]) => <div key={time}><time>{time}</time><span>{event}</span></div>) : <span className="bw-muted">No events</span>}
      </motion.div>
    </WidgetCard>
  );
}

const tasks = [
  { title: 'Send revised proposal', compact: 'Send proposal' },
  { title: 'Pay the hosting invoice', compact: 'Pay hosting' },
  { title: 'Buy coffee beans', compact: 'Buy coffee beans' },
  { title: 'Call the dentist', compact: 'Call the dentist' },
];

export function RemindersWidget() {
  const [completed, setCompleted] = useState([false, false, true, false]);
  const transition = useTransition();
  const count = completed.filter(Boolean).length;
  return (
    <WidgetCard title="Reminders" icon="list-checks" aside={
      <span className="ah-reminder-status bw-muted" role="status">
        <svg viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="6.7" fill="none" stroke="white" strokeOpacity=".22" strokeWidth="2" />
          <motion.circle cx="9" cy="9" r="6.7" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" transform="rotate(-90 9 9)"
            initial={false} animate={{ pathLength: count / tasks.length, opacity: count > 0 ? 1 : 0 }} transition={transition} /></svg>
        {count} of 4
      </span>
    }>
      <div className="ah-reminders" role="group" aria-label="Reminder checklist">
        {tasks.map(({ title, compact }, index) => (
          <Press key={title} role="checkbox" aria-label={title} aria-checked={completed[index]} onClick={() => setCompleted((previous) => previous.map((done, at) => at === index ? !done : done))}>
            <span className="ah-check"><Icon name="check" size={11} /></span><span className="ah-task">
              <span className="ah-task-long">{title}</span><span className="ah-task-short">{compact}</span>
            </span>
          </Press>
        ))}
      </div>
    </WidgetCard>
  );
}

const amplitudes = [7, 19, 22, 22, 17, 16, 21, 22, 17, 14, 17, 24, 22, 12, 12, 21, 19, 15, 7, 17, 20, 18, 15, 17, 22, 23, 15, 12, 17, 21, 23, 11, 17, 19, 21, 21, 14, 18, 25, 18];

export function MusicWidget() {
  const [trackIndex, setTrack] = useState(0);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState<number>(musicTracks[0].duration);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const sourceRef = useRef<HTMLSpanElement>(null);
  const pendingSeek = useRef<number | null>(null);
  const { paused, speed, reducedMotion } = useWidgetSettings();
  const track = musicTracks[trackIndex];
  const active = playing && !paused;
  const transition = useTransition(0.18);
  const playbackSpeed = Math.max(0.25, speed);
  const playbackProgress = position / duration;
  const playhead = clamp(Math.floor(playbackProgress * amplitudes.length), 0, amplitudes.length - 1);
  const playheadHeight = amplitudes[playhead];

  useEffect(() => {
    const audio = audioRef.current;
    return () => audio?.pause();
  }, []);

  useEffect(() => {
    if (paused) audioRef.current?.pause();
  }, [paused]);

  function prepare(index: number) {
    const audio = audioRef.current!;
    const source = sourceRef.current!;
    source.dataset.track = String(index);
    // Resolve against the bundled stylesheet, including when Vite prebundles the JS.
    // The hidden source does not fetch media; the audio element makes the request.
    const src = getComputedStyle(source).backgroundImage.match(/^url\("(.*)"\)$/)?.[1];
    if (!src) { setFailed(true); return; }
    if (audio.src !== src || audio.error) audio.src = src;
    return audio;
  }

  function play(audio: HTMLAudioElement) {
    setFailed(false);
    void audio.play().catch(error => {
      if (error.name !== 'AbortError') setFailed(true);
    });
  }

  function toggle() {
    const audio = prepare(trackIndex);
    if (!audio) return;
    if (!audio.paused) audio.pause();
    else if (!paused) play(audio);
  }

  function seek(time: number) {
    const audio = prepare(trackIndex);
    if (!audio) return;
    setPosition(time);
    if (audio.readyState >= 1) audio.currentTime = time;
    else {
      const firstSeek = pendingSeek.current === null;
      pendingSeek.current = time;
      if (firstSeek) { audio.preload = 'metadata'; audio.load(); }
    }
  }

  function skip(direction: number, continuePlaying = active) {
    const next = (trackIndex + direction + musicTracks.length) % musicTracks.length;
    pendingSeek.current = null;
    setFailed(false);
    setPlaying(false);
    setTrack(next);
    setPosition(0);
    setDuration(musicTracks[next].duration);
    const audio = prepare(next);
    if (!audio) return;
    audio.preload = 'none';
    if (continuePlaying && !paused) play(audio);
  }

  return (
    <WidgetCard className="ah-music-card" title="Now playing" aside={<span className="bw-muted">{trackIndex + 1} / {musicTracks.length}</span>}>
      <span hidden ref={sourceRef} className="ah-audio-source" />
      <audio ref={audioRef} preload="none"
        onLoadedMetadata={event => {
          const audio = event.currentTarget;
          if (!Number.isFinite(audio.duration)) return;
          setDuration(Math.ceil(audio.duration));
          if (pendingSeek.current !== null) {
            audio.currentTime = Math.min(audio.duration, pendingSeek.current);
            pendingSeek.current = null;
          }
        }}
        onTimeUpdate={event => setPosition(Math.floor(event.currentTarget.currentTime))}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onError={() => { setFailed(true); setPlaying(false); }}
        onEnded={() => skip(1, true)} />
      <div className="ah-song">
        <div className="ah-record" aria-hidden="true">
          <AnimatePresence initial={false}>
            <motion.div className="ah-cover" key={track.title}
              initial={{ opacity: 0, rotate: -12, scale: .92 }} animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, scale: .96 }} transition={transition}>
              <div className="ah-disc" data-track={trackIndex} data-spinning={active && !reducedMotion}
                style={{ '--ah-disc-period': `${12 / playbackSpeed}s` } as CSSProperties} />
            </motion.div>
          </AnimatePresence>
        </div>
        <motion.div className="ah-song-label" key={track.title} initial={trackIndex ? { opacity: 0.5, y: 3 } : false}
          animate={{ opacity: 1, y: 0 }} transition={transition}><div title={track.title}>{track.title}</div><span className="bw-muted" role={failed ? 'status' : undefined}>{failed ? 'Tap play to retry' : track.artist}</span></motion.div>
        <div className="ah-controls">
          <Press icon="skip-back" aria-label="Previous track" onClick={() => skip(-1)} />
          <Press icon={playing ? 'pause' : 'play'} bright aria-label={playing ? 'Pause track' : 'Play track'} onClick={toggle} />
          <Press icon="skip-forward" aria-label="Next track" onClick={() => skip(1)} />
        </div>
      </div>
      <div className="ah-wave" style={{ '--ah-note-period': `${0.45 / playbackSpeed}s` } as CSSProperties}>
        <svg viewBox="0 0 336 26" preserveAspectRatio="none" className="ah-fill-svg" aria-hidden="true">
          <g className="ah-chart-fade">
            {amplitudes.map((amount, index) => (
              <motion.rect key={index} x={index * (331 / 39)} y={(26 - amount) / 2} height={amount} width="5" rx="2.5" fill="white"
              className="ah-wave-bar" data-sounding={active && Math.abs(index - playbackProgress * (amplitudes.length - 1)) < 3}
              style={{ '--ah-beat-offset': `${index % 4 * -0.065}s` } as CSSProperties}
                initial={false} animate={{ opacity: index <= playhead ? 1 : 0.26 }} transition={transition} />
            ))}
          </g>
          <rect x={playhead * (331 / 39)} y={(26 - playheadHeight) / 2} height={playheadHeight} width="5" rx="2.5" fill="white"
            className="ah-wave-bar" data-sounding={active} style={{ '--ah-beat-offset': `${playhead % 4 * -0.065}s` } as CSSProperties} />
        </svg>
        <ScrubRange value={position} max={duration} label="Seek track" valueText={durationLabel(position)} onValue={seek} />
      </div>
      <div className="ah-bottom bw-muted"><span>{durationLabel(position)}</span><span>−{durationLabel(Math.max(0, duration - position))}</span></div>
    </WidgetCard>
  );
}

const assets = [
  { code: 'BTC', base: 66318, change: -3.05, history: [5, 8, 9, 6, 5, 9, 15, 19, 21, 23, 24, 25, 26, 25, 22, 17, 11, 7, 5, 7, 12, 17, 21, 24, 28, 29, 26, 24, 25, 28, 35, 40, 35, 28, 28, 31, 36, 42, 44, 44, 41, 34, 30, 27, 26, 25, 27, 30, 32] },
  { code: 'ETH', base: 3526, change: 2.81, history: [40, 33, 35, 27, 30, 24, 12, 20, 17, 26, 19, 9, 6, 10] },
];
const signedPercent = new Intl.NumberFormat('en-US', { style: 'percent', signDisplay: 'always', maximumFractionDigits: 2 });

export function StocksWidget() {
  const [assetIndex, select] = useState(0);
  const [at, setAt] = useState<number | null>(null);
  const hasSwitched = useRef(false);
  const asset = assets[assetIndex];
  const gradient = useId();
  const transition = useTransition(0.22);
  const points = asset.history.map((value, index) => [index * (144 / (asset.history.length - 1)), value] as const);
  const curve = smoothPath(points);
  const picked = at ?? points.length - 1;
  const price = Math.round(asset.base + (asset.history.at(-1)! - asset.history[picked]) * asset.base / 1600);
  return (
    <WidgetCard className="ah-stock-card" title={asset.code} aside={<Press className="ah-symbol" onClick={() => { hasSwitched.current = true; select(1 - assetIndex); setAt(null); }}
      aria-label={`Show ${assets[1 - assetIndex].code}`}>{assets[1 - assetIndex].code}<Icon name="chevron-right" size={10} /></Press>}>
      <motion.div key={asset.code} className="ah-price" initial={hasSwitched.current ? { opacity: 0.45, y: 3 } : false}
        animate={{ opacity: 1, y: 0 }} transition={transition}>
        <div className="bw-value">{money.format(price)}</div>
        <div className="bw-muted"><Icon name={asset.change > 0 ? 'arrow-up-right' : 'arrow-down-right'} size={12} />{signedPercent.format(asset.change / 100).replace(/^-/, '−')} · 24 h</div>
      </motion.div>
      <div className="ah-stock-plot">
        <svg viewBox="0 0 144 48" preserveAspectRatio="none" className="ah-fill-svg" aria-hidden="true">
          <defs>
            <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop stopColor="white" stopOpacity=".17"/><stop offset="1" stopColor="white" stopOpacity="0"/></linearGradient>
          </defs>
          <g className="ah-chart-fade"><path d={`${curve}L144 48H0Z`} fill={`url(#${gradient})`} /></g>
          <motion.path key={asset.code} d={curve} initial={hasSwitched.current ? { opacity: 0.38 } : false}
            animate={{ opacity: 1 }} transition={transition} stroke="white" strokeWidth="1.4" strokeLinecap="round" vectorEffect="non-scaling-stroke" fill="none" />
          {at !== null && <>
            <path d={`M${points[at][0]} 0V48`} stroke="white" strokeOpacity=".28" strokeDasharray="2 3" />
            <circle cx={points[at][0]} cy={points[at][1]} r="3" fill={accent} />
          </>}
        </svg>
        <ScrubRange hover value={picked} max={points.length - 1} label={`${asset.code} price history`} valueText={money.format(price)} onValue={setAt} />
      </div>
    </WidgetCard>
  );
}

export const analyticsHome: WidgetDefinition[] = [
  { id: 'revenue', title: 'Revenue', category: 'analytics', size: 'large', tone: 'violet', interaction: 'Switch periods or select a column to inspect revenue.', Component: RevenueWidget },
  { id: 'users', title: 'Live users', category: 'analytics', size: 'small', tone: 'graphite', interaction: 'Pause and resume the simulated user feed.', Component: UsersWidget },
  { id: 'funnel', title: 'Conversion funnel', category: 'analytics', size: 'wide', tone: 'indigo', interaction: 'Select a stage to see its conversion rate.', Component: FunnelWidget },
  { id: 'traffic', title: 'Traffic sources', category: 'analytics', size: 'wide', tone: 'rose', interaction: 'Select a source to highlight its share.', Component: TrafficWidget },
  { id: 'goal', title: 'Monthly goal', category: 'analytics', size: 'wide', tone: 'blue', interaction: 'Drag across the gauge or use the arrow keys to adjust demo progress.', Component: GoalWidget },
  { id: 'retention', title: 'Cohort retention', category: 'analytics', size: 'wide', tone: 'green', interaction: 'Select a cell to inspect a week in the cohort.', Component: RetentionWidget },
  { id: 'thermostat', title: 'Thermostat', category: 'home', size: 'large', tone: 'green', interaction: 'Drag the dial or use arrow keys to change the temperature. Change mode and toggle the fan.', Component: ThermostatWidget },
  { id: 'lights', title: 'Lights', category: 'home', size: 'small', tone: 'amber', interaction: 'Switch the light and drag the dimmer.', Component: LightsWidget },
  { id: 'energy', title: 'Energy', category: 'home', size: 'small', tone: 'blue', interaction: 'Scrub the chart to inspect hourly usage.', Component: EnergyWidget },
  { id: 'timer', title: 'Timer', category: 'home', size: 'wide', tone: 'rose', interaction: 'Adjust minutes, start, pause or reset the countdown.', Component: TimerWidget },
  { id: 'lock', title: 'Front door', category: 'home', size: 'small', tone: 'graphite', interaction: 'Hold the lock button, Space or Enter to toggle the lock.', Component: LockWidget },
  { id: 'clock', title: 'Local time', category: 'everyday', size: 'small', tone: 'graphite', interaction: 'Tap the clock to switch between analog and digital time.', Component: ClockWidget },
  { id: 'calendar', title: 'Week calendar', category: 'everyday', size: 'wide', tone: 'indigo', interaction: 'Select a day to see its agenda.', Component: CalendarWidget },
  { id: 'reminders', title: 'Reminders', category: 'everyday', size: 'wide', tone: 'violet', interaction: 'Check off a reminder to update the completion ring.', Component: RemindersWidget },
  { id: 'music', title: 'Music player', category: 'everyday', size: 'wide', tone: 'ember', interaction: 'Play, pause, skip tracks or seek on the waveform.', Component: MusicWidget },
  { id: 'stocks', title: 'Stock ticker', category: 'everyday', size: 'small', tone: 'red', interaction: 'Switch BTC and ETH or scrub their price history.', Component: StocksWidget },
];
