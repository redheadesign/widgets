import { createRoot } from 'react-dom/client';

const params = new URLSearchParams(location.search);
const view = params.get('view');
const landing = !params.has('embed') && (view === 'landing' || params.get('presentation') === '1' ||
  (!view && /^\/widgets\/?$/.test(location.pathname)));
const root = createRoot(document.getElementById('root')!);

if (landing) {
  document.title = 'Виджеты · Redheadesign';
  document.querySelector('meta[name="description"]')?.setAttribute('content', 'Интерактивные виджеты для сайтов и Telegram.');
  void import('./landing').then(({ BentoLanding }) => root.render(<BentoLanding />));
} else {
  void import('./studio').then(({ App }) => root.render(<App />));
}
