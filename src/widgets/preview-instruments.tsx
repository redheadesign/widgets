import { useState, type PointerEvent } from 'react';
import { WidgetCard, type WidgetDefinition } from './core';
import './preview-instruments.css';

const number = new Intl.NumberFormat('en-US');
const compassPoints = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const compassTicks = Array.from({ length: 48 }, (_, index) => index * 7.5);
const normalizeHeading = (heading: number) => (heading % 360 + 360) % 360;

function CompassPreview() {
  const [rotation, setRotation] = useState(38);
  const heading = normalizeHeading(rotation);
  const cardinal = compassPoints[Math.round(heading / 45) % compassPoints.length];
  const setHeading = (next: number) => setRotation(previous => {
    const difference = next - normalizeHeading(previous);
    return previous + ((difference + 540) % 360) - 180;
  });
  const point = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left - bounds.width / 2;
    const y = event.clientY - bounds.top - bounds.height / 2;
    if (Math.hypot(x, y) > bounds.width * .08) {
      setHeading(normalizeHeading(Math.round(Math.atan2(x, -y) * 180 / Math.PI)));
    }
  };
  return (
    <WidgetCard className="bwi-card" label="Compass">
      <div className="bwi-compass">
        <div className="bwi-compass-face" role="slider" tabIndex={0} aria-label="Compass heading" aria-valuemin={0} aria-valuemax={359}
          aria-valuenow={heading} aria-valuetext={`${number.format(heading)} degrees ${cardinal}`}
          onPointerDown={event => {
            if (!event.isPrimary || event.button !== 0) return;
            event.currentTarget.focus({ preventScroll: true });
            event.currentTarget.setPointerCapture(event.pointerId);
            point(event);
          }} onPointerMove={event => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) point(event);
          }} onKeyDown={event => {
            const steps: Record<string, number> = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -15, PageUp: 15 };
            const step = steps[event.key];
            if (step === undefined && event.key !== 'Home' && event.key !== 'End') return;
            event.preventDefault();
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? 359 : Math.max(0, Math.min(359, heading + step));
            setHeading(next);
          }}>
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="58" className="bwi-compass-rim" />
            {compassTicks.map((angle, index) => (
              <line key={angle} x1="60" y1={index % 12 === 0 ? 7 : index % 3 === 0 ? 8 : 9} x2="60" y2={index % 3 === 0 ? 14 : 12}
                transform={`rotate(${angle} 60 60)`} opacity={index % 3 === 0 ? .72 : .32} />
            ))}
            <circle cx="60" cy="60" r="32" className="bwi-compass-inner" />
            <text x="60" y="27" className="bwi-compass-north">N</text>
            <text x="98" y="64">E</text>
            <text x="60" y="103">S</text>
            <text x="22" y="64">W</text>
            <g className="bwi-compass-needle" style={{ transform: `rotate(${rotation}deg)` }}>
              <path d="M60 29 66 61 60 65 54 61Z" className="bwi-compass-tip" />
              <path d="M60 91 66 61 60 57 54 61Z" className="bwi-compass-tail" />
            </g>
            <circle cx="60" cy="60" r="3" className="bwi-compass-pivot" />
          </svg>
        </div>
        <div className="bwi-compass-reading" aria-hidden="true">{number.format(heading)}° <span>{cardinal}</span></div>
      </div>
    </WidgetCard>
  );
}

export const instrumentPreviews: WidgetDefinition[] = [
  { id: 'compass', title: 'Compass', category: 'home', size: 'small', tone: 'graphite', Component: CompassPreview, interaction: 'Drag around the dial or use arrow keys to change heading.' },
];
