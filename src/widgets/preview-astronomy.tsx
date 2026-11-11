import { useId, useState } from 'react';
import { WidgetCard, type WidgetDefinition } from './core';
import moonTexture from './astronomy-assets/moon.jpg';
import './preview-astronomy.css';

const phases = [
  'New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous',
  'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent',
];

function moonLightPath(phase: number) {
  const waxes = phase < 4;
  const cosine = Math.cos(phase * Math.PI / 4);
  const terminator = Math.max(.01, Math.abs(cosine) * 52);
  return `M68 16 A52 52 0 0 ${Number(waxes)} 68 120 A${terminator} 52 0 0 ${Number(waxes === (cosine < 0))} 68 16Z`;
}

function MoonPhase() {
  const [phase, setPhase] = useState(3);
  const shape = useId();
  const readingId = `${shape}-reading`;
  const illuminated = Math.round((1 - Math.cos(phase * Math.PI / 4)) * 50);
  return <WidgetCard label="Moon phase" className="astro-card">
    <div className="astro-layout">
      <button className="astro-view" type="button" aria-label="Show next moon phase" aria-describedby={readingId}
        onClick={() => setPhase(value => (value + 1) % phases.length)}>
        <svg className="astro-scene" viewBox="0 0 136 136" aria-hidden="true">
          <defs>
            <clipPath id={`${shape}-disk`}><circle cx="68" cy="68" r="52" /></clipPath>
            <image id={`${shape}-texture`} href={moonTexture} x="13" y="13" width="110" height="110" />
            {phases.slice(1).map((name, index) => (
              <clipPath key={name} id={`${shape}-${index + 1}`}><path d={moonLightPath(index + 1)} /></clipPath>
            ))}
          </defs>
          <circle cx="68" cy="68" r="52" fill="#121a28" stroke="#91b4dd" strokeOpacity=".30" />
          <g clipPath={`url(#${shape}-disk)`}>
            <use href={`#${shape}-texture`} opacity=".15" />
            {phases.slice(1).map((name, index) => (
              <use key={name} className="astro-layer" data-active={phase === index + 1} href={`#${shape}-texture`}
                clipPath={`url(#${shape}-${index + 1})`} />
            ))}
          </g>
        </svg>
      </button>
      <div className="astro-reading" id={readingId} aria-live="polite">
        <strong>{phases[phase]}</strong><span>{illuminated}% illuminated</span>
      </div>
    </div>
  </WidgetCard>;
}

export const astronomyPreviews: WidgetDefinition[] = [
  { id: 'moon-phase', title: 'Moon phase', category: 'weather', size: 'small', tone: 'slate', Component: MoonPhase, interaction: 'Cycle through eight moon phases' },
];
