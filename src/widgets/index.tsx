import type { Tone, WidgetLayout, WidgetSettings } from './core.js';
import { WidgetFrame } from './core.js';
import { healthWeather } from './health-weather.js';
import { analyticsHome } from './analytics-home.js';
import './widgets.css';

export * from './core.js';
export * from './health-weather.js';
export * from './analytics-home.js';
export const widgetCatalog = [...healthWeather, ...analyticsHome];
export const widgetsById = Object.fromEntries(widgetCatalog.map(widget => [widget.id, widget]));

export type BloomWidgetProps = WidgetLayout & {
  id: string;
  settings?: Partial<WidgetSettings>;
  tone?: Tone;
};

export function BloomWidget({ id, settings, tone, ...layout }: BloomWidgetProps) {
  if (!Object.hasOwn(widgetsById, id)) return null;
  const definition = widgetsById[id];
  return <WidgetFrame definition={definition} settings={settings} tone={tone} {...layout} />;
}

export { BloomWidget as Widget };
export type WidgetProps = BloomWidgetProps;
