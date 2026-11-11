export type TelegramWidgetOptions = {
  accent?: string
  tint?: string
  glow?: number
  speed?: number
  reducedMotion?: boolean
}

type Preset = {
  title: string
  accent: string
  value: string
  unit?: string
  detail: string
  art: string
  layout?: 'side' | 'dial' | 'water' | 'center' | 'list' | 'player'
  display?: 'dots'
  backdrop?: string
  headerControls?: boolean
  controls?: string
  behavior?: string
}

const controls = {
  next: 'M9 6l6 6-6 6',
  previous: 'M15 6l-6 6 6 6',
  play: 'M9 5l11 7-11 7z',
  pause: 'M9 5v14m6-14v14',
  plus: 'M5 12h14M12 5v14',
  minus: 'M5 12h14',
  reset: 'M5 11a7 7 0 1 1 2 6m-2-6V5m0 6h6',
  power: 'M12 3v8M7 6a8 8 0 1 0 10 0',
  lock: 'M5 11h14v9H5zm3 0V8a4 4 0 1 1 8 0v3',
}

function lineIcon(path: string, size: number) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`
}

function action(id: string, label: string, symbol: keyof typeof controls) {
  return `<button id="${id}" class="action" type="button" aria-label="${label}">${lineIcon(controls[symbol], 18)}</button>`
}

function options(labels: string[], active = 0, names?: string[]) {
  return `<div class="choices">${labels.map((label, index) => `<button type="button" class="choice" data-choice="${index}"${names ? ` aria-label="${names[index]}"` : ''} aria-pressed="${index === active}">${label}</button>`).join('')}</div>`
}

function bars(values: number[], active: number, labels?: string[]) {
  return `<div id="bars" class="bars${labels ? ' labeled' : ''}" aria-hidden="true">${values.map((value, index) => `<div class="bar${index === active ? ' selected' : ''}" style="height:${value}%">${labels ? `<span>${labels[index]}</span>` : ''}</div>`).join('')}</div>`
}

function spark(path: string, ecg = false) {
  const marks = ecg ? `<path class="trace" d="${path}"/>` : `<defs><linearGradient id="plot-fill" x2="0%" y2="100%"><stop class="plot-top"/><stop offset="1" stop-opacity="0"/></linearGradient></defs><path id="area" d="${path}L260 72H0Z" fill="url(#plot-fill)"/>`
  return `<svg class="chart${ecg ? ' ecg' : ''}" viewBox="0 0 260 72" preserveAspectRatio="none" aria-hidden="true"><path class="gridline" d="M0 14h260M0 36h260M0 58h260"/>${marks}<path id="spark" class="spark" d="${path}"/></svg>`
}

function meter(amount: number, label?: string) {
  return `<div id="track" class="track"${label ? ` aria-label="${label}"` : ''}><div id="fill" style="width:${amount}%"></div></div>`
}

function gauge(percent: number) {
  const angle = Math.PI * percent / 100
  return `<svg class="gauge" viewBox="0 0 170 90" aria-hidden="true"><defs><linearGradient id="gauge-fill"><stop class="gauge-stop"/><stop offset="1" stop-color="#ffc785"/></linearGradient></defs><path class="arc" d="M14 78a71 71 0 0 1 142 0"/><path id="arc" class="arc lit" d="M14 78a71 71 0 0 1 142 0" stroke-dasharray="${Math.round(223 * percent / 100)} 223"/><circle id="marker" cx="${Math.round(85 - 71 * Math.cos(angle))}" cy="${Math.round(78 - 71 * Math.sin(angle))}" r="4.5" fill="#fff"/></svg>`
}

const stepButtons = (label: string) => action('prev', `Previous ${label}`, 'previous') + action('next', `Next ${label}`, 'next')
const valueButtons = (label: string) => action('down', `Decrease ${label}`, 'minus') + action('up', `Increase ${label}`, 'plus')
const playback = (label: string) => action('play', label, 'play')

const pulse = 'M0 40' + 'h10q3-6 6 0h5l3 5 4-27 4 37 5-15h4q4-6 8 0h16'.repeat(4)
const userLine = 'M0 59l19-6 15 3 20-14 14 3 21-13 20 8 17-10 18 1 21-15 16 8 22-9 15 3 20-8 22 2'
const waterWave = 'M0 9C25-1 75-1 100 9S175 19 200 9 275-1 300 9 375 19 400 9V23H0Z'
const hydrationWater = `<div class="water-window" aria-hidden="true"><div class="water" id="water" style="--level:48.75%"><svg class="wave rear" viewBox="0 0 400 23" preserveAspectRatio="none"><path d="${waterWave}"/></svg><svg class="wave front" viewBox="0 0 400 23" preserveAspectRatio="none"><path d="${waterWave}"/></svg></div></div>`

function sleepStages(stages: number[]) {
  return `<div id="scrub" class="scrub"><div class="sleep" id="sleep" aria-hidden="true">${stages.map((stage, index) => `<i style="--stage:${stage}" class="s${stage}${index === 14 ? ' selected' : ''}"></i>`).join('')}</div></div>`
}

const sleepData = '23321232112023211221121132111310'
const stepCounts = [6950,8432,9560,5128,9132,10125,4140]
const stepHeights = stepCounts.map(count => Math.min(100, Math.round(count / 100)))
const weekdayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const lungArcs = [[143,95,89], [193,95,89], [118,70,64], [168,70,64], [218,70,64]]
const lungArt = `<svg class="lung" viewBox="0 0 336 103" aria-hidden="true">${lungArcs.map(([center, width, height]) => `<path class="lung-grid" d="M${center - width} 100A${width} ${height} 0 0 1 ${center + width} 100"/>`).join('')}<circle id="breath-dot" cx="67" cy="46" r="3" fill="#fff"/></svg>`

function compassDial() {
  return '<div class="compass" aria-hidden="true"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="43" class="ticks" stroke-dasharray="1 4.63"/><path d="M50 5v5m0 80v5M5 50h5m80 0h5" class="gridline"/></svg><span>N</span><svg class="needle" id="needle" viewBox="0 0 40 40" style="transform:rotate(45deg)"><path d="M20 4l7 26-7-5-7 5z" fill="var(--accent)"/></svg></div>'
}

const rainfall = [4, 9, 21, 34, 25, 14]
const hourlyX = [10, 58, 106, 154, 202, 250]
const hourlyY = [52, 43, 24, 15, 24, 43]
const hours = ['Now', '12 pm', '1 pm', '2 pm', '3 pm', '4 pm']
const hourlyChart = `<div id="scrub" class="scrub hourly"><svg class="hourly-line" viewBox="0 0 260 70" preserveAspectRatio="none" aria-hidden="true"><path class="gridline" d="M0 23h260M0 46h260M0 69h260"/><path class="forecast" d="M${hourlyX.map((x, i) => `${x} ${hourlyY[i]}`).join('L')}"/><path id="guide" d="M10 52V69" class="guide"/><circle id="forecast-dot" cx="10" cy="52" r="4" fill="var(--accent)"/></svg>${bars(rainfall.map(value => value * 2.5), 0, hours)}</div>`

const uvDots = Array.from({ length: 31 }, (_, i) => {
  const angle = i / 30 * Math.PI
  const color = i < 10 ? '#73d78a' : i < 17 ? '#d6df6f' : i < 23 ? '#ffb46e' : '#ed775f'
  return `<circle cx="${Math.round(85 - 71 * Math.cos(angle))}" cy="${Math.round(78 - 71 * Math.sin(angle))}" r="1.6" fill="${color}"/>`
}).join('')

const climateDial = `<div id="scrub" class="scrub climate"><svg viewBox="0 0 144 138" aria-hidden="true"><path class="climate-ticks" d="M32 112A57 57 0 1 1 112 112"/><path class="climate-progress" id="climate-progress" d="M32 112A57 57 0 1 1 112 112" stroke-dasharray="${'1.25 4.25 '.repeat(21)}0 280"/><circle id="climate-dot" cx="53" cy="18" r="5" fill="#fff"/></svg></div>`
const trafficSources = [['Organic', 41.6, 'var(--accent)'], ['Direct', 26.3, '#e2bd69'], ['Social', 19.8, '#d8739d'], ['Referral', 12.3, '#9cb2ff']] as const
const trafficArt = `<div class="traffic-art"><svg viewBox="0 0 86 86" class="source-ring" aria-hidden="true">${trafficSources.map(([, share, color], index) => {
  const offset = trafficSources.slice(0, index).reduce((total, source) => total + source[1], 0)
  return `<circle id="source${index}" cx="43" cy="43" r="34" fill="none" stroke="${color}" stroke-width="${index === 0 ? 10 : 6}" stroke-dasharray="${Math.round(share * 2.136) - 5} 214" stroke-dashoffset="${Math.round(-offset * 2.136)}" transform="rotate(-90 43 43)"/>`
}).join('')}</svg><div class="source-key">${trafficSources.map(([label, share, color], index) => `<button class="source" type="button" data-choice="${index}" aria-pressed="${index === 0}" aria-label="${label}"><i style="background:${color}"></i><span>${label}</span><b>${share}%</b></button>`).join('')}</div></div>`

const revenuePeriods = [
  { change: '12.4', active: 4, amounts: [5860,6390,7090,6210,8900,7610,6155], labels: ['M','T','W','T','F','S','S'], names: weekdayNames },
  { change: '8.1', active: 4, amounts: [38400,41500,47740,44300,15000], labels: ['W1','W2','W3','W4','W5'], names: ['Week 1','Week 2','Week 3','Week 4','Week 5'] },
  { change: '18.1', active: 5, amounts: [72430,103625,93185,110460,117908,140912], labels: ['Jan','Mar','May','Jul','Sep','Nov'], names: ['Jan–Feb','Mar–Apr','May–Jun','Jul–Aug','Sep–Oct','Nov–Dec'] },
]

function revenueLevels(amounts: number[]) {
  const max = Math.max(...amounts)
  return amounts.map(amount => Math.round(amount / max * 86))
}

function revenueCurve(values: number[]) {
  const step = 700 / values.length
  const tops = values.map(percent => Math.round(80 - percent * .8))
  return 'M' + Math.round(step / 2) + ' ' + tops[0] + tops.slice(1).map((y, i) => {
    const mid = Math.round((i + 1) * step)
    return `C${mid} ${tops[i]} ${mid} ${y} ${Math.round(mid + step / 2)} ${y}`
  }).join('')
}

const cohorts = [[100,81,72,66,58,47,40,34], [100,75,68,59,51,40,35], [100,79,64,56,49,39], [100,74,55,48,42], [100,84,68,51]]
const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct']
const cohortArt = `<div class="cohorts" id="heatmap">${cohorts.map((row, i) => `<div class="cohort"><span>${months[i]}</span>${row.map((value, j) => `<button type="button" data-row="${i}" data-week="${j}" aria-label="${months[i]}, week ${j}, ${value}%" aria-pressed="${i === 3 && j === 2}" style="--cell:${(value / 110).toFixed(2)}"></button>`).join('')}</div>`).join('')}</div>`
const funnelRows = [['Visits', 24810], ['Cart', 6204], ['Checkout', 2977], ['Purchase', 1861]] as const
const energyHours = [.67,.53,.39,.39,.46,.8,1.5,2.13,1.78,1.29,1.08,1.22,1.5,1.36,1.22,1.29,1.71,2.27,2.89,3.1,2.54,1.92,1.29,.87]
const agenda = [[['09:30','Design sync']], [['10:00','Widget kit review'], ['15:30','Client call']], [['11:15','Prototype review']], [], [['14:00','Sprint planning']], [['10:30','Studio time']], []]
const assets = [
  { code: 'BTC', price: 66318, change: '−3.05%', history: [5,8,9,6,5,9,15,19,21,23,24,25,26,25,22,17,11,7,5,7,12,17,21,24,28,29,26,24,25,28,35,40,35,28,28,31,36,42,44,44,41,34,30,27,26,25,27,30,32] },
  { code: 'ETH', price: 3526, change: '+2.81%', history: [40,33,35,27,30,24,12,20,17,26,19,9,6,10] },
]

const presets = {
  'heart-rate': {
    title: 'Heart rate', accent: '#e0eb80', value: '72', unit: 'bpm', detail: 'Resting · Demo', display: 'dots', headerControls: true,
    art: spark(pulse, true), controls: '<button id="play" type="button" class="choice replay" aria-pressed="false">Measure</button>',
    behavior: `let measuring = false, index = 0, last = Date.now();
    const rates = [72, 73, 75, 73, 71, 70, 72];
    click('play', () => { measuring = !measuring; by('play').textContent = measuring ? 'Stop' : 'Measure'; by('play').setAttribute('aria-pressed',String(measuring)); note(measuring ? 'Measuring · Demo' : 'Resting · Demo'); });
    setInterval(() => { const now = Date.now(); if (!document.hidden && (measuring || !still) && now - last >= (measuring ? 720 : 2300) / speed) { last = now; show(rates[++index % rates.length]); } }, 120);`,
  },
  activity: {
    title: 'Activity', accent: '#ff488c', value: '82', unit: '%', detail: 'Move · 486/590 kcal', layout: 'side',
    art: `<button id="rings" class="rings" type="button" aria-label="Show next activity ring"><svg viewBox="0 0 106 106" aria-hidden="true">${[44, 33, 22].map((radius, index) => `<circle cx="53" cy="53" r="${radius}" fill="none" stroke="#ffffff23" stroke-width="7"/><circle class="ring${index ? '' : ' selected'}" cx="53" cy="53" r="${radius}" fill="none" stroke="${['var(--accent)', '#dbe76d', '#60c5de'][index]}" stroke-width="7" stroke-linecap="round" transform="rotate(-90 53 53)" stroke-dasharray="${[227, 124, 104][index]} 277"/>`).join('')}</svg></button>`,
    behavior: `let index = 0;
    const rings = by('rings').querySelectorAll('.ring');
    click('rings', () => { index = (index + 1) % 3; show([82,60,75][index]); note(['Move · 486/590 kcal','Exercise · 18/30 min','Stand · 9/12 h'][index]);
      rings.forEach((ring,i) => ring.classList.toggle('selected',i === index)); });`,
  },
  steps: {
    title: 'Steps', accent: '#dbe76b', value: '8,432', detail: 'Tuesday · 84% of goal', display: 'dots',
    art: `<div id="scrub" class="scrub">${bars(stepHeights, 1, weekdayNames.map(day => day[0]))}</div>`, controls: stepButtons('day'),
    behavior: `const counts = ${JSON.stringify(stepCounts)};
    const jump = browse(7,1,i => { show(integer(counts[i])); note(${JSON.stringify(weekdayNames)}[i] + ' · ' + Math.round(counts[i] / 100) + '% of goal'); columns(${JSON.stringify(stepHeights)},i); });
    scrub('scrub', fraction => jump(Math.min(6,Math.floor(fraction * 7))));`,
  },
  sleep: {
    title: 'Sleep', accent: '#abaeff', value: '7:42', unit: 'h', detail: '02:39 · Light', display: 'dots',
    art: sleepStages(Array.from(sleepData, Number)),
    controls: stepButtons('sleep stage'),
    behavior: `const stages = '${sleepData}', markers = by('sleep').querySelectorAll('i');
    const jump = browse(stages.length,14,i => {
      const minute = (1390 + Math.round(i * 462 / 31)) % 1440;
      note(String(Math.floor(minute / 60)).padStart(2,'0') + ':' + String(minute % 60).padStart(2,'0') + ' · ' + ['Awake','REM','Light','Deep'][stages[i]]);
      markers.forEach((mark,j) => mark.classList.toggle('selected',i === j));
    });
    scrub('scrub', fraction => jump(Math.min(31,Math.floor(fraction * 32))));`,
  },
  'lung-capacity': {
    title: 'Latest test', accent: '#edb2dc', value: '3.3', unit: 'Liters', detail: 'Lung capacity · Best 3.6 L', display: 'dots',
    art: lungArt, controls: '<button id="play" type="button" class="choice replay">Repeat</button>',
    behavior: `let started = 0;
    const dot = by('breath-dot'), play = by('play'), title = by('title');
    function stop(){ started = 0; title.textContent = 'Latest test'; play.textContent = 'Repeat'; }
    function update(){
      const progress = Math.min(1,(Date.now() - started) * speed / 3300), angle = Math.PI * progress;
      show((3.6 * (1 - (1 - progress) ** 1.7)).toFixed(1));
      dot.setAttribute('cx',Math.round(143 - 95 * Math.cos(angle)));
      dot.setAttribute('cy',Math.round(100 - 89 * Math.sin(angle)));
      if (progress === 1) stop();
    }
    click('play', () => { if (started) { update(); stop(); } else { started = Date.now(); title.textContent = 'Test in progress'; play.textContent = 'Stop'; update(); } });
    setInterval(() => { if (started && !document.hidden) update(); }, 80);`,
  },
  hydration: {
    title: 'Hydration', accent: '#6c91ff', value: '1,250', unit: 'ml of 2,000', detail: '', layout: 'water', display: 'dots',
    art: '', backdrop: hydrationWater, controls: action('down', 'Remove a glass of water', 'minus') + '<span id="glasses" aria-live="polite">5 glasses</span>' + action('up', 'Add a glass of water', 'plus'),
    behavior: `let glasses = 5;
    const plural = new Intl.PluralRules('en-US');
    function draw(){ show(integer(glasses * 250)); by('glasses').textContent = glasses + ({one:' glass',other:' glasses'})[plural.select(glasses)];
      by('water').style.setProperty('--level',Math.min(glasses,8) * 9.75 + '%'); by('down').disabled = glasses === 0; by('up').disabled = glasses === 12; }
    click('down', () => { glasses = Math.max(0, glasses - 1); draw(); });
    click('up', () => { glasses = Math.min(12, glasses + 1); draw(); });`,
  },
  glucose: {
    title: 'Average glucose', accent: '#e8b9d6', value: '84', unit: 'mg/dL', detail: 'Today · Target 70 to 180', headerControls: true, layout: 'side',
    art: '<div class="glucose-ring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="43" class="ring-base"/><circle cx="50" cy="50" r="43" id="range-ring" transform="rotate(-90 50 50)" stroke-dasharray="254 271"/></svg><span id="range">94%</span><small>in range</small></div>',
    controls: options(['D', 'W', 'M'], 0, ['Day', 'Week', 'Month']),
    behavior: `choose(i => { const range = [94,91,96][i]; show([84,91,88][i]); note(['Today','This week','This month'][i] + ' · Target 70 to 180');
      by('range').textContent = range + '%'; by('range-ring').setAttribute('stroke-dasharray',Math.round(range * 2.71) + ' 271'); });`,
  },
  breathing: {
    title: 'Breathe', accent: '#e897bd', value: '60', unit: 'sec', detail: 'One-minute session', layout: 'side',
    art: '<div class="breath-field"><div class="orb" id="orb"></div></div>', controls: playback('Start breathing'),
    behavior: `let started = 0;
    function update(){
      if (!started || document.hidden) return;
      const elapsed = Math.min(60,(Date.now() - started) * speed / 1000), cycle = elapsed % 10;
      show(Math.ceil(60 - elapsed));
      if (elapsed === 60) { stop('Complete'); return; }
      const volume = cycle < 4 ? cycle / 4 : (10 - cycle) / 6;
      note(cycle < 4 ? 'Inhale' : 'Exhale');
      if (!still) by('orb').style.transform = 'scale(' + (1 + .32 * (1 - Math.cos(Math.PI * volume)) / 2) + ')';
    }
    function stop(message){ started = 0; togglePlay(true,'breathing'); note(message); by('orb').style.transform = 'scale(1)'; }
    click('play', () => { if (started) { show(60); stop('One-minute session'); } else { started = Date.now(); togglePlay(false,'breathing'); by('play').setAttribute('aria-label','Stop breathing'); update(); } });
    setInterval(update, 100);`,
  },
  weather: {
    title: 'Caracas', accent: '#e6ac66', value: '28', unit: '°C', detail: 'Partly cloudy · H 31° · L 22°', layout: 'side', headerControls: true,
    art: '<div class="weather" data-sky="clouds" id="sky" aria-hidden="true"><div class="sun-disc"></div><svg class="cloud" viewBox="0 0 120 48"><path d="M18 39C1 39 1 16 18 16c4 0 7 1 9 3C31 0 62-3 71 17c9-5 19 1 19 7 14-4 26 15 8 15Z" fill="#dce9ffb0"/><path class="rain" d="M43 40l-3 6m16-5-3 6m16-6-3 6m17-6-3 6" stroke="#bfc4ff" stroke-linecap="round"/></svg></div>',
    controls: stepButtons('city'),
    behavior: `browse(3,0,i => { show([28,14,19][i]); by('title').textContent = ['Caracas','Madrid','Tokyo'][i];
      note(['Partly cloudy · H 31° · L 22°','Clear · H 17° · L 6°','Light rain · H 21° · L 15°'][i]); by('sky').dataset.sky = ['clouds','clear','rain'][i]; });`,
  },
  hourly: {
    title: 'Hourly forecast', accent: '#dfe983', value: '21', unit: '°C', detail: 'Now · 4% rain',
    art: hourlyChart, controls: stepButtons('hour'),
    behavior: `const temps = [21,22,24,25,24,22];
    const jump = browse(6,0,i => { const x = ${JSON.stringify(hourlyX)}[i], y = ${JSON.stringify(hourlyY)}[i]; show(temps[i]); note(${JSON.stringify(hours)}[i] + ' · ' + ${JSON.stringify(rainfall)}[i] + '% rain');
      by('guide').setAttribute('d','M' + x + ' ' + y + 'V69'); by('forecast-dot').setAttribute('cx',x); by('forecast-dot').setAttribute('cy',y); columns(${JSON.stringify(rainfall.map(value => value * 2.5))},i); });
    scrub('scrub', fraction => jump(Math.min(5, Math.floor(fraction * 6))));`,
  },
  'air-quality': {
    title: 'Air quality', accent: '#e1e775', value: '42', unit: 'AQI', detail: 'Good · Particulate matter', display: 'dots', headerControls: true,
    art: spark('M0 44h38v7h40V34h39v8h38V28h39v17h36v-6h30'), controls: options(['PM', 'O₃'], 0, ['Particulate matter', 'Ozone']),
    behavior: `choose(i => { show(i ? 34 : 42); note(i ? 'Good · Ozone' : 'Good · Particulate matter');
      plot(i ? 'M0 51h38V38h40v6h39V27h38v6h39V15h36v8h30' : 'M0 44h38v7h40V34h39v8h38V28h39v17h36v-6h30'); });`,
  },
  'uv-index': {
    title: 'UV index', accent: '#ffcd75', value: '6', detail: 'High · Demo forecast', display: 'dots', layout: 'side', headerControls: true,
    art: `<svg class="uv-dial" viewBox="0 0 170 90" aria-hidden="true">${uvDots}<circle id="marker" cx="95" cy="8" r="5" fill="#fff"/></svg>`, controls: options(['Now', 'Peak']),
    behavior: `choose(i => { show(i ? 9 : 6); note(i ? 'Very high · Demo forecast' : 'High · Demo forecast'); markArc(i ? 82 : 55); });`,
  },
  wind: {
    title: 'Wind', accent: '#d9ee78', value: '14', unit: 'km/h', detail: 'NE · Gusts of 22 km/h', layout: 'side',
    art: compassDial(),
    controls: stepButtons('reading'),
    behavior: `browse(4,0,i => { show([14,12,17,9][i]); note(['NE','E','SE','N'][i] + ' · Gusts of ' + [22,19,25,16][i] + ' km/h'); by('needle').style.transform = 'rotate(' + [45,90,135,0][i] + 'deg)'; });`,
  },
  sun: {
    title: 'Sun path', accent: '#ffdd8a', value: '14:12', detail: 'Sunrise 6:18 · Sunset 18:24',
    backdrop: '<div id="dusk" class="dusk" style="opacity:.06" aria-hidden="true"></div>',
    art: '<div id="scrub" class="scrub"><svg class="sun-path" viewBox="0 0 260 82" preserveAspectRatio="none" aria-hidden="true"><path class="sun-arc" d="M10 72Q130 -46 250 72"/><path class="gridline" d="M0 73h260"/><circle id="sun-glow" cx="167" cy="18" r="10" fill="#ffb25744"/><circle id="sun" cx="167" cy="18" r="4.5" fill="var(--accent)"/></svg></div>',
    controls: stepButtons('hour'),
    behavior: `const sunrise = 378, sunset = 1104;
    let minutes = 852;
    function jump(next){
      minutes = Math.max(sunrise,Math.min(sunset,next));
      const position = (minutes - sunrise) / (sunset - sunrise);
      const x = Math.round(10 + 240 * position), y = Math.round(72 - 236 * position * (1 - position));
      ['sun','sun-glow'].forEach(id => { by(id).setAttribute('cx',x); by(id).setAttribute('cy',y); });
      by('dusk').style.opacity = Math.max(0,(position - .63) / .37).toFixed(2);
      show(Math.floor(minutes / 60) + ':' + String(minutes % 60).padStart(2,'0'));
    }
    click('prev', () => jump(minutes - 60)); click('next', () => jump(minutes + 60));
    scrub('scrub', fraction => jump(sunrise + Math.round(fraction * (sunset - sunrise))));`,
  },
  revenue: {
    title: 'Revenue', accent: '#e3ec81', value: '$48,215', detail: 'Friday · $8,900 · +12.4%', headerControls: true,
    art: `<div id="scrub" class="scrub revenue-chart">${bars(revenueLevels(revenuePeriods[0].amounts), 4, revenuePeriods[0].labels)}<svg viewBox="0 0 700 80" preserveAspectRatio="none" aria-hidden="true"><path id="curve" d="${revenueCurve(revenueLevels(revenuePeriods[0].amounts))}"/></svg></div>`, controls: options(['W', 'M', 'Y'], 0, ['Week', 'Month', 'Year']),
    behavior: `const curve = (${revenueCurve.toString()}), levels = (${revenueLevels.toString()}), periods = ${JSON.stringify(revenuePeriods)};
    let period = 0;
    const bars = by('bars').querySelectorAll('.bar');
    function pick(point){
      const {amounts,change,names} = periods[period];
      bars.forEach((bar,i) => bar.classList.toggle('selected',i === point));
      note(names[point] + ' · $' + integer(amounts[point]) + ' · +' + change + '%');
    }
    choose(i => {
      period = i; const {amounts,active,labels} = periods[i], values = levels(amounts);
      show('$' + integer(amounts.reduce((sum,amount) => sum + amount,0)));
      bars.forEach((bar,j) => { bar.hidden = j >= values.length; if (!bar.hidden) { bar.style.height = values[j] + '%'; bar.firstElementChild.textContent = labels[j]; } });
      by('curve').setAttribute('d',curve(values)); pick(active);
    });
    scrub('scrub', fraction => { const count = periods[period].amounts.length; pick(Math.min(count - 1,Math.floor(fraction * count))); });`,
  },
  users: {
    title: 'Live users', accent: '#d9e985', value: '1,284', detail: 'Active now · Demo', display: 'dots', headerControls: true,
    art: spark(userLine), controls: action('play', 'Pause live users', 'pause'),
    behavior: `let live = true, frame = 0;
    click('play', () => { live = !live; togglePlay(!live, 'live users'); note(live ? 'Active now · Demo' : 'Paused'); });
    setInterval(() => { if (live && !document.hidden) { frame++; show(integer(1284 + Math.round(Math.sin(frame / 3) * 24))); line([59,53,50,43,36,40,28,23,Math.round(15 + 7 * Math.sin(frame / 3))]); } }, 1700 / speed);`,
  },
  funnel: {
    title: 'Conversion funnel', accent: '#dee98b', value: '7.5', unit: '%', detail: 'Conversion',
    art: `<div class="funnel" id="funnel">${funnelRows.map(([label, count], i) => `<button class="funnel-row" type="button" data-choice="${i}" aria-label="${label}" aria-pressed="${i === 3}"><span>${label}</span><span class="funnel-track"><i style="width:${(count / 248.1).toFixed(1)}%"></i></span><b>${count.toLocaleString('en-US')}</b></button>`).join('')}</div>`,
    behavior: `choose(i => { show(['100','25','12','7.5'][i]); note(['Visits','Cart','Checkout','Conversion'][i]); });`,
  },
  traffic: {
    title: 'Traffic sources', accent: '#faf3f5', value: '41.6', unit: '%', detail: 'Organic search · Demo',
    art: trafficArt,
    behavior: `choose(i => { show([41.6,26.3,19.8,12.3][i]); note(['Organic search','Direct traffic','Social traffic','Referral'][i] + ' · Demo');
      for(let j = 0; j < 4; j++) by('source' + j).setAttribute('stroke-width',j === i ? 10 : 6); });`,
  },
  goal: {
    title: 'Monthly goal', accent: '#63bfff', value: '78', unit: '%', detail: '$48,360 of $62,000', display: 'dots', layout: 'dial',
    art: `<div id="scrub" class="scrub goal-scrub">${gauge(78)}</div>`, controls: valueButtons('progress'),
    behavior: `let progress = 78;
    function draw(){ show(progress); arc(progress); note('$' + integer(progress * 620) + ' of $62,000'); }
    click('down', () => { progress = Math.max(0,progress - 1); draw(); });
    click('up', () => { progress = Math.min(100,progress + 1); draw(); });
    scrub('scrub', fraction => { progress = Math.round(fraction * 100); draw(); });`,
  },
  retention: {
    title: 'Cohort retention', accent: '#e2e981', value: '55', unit: '%', detail: 'Sep · Week 2',
    art: cohortArt,
    behavior: `const heatmap = by('heatmap'); let selected = heatmap.querySelector('[aria-pressed=true]');
    heatmap.addEventListener('click',event => {
      const {row,week} = event.target.dataset;
      if (row === undefined || event.target === selected) return;
      selected.setAttribute('aria-pressed','false'); selected = event.target; selected.setAttribute('aria-pressed','true');
      show(${JSON.stringify(cohorts)}[row][week]); note(${JSON.stringify(months)}[row] + ' · Week ' + week);
    });`,
  },
  thermostat: {
    title: 'Thermostat', accent: '#e6f9ef', value: '24', unit: '°C', detail: 'Hold at', display: 'dots', layout: 'dial', headerControls: true,
    art: climateDial + `<div class="climate-actions">${valueButtons('temperature')}<button class="choice replay" id="fan" type="button" aria-pressed="true">Fan</button></div>`,
    controls: options(['Cool', 'Auto', 'Heat'], 1),
    behavior: `let degrees = 24;
    function update(value) { degrees = Math.max(16,Math.min(30,value)); show(degrees); const portion = (degrees - 16) / 14;
      by('climate-progress').setAttribute('stroke-dasharray','1.25 4.25 '.repeat(Math.round(portion * 49)) + '0 280');
      const angle = Math.PI * (.75 + 1.5 * portion); by('climate-dot').setAttribute('cx',Math.round(72 + 57 * Math.cos(angle))); by('climate-dot').setAttribute('cy',Math.round(72 + 57 * Math.sin(angle))); }
    click('down', () => update(degrees - 1)); click('up', () => update(degrees + 1));
    click('fan', () => { const fan = by('fan'); fan.setAttribute('aria-pressed',String(fan.getAttribute('aria-pressed') !== 'true')); });
    choose(i => note(['Cooling to','Hold at','Heating to'][i]));
    scrub('scrub', fraction => update(16 + Math.round(fraction * 14))); update(degrees);`,
  },
  lights: {
    title: 'Lights', accent: '#ffe5a2', value: '65', unit: '%', detail: 'Living room · Demo', display: 'dots', layout: 'side',
    art: `<div class="bulb" id="bulb">${lineIcon('M9 18h6m-5 3h4M8 13a5 5 0 1 1 8 0l-1 2H9zM12 1v2M3 6l2 1m16-1-2 1', 30)}</div><div id="scrub" class="scrub dimmer">${meter(65, 'Set brightness')}</div>`,
    controls: action('power', 'Turn lights off', 'power') + valueButtons('brightness'),
    behavior: `let brightness = 65, enabled = true;
    function draw() { show(enabled ? brightness : 0); fill(enabled ? brightness : 0); const bulb = by('bulb');
      bulb.style.setProperty('--brightness',(enabled ? brightness : 0) / 100); by('power').setAttribute('aria-label', enabled ? 'Turn lights off' : 'Turn lights on'); note(enabled && brightness ? 'Living room · Demo' : 'Lights off · Demo'); }
    click('power', () => { enabled = !enabled; if (enabled && !brightness) brightness = 65; draw(); });
    function dim(n) { brightness = Math.max(0,Math.min(100,n)); enabled = brightness > 0; draw(); }
    click('down', () => dim((enabled ? brightness : 0) - 5)); click('up', () => dim((enabled ? brightness : 0) + 5));
    scrub('scrub', fraction => dim(Math.round(fraction * 100)));`,
  },
  energy: {
    title: 'Energy', accent: '#bddeff', value: '3.1', unit: 'kWh', detail: '19:00', display: 'dots',
    art: `<div class="scrub energy-chart" id="scrub">${bars(energyHours.map(amount => Math.round(amount / 3.1 * 100)), 19)}</div>`, controls: stepButtons('hour'),
    behavior: `const hours = ${JSON.stringify(energyHours)}, levels = hours.map(amount => Math.round(amount / 3.1 * 100));
    const jump = browse(24,19,i => { show(hours[i].toFixed(1)); note(String(i).padStart(2,'0') + ':00'); columns(levels,i); });
    scrub('scrub', fraction => jump(Math.min(23,Math.floor(fraction * 24))));`,
  },
  timer: {
    title: 'Timer', accent: '#f1a6cd', value: '16:00', detail: 'Paused', display: 'dots',
    art: `<div class="timer-scale">${meter(100, 'Time remaining')}</div>`, controls: action('down', 'Remove one minute', 'minus') + action('up', 'Add one minute', 'plus') + action('reset', 'Reset timer', 'reset') + playback('Start timer'),
    behavior: `let duration = 960, remaining = duration, deadline = 0;
    function draw(){ if (deadline) remaining = Math.max(0,(deadline - Date.now()) * speed / 1000); show(time(Math.ceil(remaining))); fill(duration ? remaining / duration * 100 : 0);
      if (!remaining) { deadline = 0; note('Done'); togglePlay(true,'timer'); } }
    function start(){ deadline = Date.now() + remaining * 1000 / speed; }
    click('play', () => { if (deadline) { draw(); deadline = 0; if (remaining) note('Paused'); } else { if (!remaining) remaining = duration || (duration = 960); start(); note('Running'); } togglePlay(!deadline,'timer'); draw(); });
    click('reset', () => { deadline = 0; duration = remaining = 960; note('Paused'); togglePlay(true,'timer'); draw(); });
    function adjust(delta){ draw(); remaining = Math.max(0,Math.min(5999,remaining + delta)); if (!deadline || remaining > duration) duration = remaining;
      if (deadline) start(); else if (remaining) note('Paused'); draw(); }
    click('down', () => adjust(-60)); click('up', () => adjust(60));
    setInterval(() => { if (deadline && !document.hidden) draw(); }, 250);`,
  },
  lock: {
    title: 'Smart lock', accent: '#dbe88f', value: '', detail: 'Hold to unlock · Demo', layout: 'center',
    art: `<div class="lock-art"><svg class="lock-progress" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="45"/><circle class="hold-progress" cx="50" cy="50" r="45" transform="rotate(-90 50 50)"/></svg>${action('hold', 'Hold to unlock', 'lock')}</div>`,
    behavior: `let unlocked = false, hold = 0, x = 0, y = 0;
    const button = by('hold');
    function finish(){ unlocked = !unlocked; card.classList.toggle('unlocked',unlocked); const label = unlocked ? 'Hold to lock' : 'Hold to unlock'; button.setAttribute('aria-label',label); note(label + ' · Demo');
      button.querySelector('path').setAttribute('d',unlocked ? 'M5 11h14v9H5zm3 0V8a4 4 0 0 1 7-2' : '${controls.lock}'); window.TelegramWidget?.HapticFeedback?.selectionChanged?.(); }
    function stop(){ if (hold) clearTimeout(hold); hold = 0; card.classList.remove('holding'); }
    button.addEventListener('pointerdown', event => { if (hold || event.button > 0) return; button.setPointerCapture?.(event.pointerId); x = event.clientX; y = event.clientY; card.classList.add('holding'); hold = setTimeout(() => { stop(); finish(); }, 850 / speed); });
    button.addEventListener('pointermove', event => { if (hold && Math.hypot(event.clientX - x,event.clientY - y) > 16) stop(); });
    ['pointerup','pointercancel','lostpointercapture'].forEach(event => button.addEventListener(event,stop));
    button.addEventListener('click', event => { if (!window.TelegramWidget && event.detail === 0) finish(); });`,
  },
  clock: {
    title: 'Clock', accent: '#dbe78a', value: '12:00', detail: 'Local time', layout: 'side', headerControls: true,
    art: '<button type="button" id="clock" class="clock" aria-label="Show digital clock"><svg viewBox="0 0 110 110" aria-hidden="true"><circle cx="55" cy="55" r="48" class="clock-ticks" stroke-dasharray="1.25 3.777"/><circle cx="55" cy="55" r="48" class="clock-major" stroke-dasharray="2 23.13"/></svg><span id="hour-hand" class="hand hour"></span><span id="minute-hand" class="hand"></span><span id="second-hand" class="hand second"></span><span class="pin"></span><span id="digital-clock"></span></button>',
    controls: options(['Local', 'UTC']),
    behavior: `let utc = false, digital = false;
    function draw(){ const now = new Date(), hour = utc ? now.getUTCHours() : now.getHours(), minute = utc ? now.getUTCMinutes() : now.getMinutes(), second = now.getSeconds();
      const reading = String(hour).padStart(2,'0') + ':' + String(minute).padStart(2,'0'); show(reading); by('digital-clock').textContent = reading;
      by('hour-hand').style.transform = 'rotate(' + (hour * 30 + minute / 2) + 'deg)';
      by('minute-hand').style.transform = 'rotate(' + minute * 6 + 'deg)';
      by('second-hand').style.transform = 'rotate(' + second * 6 + 'deg)'; }
    click('clock', () => { digital = !digital; by('clock').classList.toggle('digital',digital); by('clock').setAttribute('aria-label',digital ? 'Show analog clock' : 'Show digital clock'); });
    choose(i => { utc = Boolean(i); note(utc ? 'Coordinated Universal Time' : 'Local time'); draw(); }); draw();
    setInterval(() => { if (!document.hidden) draw(); }, 1000);`,
  },
  calendar: {
    title: 'Calendar', accent: '#afaaff', value: '', detail: 'This week', layout: 'list', headerControls: true,
    art: '<div id="calendar" class="calendar">' + weekdayNames.map(day => `<div><span>${day[0]}</span><button type="button" class="date"></button></div>`).join('') + '</div><div id="agenda" class="agenda"></div>',
    controls: stepButtons('week'),
    behavior: `let week = 0, selected = (new Date().getDay() + 6) % 7;
    const agenda = ${JSON.stringify(agenda)};
    const dateFormat = new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',weekday:'long'});
    function dateAt(i){ const date = new Date(); date.setDate(date.getDate() - (date.getDay() + 6) % 7 + week * 7 + i); return date; }
    function draw(){ note(dateFormat.format(dateAt(selected))); by('calendar').querySelectorAll('button').forEach((button,i) => {
      const date = dateAt(i); button.textContent = String(date.getDate()); button.setAttribute('aria-label',dateFormat.format(date)); button.setAttribute('aria-pressed',String(i === selected)); });
      const events = week === 0 ? agenda[selected] : [];
      by('agenda').innerHTML = events.length ? events.map(([time,title]) => '<p><time>' + time + '</time> ' + title + '</p>').join('') : '<p>No events</p>'; }
    click('prev', () => { week--; draw(); }); click('next', () => { week++; draw(); });
    by('calendar').querySelectorAll('button').forEach((button,i) => button.addEventListener('click',() => { selected = i; draw(); })); draw();`,
  },
  reminders: {
    title: 'Reminders', accent: '#dce885', value: '1', unit: 'of 4', detail: '', layout: 'list',
    art: `<div id="reminders" class="reminders">${['Send revised proposal', 'Pay the hosting invoice', 'Buy coffee beans', 'Call the dentist'].map((task,i) => `<button type="button" aria-pressed="${i === 2}"><span aria-hidden="true">${i === 2 ? '✓' : '○'}</span>${task}</button>`).join('')}</div>`,
    behavior: `let done = [false,false,true,false];
    try { const saved = JSON.parse(localStorage.getItem('bloom-reminders')); if (Array.isArray(saved) && saved.length === done.length && saved.every(value => typeof value === 'boolean')) done = saved; } catch {}
    const tasks = by('reminders').querySelectorAll('button');
    function draw(){ show(done.filter(Boolean).length); tasks.forEach((button,i) => { button.setAttribute('aria-pressed',String(done[i])); button.querySelector('span').textContent = done[i] ? '✓' : '○'; }); }
    tasks.forEach((button,i) => button.addEventListener('click',() => { done[i] = !done[i]; try { localStorage.setItem('bloom-reminders',JSON.stringify(done)); } catch {} draw(); })); draw();`,
  },
  music: {
    title: 'Now playing', accent: '#ffb780', value: '0:00', detail: 'Gymnopédie No. 1 · Erik Satie', layout: 'player',
    backdrop: '<div class="record" aria-hidden="true"></div>',
    art: `<div id="scrub" class="scrub music-scrub"><div class="waveform" aria-hidden="true">${[21, 36, 47, 32, 62, 81, 36, 49, 90, 75, 39, 51, 72, 90, 59, 42, 28, 62, 46, 25, 34, 64, 88, 60, 48, 33, 54, 72, 54, 28, 38, 57, 43, 27].map(height => `<i style="height:${height}%"></i>`).join('')}</div>${meter(0, 'Seek in demo track')}</div>`,
    controls: action('prev', 'Previous track', 'previous') + playback('Play track') + action('next', 'Next track', 'next'),
    behavior: `const names = ['Gymnopédie No. 1','Nocturne Op. 9 No. 2','Nocturne Op. 9 No. 1','Nocturne Op. 55 No. 1','Nocturne Op. 72 No. 1'], lengths = [205,259,397,317,273];
    let track = 0, elapsed = 0, origin = 0;
    function setPlaying(playing){ togglePlay(!playing,'track'); if (!playing) by('play').setAttribute('aria-label','Play track'); card.classList.toggle('playing',playing); }
    function draw(){ const current = Math.min(lengths[track],elapsed + (origin ? (Date.now() - origin) * speed / 1000 : 0));
      show(time(current)); fill(current / lengths[track] * 100); note(names[track] + ' · ' + (track ? 'Frédéric Chopin' : 'Erik Satie'));
      if (current === lengths[track] && origin) { elapsed = current; origin = 0; setPlaying(false); } }
    function advance(direction){ track = (track + direction + names.length) % names.length; elapsed = 0; if (origin) origin = Date.now(); draw(); }
    click('prev', () => advance(-1)); click('next', () => advance(1));
    click('play', () => { if (origin) { elapsed += (Date.now() - origin) * speed / 1000; origin = 0; } else { if (elapsed >= lengths[track]) elapsed = 0; origin = Date.now(); } setPlaying(Boolean(origin)); draw(); });
    scrub('scrub', fraction => { elapsed = Math.round(fraction * lengths[track]); if (origin) origin = Date.now(); draw(); });
    setInterval(() => { if (origin && !document.hidden) draw(); }, 250);`,
  },
  stocks: {
    title: 'BTC', accent: '#efb2a4', value: '$66,318', detail: '−3.05% · 24 h', headerControls: true,
    art: `<div class="scrub stock-chart" id="scrub">${spark(userLine).replace('</svg>', '<path id="guide" class="gridline"/><circle id="price-dot" r="3" fill="var(--accent)"/></svg>')}</div>`,
    controls: options(['BTC', 'ETH']),
    behavior: `const assets = ${JSON.stringify(assets)};
    let symbol = 0;
    function pick(i){
      const asset = assets[symbol], history = asset.history, x = Math.round(i * 260 / (history.length - 1)), y = Math.round(history[i] * 1.4);
      show('$' + integer(Math.round(asset.price + (history[history.length - 1] - history[i]) * asset.price / 1600)));
      by('guide').setAttribute('d','M' + x + ' 0V72'); const dot = by('price-dot'); dot.setAttribute('cx',x); dot.setAttribute('cy',y);
    }
    function draw(){ const asset = assets[symbol]; by('title').textContent = asset.code; note(asset.change + ' · 24 h');
      line(asset.history.map(value => Math.round(value * 1.4))); pick(asset.history.length - 1); }
    choose(i => { symbol = i; draw(); }); scrub('scrub', fraction => pick(Math.round(fraction * (assets[symbol].history.length - 1)))); draw();`,
  },
} satisfies Record<string, Preset>

export const TELEGRAM_WIDGET_IDS = Object.keys(presets)

function digitPath(value: string) {
  const glyphs: Record<string, string> = {
    '0': '0ehhhhhe', '1': '04c4444e', '2': '0eh1248v', '3': '0u11e11u',
    '4': '026aiv22', '5': '0vggu11u', '6': '0egguhhe',
    '7': '0v124888', '8': '0ehhehhe', '9': '0ehhf11e',
    ':': '00100100', '.': '00000001', ',': '00000011', '$': '04fke5u4',
  }
  let path = '', left = 2
  for (const character of value) {
    const rows = glyphs[character]
    if (!rows) continue
    const narrow = character === ':' || character === '.' || character === ','
    for (let y = 1; y <= 7; y++) {
      const mask = Number.parseInt(rows[y] || '0', 32)
      for (let x = 0; x < (narrow ? 1 : 5); x++) {
        if (mask & (narrow ? 1 : 16 >> x)) path += `M${left + x * 4} ${y * 4 - 2}h.01`
      }
    }
    left += narrow ? 7 : 22
  }
  return { path, width: Math.max(1, left - 3) }
}

const styles = `
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font:500 13px/1.35 system-ui,sans-serif;color:#f8f7fa;font-variant-numeric:tabular-nums}
.card{position:relative;padding:16px clamp(20px,5vw,30px);padding-bottom:max(16px,calc(var(--tg-content-safe-area-inset-bottom,env(safe-area-inset-bottom,0px)) + 6px));
  background:radial-gradient(ellipse at 0 0,var(--rim),var(--shade) 35%,transparent 76%),radial-gradient(ellipse at 100% 112%,var(--rim),var(--shade) 37%,transparent 75%),#121116;
  box-shadow:inset 0 0 0 1px #ffffff14}
.head,.body,.foot{position:relative;z-index:1}
.head{min-height:32px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px}
h1{margin:0;display:flex;align-items:center;gap:7px;color:#fff;font-size:14px;font-weight:600;line-height:1.25}
h1 svg{flex:none;color:#e3dfe9}
.body{display:grid;gap:12px;margin-top:12px}
.reading{display:grid;align-content:start;min-width:0;gap:4px}
.metric{display:flex;align-items:baseline;gap:5px;min-width:0}
.value{font-size:clamp(27px,10vw,46px);line-height:1;font-weight:500;letter-spacing:-.05em;color:#fff}
.dots{height:clamp(25px,12vw,40px);width:auto;min-width:0;max-width:100%;flex-shrink:1;overflow:visible;align-self:center}
.unit,.detail{color:#dfdbe6;font-size:12px}
.dots+.unit{align-self:flex-end;padding-bottom:3px}
.unit:empty{display:none}
.detail{margin:0;overflow-wrap:break-word}
.art{height:84px;display:flex;align-items:center;justify-content:center;position:relative;min-width:0}
.foot{display:flex;justify-content:flex-end;margin-top:12px}
.actions{display:flex;align-items:center;flex-wrap:wrap;gap:6px;min-width:0}
button{font:inherit;color:inherit;cursor:pointer;transition:transform 130ms ease,background 130ms ease,box-shadow 130ms ease}
.action,.choice,.date{border:0;display:inline-flex;align-items:center;justify-content:center}
.action{width:40px;height:40px;padding:0;border-radius:50%;background:#ffffff15;color:#fff;box-shadow:inset 0 0 0 1px #ffffff1e;flex:none}
.action:last-child,.action#play{background:#f5f3f7;color:#1a1721}
.action#play~.action{background:#ffffff15;color:#fff}
.action:disabled{color:#f2edf795;background:#ffffff0f}
button:active{transform:scale(.96);box-shadow:inset 0 0 0 1px #ffffff54}
.choices{display:flex;align-items:center;flex-wrap:wrap;gap:2px;padding:2px;border-radius:999px;background:#08080d65;box-shadow:inset 0 0 0 1px #ffffff24}
.choice{min-height:34px;border-radius:999px;padding:0 10px;background:transparent;font-size:11px;font-weight:600}
.choice[aria-pressed=true],.date[aria-pressed=true]{background:#f5f3f7;color:#1a1721}
.still *,.still *::before,.still *::after{animation:none!important;transition:none!important}
.still button:active{transform:none}
@media(prefers-reduced-motion:reduce){.card *,.card *::before,.card *::after{animation:none!important;transition:none!important}.card button:active{transform:none}}
@media(max-width:239px){
  .value{font-size:clamp(25px,12vw,34px)}.choice{padding:0 7px}
  .head .actions{gap:4px}.head .action{width:34px;height:34px}
}
`

const layoutStyles: Record<NonNullable<Preset['layout']>, string> = {
  side: `
.body{display:flex;align-items:center;justify-content:space-between;min-height:106px}
.reading{flex:1 1 50%}
.art{width:min(44%,112px);height:106px;flex:none}
.dots{max-width:74%}
@media(min-width:470px){.art{width:min(42%,160px);height:134px}}`,
  dial: `
.body{display:grid;justify-items:center;gap:0}
.art{width:100%;height:100px;order:-1}
.reading{text-align:center;justify-items:center;margin-top:-5px}
.foot{justify-content:center}`,
  water: `
.card{min-height:220px}
.body{margin-top:39px}
.metric{flex-direction:column;align-items:flex-start;gap:6px}
.metric .dots{align-self:flex-start}
.metric .dots+.unit{align-self:flex-start;padding:0}
.foot{margin-top:24px;justify-content:stretch}
.foot .actions{justify-content:space-between;width:100%}
#glasses{font-size:12px;color:#fff}`,
  center: `
.art{height:105px;order:-1}
.reading{text-align:center}`,
  list: `.art{height:auto}`,
  player: `
.body{margin-top:13px;gap:14px}
.reading{padding-left:63px;min-height:51px}
.metric .value{font-size:clamp(26px,9vw,34px)}
.art{height:50px}
.foot{justify-content:center}`,
}

// Inline only the visual rules each standalone document uses.
const visualStyles: Record<string, string> = {
  bars: `
.bars{width:100%;height:100%;display:flex;align-items:flex-end;gap:6px;padding-top:6px}
.bar{position:relative;flex:1;min-width:0;border-radius:5px 5px 2px 2px;background:#f3eafd36;transition:height var(--ease) ease,background var(--ease) ease}
.bar[hidden]{display:none}
.bar.selected{background:var(--accent)}
.bars.labeled{height:calc(100% - 19px);margin-bottom:19px}
.bar span{position:absolute;top:calc(100% + 5px);left:50%;transform:translateX(-50%);color:#e0dce9;font-size:10px;white-space:nowrap}`,
  chart: `
.chart{height:100%;width:100%;overflow:visible}
.spark,.trace{fill:none;stroke:var(--accent);stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.plot-top{stop-color:var(--accent);stop-opacity:.27}`,
  gridline: '.gridline{stroke:#ffffff23;stroke-width:1;fill:none}',
  ecg: `
.trace{stroke:#fff7ba;stroke-width:2;stroke-dasharray:31 510;animation:trace var(--sweep) linear infinite}
.paused .trace,.still .trace{visibility:hidden}
@media(prefers-reduced-motion:reduce){.trace{visibility:hidden}}
@keyframes trace{from{stroke-dashoffset:37}to{stroke-dashoffset:-504}}`,
  gauge: `
.gauge{width:185px;max-width:100%;height:100%}
.arc{fill:none;stroke:#ffffff26;stroke-width:9;stroke-linecap:round}
.arc.lit{stroke:url(#gauge-fill);transition:stroke-dasharray var(--ease) ease}
.gauge-stop{stop-color:var(--accent)}`,
  rings: `
.rings{width:100%;max-width:124px;aspect-ratio:1;padding:0;border:0;border-radius:50%;background:#10101655}
.rings svg{display:block;width:100%;height:100%}
.ring{opacity:.47;transition:opacity var(--ease) ease}
.ring.selected{opacity:1}`,
  sleep: `
.sleep{width:100%;height:100%;display:flex;gap:clamp(1px,.7vw,3px);
  background:repeating-linear-gradient(to bottom,#ffffff18 0 1px,transparent 1px 20px)}
.sleep i{position:relative;top:calc(8px + var(--stage) * 18px);flex:1;height:6px;border-radius:4px}
.sleep i.selected{outline:1px solid #fff;outline-offset:1px}
.sleep i.selected::after{content:'';position:absolute;left:50%;top:calc(-8px - var(--stage) * 18px);height:82px;width:1px;background:#dfd0ff60}
.s0{background:#ef9d90}.s1{background:#dee780}.s2{background:var(--accent)}.s3{background:#e5e2ff}`,
  lung: `
.lung{width:100%;height:100%}
.lung-grid{fill:none;stroke:#eecae054;stroke-width:1}
.lung-grid{stroke-dasharray:1 4}`,
  water: `
.water-window{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.water{position:absolute;bottom:-23px;left:0;width:100%;height:var(--level);background:linear-gradient(var(--water-top),var(--water-low));pointer-events:none;
  transition:height var(--water-ease) cubic-bezier(.2,.7,.24,1)}
.wave{position:absolute;left:0;width:200%;pointer-events:none}
.rear{top:-23px;height:23px;fill:var(--water-rear);animation:wave var(--tide-slow) linear -2s infinite reverse}
.front{top:-17px;height:19px;fill:var(--water-top);animation:wave var(--tide-fast) linear infinite}
@keyframes wave{to{transform:translateX(-50%)}}`,
  'breath-field': `
.breath-field{display:grid;place-items:center;width:100%;height:100%;border-radius:50%;
  background:radial-gradient(circle,var(--halo),transparent 70%)}
.orb{width:68px;max-width:90%;aspect-ratio:1;border-radius:50%;border:1px solid #e8b5ce70;
  box-shadow:0 0 0 6px #ffffff0b,inset 0 0 0 6px #fff1f413;
  background:radial-gradient(circle at 39% 37%,var(--accent),var(--shade) 58%,#160b1b 100%);transition:transform 90ms linear}`,
  'glucose-ring': `
.glucose-ring{width:100%;max-width:112px;aspect-ratio:1;display:grid;place-content:center;text-align:center;position:relative}
.glucose-ring svg{position:absolute;inset:0;width:100%;height:100%;fill:none;stroke:var(--accent);stroke-width:2}
.ring-base{stroke:#ffffff25}
.glucose-ring span{font-size:20px;line-height:1.1}
.glucose-ring small{color:#e7dce8;font-size:10px}`,
  weather: `
.weather{position:relative;width:100%;height:100%}
.sun-disc{position:absolute;top:4px;right:6px;width:74%;max-width:75px;aspect-ratio:1;border-radius:50%;
  background:radial-gradient(circle at 20% 34%,#100e16 4%,#14111b 44%,var(--accent) 97%);opacity:.87;transition:opacity var(--ease) ease,transform var(--ease) ease}
.cloud{position:absolute;left:0;bottom:13px;width:100%;height:auto;opacity:.73;transition:opacity var(--ease) ease,transform var(--ease) ease}
.rain{visibility:hidden}
.weather[data-sky=clear] .cloud{opacity:0}
.weather[data-sky=rain] .sun-disc{opacity:.15;transform:translate(5px,6px)}
.weather[data-sky=rain] .cloud{opacity:.89;transform:translateY(-8px)}
.weather[data-sky=rain] .rain{visibility:visible}`,
  scrub: '.scrub{width:100%;height:100%;touch-action:pan-y;cursor:ew-resize;display:flex;align-items:center;justify-content:center;user-select:none;-webkit-tap-highlight-color:transparent}',
  hourly: `
.art{height:116px}
.hourly{position:relative;align-items:flex-end}
.hourly-line{position:absolute;top:0;width:100%;height:70px;overflow:visible}
.forecast{fill:none;stroke:#f8f4fc;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.guide{fill:none;stroke:var(--accent);stroke-width:1;stroke-dasharray:1.5 3}
.hourly .bars{height:28px;gap:10px}
.hourly .bar{background:#b9b2f755;border-radius:2px}
.hourly .bar.selected{background:var(--accent)}
.hourly .bar span{font-size:9px}`,
  'uv-dial': '.uv-dial{width:100%;height:auto;overflow:visible}.uv-dial #marker{stroke:var(--accent);stroke-width:1.5}',
  compass: `
.compass{width:100%;max-width:106px;aspect-ratio:1;position:relative;display:grid;place-items:center;border-radius:50%;background:#0c201ab3}
.compass>svg:first-child{position:absolute;inset:0;width:100%;height:100%}
.ticks{fill:none;stroke:#ffffff71;stroke-width:2.2}
.compass span{position:absolute;top:13%;left:0;right:0;text-align:center;font-size:11px}
.needle{width:52%;height:52%;transition:transform var(--ease) ease}`,
  'sun-path': `
.dusk{position:absolute;inset:0;pointer-events:none;opacity:0;background:linear-gradient(180deg,#090a21,#141024 65%,#422523);transition:opacity var(--ease) ease-out}
.sun-path{width:100%;height:100%;overflow:visible}
.sun-arc{fill:none;stroke:#ffda8a91;stroke-width:1;stroke-dasharray:1 3.5}
#sun-glow{transition:r var(--ease) ease}
.scrub:active #sun-glow{r:14px}`,
  funnel: `
.art{height:auto}
.funnel{width:100%;display:grid;gap:3px}
.funnel-row{border:0;border-radius:6px;background:transparent;min-height:32px;padding:4px 6px;display:grid;grid-template-columns:52px minmax(15px,1fr) 38px;align-items:center;gap:6px;color:#dad4e2;text-align:left;font-size:11px}
.funnel-track{height:9px;border-radius:9px;background:#f1ecff16;overflow:hidden}
.funnel-row i{display:block;height:100%;min-width:4px;border-radius:9px;background:#aaa9dfbb;transition:background var(--ease) ease}
.funnel-row b{font-weight:500;text-align:right}
.funnel-row[aria-pressed=true]{color:#fff;background:#ffffff12}
.funnel-row[aria-pressed=true] i{background:var(--accent)}`,
  'traffic-art': `
.art{height:auto}
.traffic-art{width:100%;display:flex;align-items:center;gap:10px}
.source-ring{width:78px;height:78px;flex:none}
.source-ring circle{transition:stroke-width var(--ease) ease}
.source-key{display:grid;gap:3px;flex:1;min-width:0}
.source{min-height:32px;padding:4px 6px;display:grid;align-items:center;grid-template-columns:6px 1fr auto;gap:5px;border:0;border-radius:5px;background:transparent;text-align:left;color:#eee5ee;font-size:11px}
.source i{width:5px;height:5px;border-radius:50%}
.source[aria-pressed=true]{background:#ffffff20}
.source b{font-weight:500}
@media(max-width:239px){.traffic-art{gap:5px}.source-ring{width:47px;height:47px}.source{padding:4px 3px;gap:3px}}`,
  cohorts: `
.art{height:auto}
.cohorts{width:100%;display:grid;gap:4px}
.cohort{display:grid;align-items:center;grid-template-columns:27px repeat(8,minmax(0,1fr));gap:3px}
.cohort span{color:#dbefe8;font-size:11px}
.cohort button{height:clamp(22px,8vw,32px);min-width:0;padding:0;border:0;border-radius:4px;background:rgba(211,238,231,var(--cell))}
.cohort button[aria-pressed=true]{box-shadow:inset 0 0 0 2px var(--accent)}`,
  climate: `
.art{height:auto;min-height:190px;flex-direction:column}
.climate{width:min(100%,152px);height:145px}
.climate svg{height:100%;width:100%;overflow:visible}
.climate-actions{display:flex;justify-content:center;gap:6px;margin-top:6px}
.climate-actions .action{background:#ffffff15;color:#fff}
.climate-ticks,.climate-progress{fill:none;stroke-width:8}
.climate-ticks{stroke:#eaf8f840;stroke-dasharray:1.25 4.25}
.climate-progress{stroke:var(--accent)}
.reading{position:absolute;top:57px;pointer-events:none;width:116px;gap:3px}
.detail{font-size:10px;color:#e2f0e9}`,
  track: `
.track{width:100%;height:8px;border-radius:999px;background:#ffffff28;overflow:hidden}
.track div{height:100%;border-radius:999px;background:var(--accent);transition:width var(--ease) ease}`,
  bulb: `
.body{padding-bottom:29px}
.art{position:static}
.bulb{position:relative;width:72px;max-width:calc(100% - 12px);aspect-ratio:1;display:grid;place-items:center;color:#f9edcf}
.bulb::before{content:'';position:absolute;inset:-6px;border-radius:50%;opacity:var(--brightness,.65);
  background:radial-gradient(circle,var(--accent),var(--shade) 53%,transparent 71%);transition:opacity var(--ease) ease}
.bulb svg{position:relative}
.dimmer{position:absolute;bottom:-2px;left:0;height:35px}`,
  'timer-scale': `
.art{height:42px}
.timer-scale{width:100%}
.timer-scale .track{height:24px;background:repeating-linear-gradient(to right,#ffffff25 0 2px,transparent 2px 6px);border-radius:0}
.timer-scale .track div{background:repeating-linear-gradient(to right,var(--accent) 0 2px,transparent 2px 6px);border-radius:0}`,
  'lock-art': `
.lock-art{position:relative;width:94px;height:94px;display:grid;place-items:center}
.lock-progress{position:absolute;width:100%;height:100%;pointer-events:none}
.lock-progress circle{stroke:#ffffff2c;stroke-width:2;fill:none}
.lock-progress .hold-progress{stroke:var(--accent);stroke-width:3;stroke-dasharray:283;stroke-dashoffset:283}
#hold{width:72px;height:72px;touch-action:none;background:#ffffff12;color:#fff}
#hold svg{width:27px;height:27px}
.holding .hold-progress{stroke-dashoffset:0;transition:stroke-dashoffset var(--hold) linear}
.unlocked #hold{color:var(--accent);background:#dfe88d24}`,
  clock: `
.clock{width:100%;max-width:128px;aspect-ratio:1;border:0;padding:0;border-radius:50%;background:#0d0d13;position:relative;display:grid;place-items:center}
.clock svg{position:absolute;inset:0;width:100%;height:100%;fill:none;stroke:#ffffff65;stroke-width:2}
.clock .clock-major{stroke:#e9edf0;stroke-width:2.5}
.hand{position:absolute;left:calc(50% - 1px);bottom:50%;height:35%;width:2px;transform-origin:50% 100%;border-radius:3px;background:#fff}
.hand.hour{height:24%;width:3px}
.hand.second{height:38%;width:1px;background:var(--accent)}
.pin{width:5px;height:5px;border-radius:50%;background:#fff;z-index:1}
#digital-clock{display:none;color:var(--accent);font-size:clamp(14px,5vw,24px)}
.clock.digital #digital-clock{display:block}
.clock.digital svg,.clock.digital .hand,.clock.digital .pin{display:none}`,
  calendar: `
.art{order:-1;display:grid;justify-content:stretch;gap:8px}
.calendar{width:100%;display:grid;grid-template-columns:repeat(7,1fr);gap:3px}
.calendar>div{display:grid;justify-items:center;gap:4px;min-width:0;color:#dad6f4;font-size:11px}
.date{width:100%;height:35px;padding:0;border-radius:999px;background:#ffffff15;font-size:12px}
.date[aria-pressed=true]{box-shadow:inset 0 0 0 2px var(--accent)}
.agenda{min-height:36px;color:#e7e0f4;font-size:11px}
.agenda p{margin:2px 0}.agenda time{color:var(--accent);padding-right:5px}`,
  reminders: `
.reminders{display:grid;gap:4px;width:100%}
.reminders button{min-height:36px;padding:4px 8px;display:flex;align-items:center;gap:8px;border-radius:6px;border:0;background:#ffffff10;text-align:left}
.reminders button span{width:18px;flex:none;text-align:center;color:var(--accent)}
.reminders button[aria-pressed=true]{color:#d7d1e5;background:#ffffff1c}`,
  waveform: `
.music-scrub{position:relative}
.waveform{height:39px;width:100%;display:flex;align-items:center;gap:2px}
.waveform i{flex:1;min-width:1px;border-radius:999px;background:#ffe9de65}
.music-scrub .track{height:3px;position:absolute;bottom:0;left:0}`,
  record: `
.record{width:47px;height:47px;position:absolute;left:20px;top:60px;border-radius:50%;
  background:radial-gradient(circle,#2b1b1b 0 12%,#f4d9b887 13% 16%,transparent 17%),conic-gradient(var(--accent),#cc6779,#f5cf79,#a5ae70,var(--accent))}
.playing .record{animation:record-spin var(--sweep) linear infinite}
@keyframes record-spin{to{transform:rotate(360deg)}}`,
}

const cardStyles: Record<string, string> = {
  'heart-rate': '.art{height:68px}',
  'lung-capacity': '.reading{text-align:center;justify-items:center}.metric{flex-direction:column;align-items:center}.metric .unit{align-self:center}.dots{height:clamp(42px,13vw,62px)}.art{height:clamp(80px,30vw,116px)}',
  steps: '.bars{background:repeating-linear-gradient(to top,#ffffff16 0 1px,transparent 1px 24px)}.bar{background:radial-gradient(circle,#ffffff70 1.15px,transparent 1.55px) center bottom/6px 6px repeat-y}.bar.selected{background:radial-gradient(circle,var(--accent) 1.3px,transparent 1.7px) center bottom/6px 6px repeat-y}',
  weather: '.value{font-size:clamp(35px,16vw,60px)}',
  'air-quality': '.spark{stroke:#f5f4e5}',
  revenue: `.art{height:105px}.revenue-chart{width:100%;height:100%}.revenue-chart svg{position:absolute;top:6px;width:100%;height:calc(100% - 25px);pointer-events:none;overflow:visible}
.bars{gap:0}.bar{margin:0 3px;border-radius:999px}
#curve{fill:none;stroke:#ffffff83;stroke-width:1.3}.bar.selected{background:#fcfaff}.bar.selected::before{content:"";position:absolute;top:-9px;left:calc(50% - 2.5px);width:5px;height:5px;border-radius:50%;background:var(--accent)}`,
  goal: '.art{height:101px}.goal-scrub{width:min(185px,100%)}',
  energy: '.bars{gap:clamp(2px,1vw,6px);background:repeating-linear-gradient(to top,#ffffff16 0 1px,transparent 1px 24px)}',
  timer: '@media(max-width:239px){.foot .actions{gap:4px}.foot .action{width:36px;height:36px}}',
  stocks: '.stock-chart{padding:0 5px}#guide{stroke-dasharray:2 3}',
}

const runtime = `
const card = document.querySelector('.card');
const by = id => document.getElementById(id);
const click = (id,fn) => by(id).addEventListener('click',fn);
const note = text => { const label = by('detail'); if (label && label.textContent !== text) label.textContent = text; };
`

function valueScript(dotted: boolean) {
  const write = dotted ? `
    const next = matrix(text);
    display.setAttribute('viewBox','0 0 ' + next.width + ' 28');
    display.setAttribute('aria-label',text);
    by('digits-path').setAttribute('d',next.path);` : 'display.textContent = text;'
  return `
` + (dotted ? 'const matrix = (' + digitPath.toString() + ');' : '') + `
const display = by('value');
let value = display?.getAttribute('aria-label') || display?.textContent;
function show(number,unit){
  const text = String(number);
  if (text !== value) { value = text; ` + write + ` }
  if (unit !== undefined) by('unit').textContent = unit;
}
`
}

const featureScripts = {
  integer: "const integer = new Intl.NumberFormat('en-US').format;",
  time: "const time = seconds => Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2,'0');",
  togglePlay: `
function togglePlay(paused,label){
  const button = by('play');
  button.setAttribute('aria-label',(paused ? 'Start ' : 'Pause ') + label);
  button.querySelector('path').setAttribute('d',paused ? '${controls.play}' : '${controls.pause}');
}`,
  choose: `
function choose(select){
  const buttons = document.querySelectorAll('[data-choice]');
  buttons.forEach((button,i) => button.addEventListener('click',() => {
    buttons.forEach((item,j) => item.setAttribute('aria-pressed',String(i === j)));
    select(i);
  }));
}`,
  browse: `
function browse(length,initial,draw){
  let index = initial;
  function jump(value){ const next = (value + length) % length; if (next !== index) { index = next; draw(index); } }
  click('prev', () => jump(index - 1)); click('next', () => jump(index + 1));
  return jump;
}`,
  columns: `
function columns(values,active){
  by('bars').querySelectorAll('.bar').forEach((bar,i) => {
    bar.style.height = values[i] + '%'; bar.classList.toggle('selected',i === active);
  });
}`,
  plot: `
function plot(path){
  by('spark').setAttribute('d',path); by('area').setAttribute('d',path + 'L260 72H0Z');
}`,
  line: `
function line(values){
  plot(values.map((height,i) => (i ? 'L' : 'M') + Math.round(i * 260 / (values.length - 1)) + ' ' + height).join(''));
}`,
  markArc: `
function markArc(percent){
  const angle = Math.PI * percent / 100;
  by('marker').setAttribute('cx',Math.round(85 - 71 * Math.cos(angle)));
  by('marker').setAttribute('cy',Math.round(78 - 71 * Math.sin(angle)));
}`,
  arc: `
function arc(percent){ by('arc').setAttribute('stroke-dasharray',Math.round(percent * 2.23) + ' 223'); markArc(percent); }`,
  fill: `
function fill(percent){ by('fill').style.width = percent + '%'; }`,
  scrub: `
function scrub(id,update){
  const area = by(id);
  let active = -1, left = 0, width = 1, startX = 0, startY = 0, dragging = false;
  const seek = event => update(Math.max(0,Math.min(1,(event.clientX - left) / width)));
  area.addEventListener('pointerdown',event => {
    if (active !== -1 || event.button > 0) return;
    const bounds = area.getBoundingClientRect();
    left = bounds.left; width = Math.max(1,bounds.width); active = event.pointerId;
    startX = event.clientX; startY = event.clientY; dragging = event.pointerType === 'mouse';
    area.setPointerCapture?.(active); if (dragging) seek(event);
  });
  area.addEventListener('pointermove',event => {
    if (active !== event.pointerId) return;
    const horizontal = Math.abs(event.clientX - startX);
    if (!dragging && horizontal >= 10 && horizontal > Math.abs(event.clientY - startY)) dragging = true;
    if (dragging) seek(event);
  });
  area.addEventListener('pointerup',event => { if (active === event.pointerId) { seek(event); active = -1; } });
  ['pointercancel','lostpointercapture'].forEach(name => area.addEventListener(name,event => { if (active === event.pointerId) active = -1; }));
}`,
}

const headerPaths: Record<string, string> = {
  'heart-rate': 'M3 12h4l2-5 4 10 2-5h6M3 12a5 5 0 0 1 9-6 5 5 0 0 1 9 6c-2 4-9 9-9 9s-7-5-9-9',
  activity: 'M3 12h4l3-7 4 14 3-7h4',
  steps: 'M4 19h6v-5h5V9h5M20 5v4',
  sleep: 'M21 15a9 9 0 1 1-12-12 8 8 0 0 0 12 12Z',
  'lung-capacity': 'M12 3v8m0-2-4 4m4-4 4 4M8 6c-3 0-6 7-6 11 0 3 6 3 7 0V8M16 6c3 0 6 7 6 11 0 3-6 3-7 0V8',
  hydration: 'M12 2C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-13ZM8 15a4 4 0 0 0 4 4',
  glucose: 'M4 17h16M4 12l5-3 5 4 6-7',
  breathing: 'M3 9h13a3 3 0 1 0-3-3M3 13h17a2 2 0 1 1-2 2M3 17h9a2 2 0 1 1-2 2',
  weather: 'M12 22s7-6 7-12A7 7 0 0 0 5 10c0 6 7 12 7 12Zm0-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  hourly: 'M4 15a3 3 0 0 1 1-6 5 5 0 0 1 10-1 4 4 0 0 1 1 8H5M8 20h1m5 0h1',
  'air-quality': 'M4 20c0-9 5-15 15-15 0 8-4 13-13 13m-2 2 8-8',
  'uv-index': 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2m0-14-2 2M7 17l-2 2m7-2a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
  wind: 'M3 8h14a3 3 0 1 0-3-3M3 12h18m-18 4h11a2 2 0 1 1-2 2',
  sun: 'M2 18h20M5 16a7 7 0 0 1 14 0M12 3v3M4 8l2 2m14-2-2 2',
  revenue: 'M3 18l6-7 4 3 7-8m-5 0h5v5',
  users: 'M4 20v-2a4 4 0 0 1 4-4h3a4 4 0 0 1 4 4v2m0-16a4 4 0 0 1 0 8m2 2a4 4 0 0 1 4 4v2M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
  funnel: 'M3 5h18l-7 8v6l-4 2v-8z',
  traffic: 'M12 3v9h9a9 9 0 1 1-9-9Zm3 0a8 8 0 0 1 6 6h-6Z',
  goal: 'M12 12h9A9 9 0 1 1 12 3a9 9 0 0 1 8 5m-8-1v5l-3 3',
  retention: 'M3 5h18v14H3zm0 5h18m-18 4h18M9 5v14m6-14v14',
  thermostat: 'M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0Zm2-4v7',
  lights: 'M9 18h6m-5 3h4M8 13a5 5 0 1 1 8 0l-1 2H9z',
  energy: 'M13 2 4 14h7l-1 8 10-12h-7z',
  timer: 'M9 2h6m-3 4v7l3 2m5-8 1-1m-1 7a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  lock: controls.lock,
  clock: 'M12 6v6l4 2m5-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  calendar: 'M4 6h16v14H4zm0 4h16M8 4v4m8-4v4',
  reminders: 'M5 4h14v16H5zm3 5 1 1 2-2m2 1h3m-8 6 1 1 2-2m2 1h3',
  music: 'M9 18V5l11-2v13M9 17c0-2-5-2-5 1 0 2 5 2 5-1Zm11-2c0-2-5-2-5 1 0 2 5 2 5-1Z',
  stocks: 'M5 7v10m-2-8h4v5H3zm9-7v13m-2-9h4v5h-4zm9 2v14m-2-10h4v5h-4z',
}

const tints: Record<string, string> = {
  'heart-rate': '#b62e2d', activity: '#42414b', steps: '#393941', sleep: '#5245be',
  'lung-capacity': '#a93781', hydration: '#303eae', glucose: '#ab687e', breathing: '#933659',
  weather: '#286da7', hourly: '#6541ad', 'air-quality': '#817b24', 'uv-index': '#a64223',
  wind: '#168466', sun: '#996222', revenue: '#6535af', users: '#45454d',
  funnel: '#333f9f', traffic: '#9c315d', goal: '#245999', retention: '#22816a',
  thermostat: '#127760', lights: '#936018', energy: '#215f9a', timer: '#92315d',
  lock: '#44424b', clock: '#41404a', calendar: '#413baf', reminders: '#6635a0',
  music: '#9d452c', stocks: '#a73530',
}

function clampOption(value: number | undefined, fallback: number, minimum: number, maximum: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(minimum, Math.min(maximum, value))
    : fallback
}

function rgbAlpha(hex: string, alpha: number) {
  const number = Number.parseInt(hex.slice(1), 16)
  return `rgba(${number >> 16},${(number >> 8) & 255},${number & 255},${alpha})`
}

function waterColor(hex: string, strength: number) {
  const color = Number.parseInt(hex.slice(1), 16)
  const mix = (shift: number, base: number) => Math.round(base + (((color >> shift) & 255) - base) * strength)
  return `rgb(${mix(16, 13)},${mix(8, 13)},${mix(0, 23)})`
}

export function buildTelegramHtml(id: string, options: TelegramWidgetOptions = {}): string {
  if (!Object.hasOwn(presets, id)) throw new RangeError(`Unknown Telegram widget: ${id}`)
  const preset: Preset = presets[id as keyof typeof presets]
  const accent = options.accent && /^#[a-f\d]{6}$/i.test(options.accent) ? options.accent : preset.accent
  const tint = options.tint && /^#[a-f\d]{6}$/i.test(options.tint) ? options.tint : tints[id]
  const glow = clampOption(options.glow, 1, 0, 2)
  const speed = clampOption(options.speed, 1, 0.25, 3)
  const reduced = options.reducedMotion === true
  const dots = preset.display === 'dots'
  const { path, width } = dots ? digitPath(preset.value) : { path: '', width: 0 }
  const readout = dots
    ? `<svg id="value" class="dots" viewBox="0 0 ${width} 28" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" role="img" aria-label="${preset.value}"><path id="digits-path" d="${path}"/></svg>`
    : `<strong id="value" class="value">${preset.value}</strong>`
  const metric = preset.value ? `<div class="metric">${readout}<span id="unit" class="unit">${preset.unit ?? ''}</span></div>` : ''
  const colors = [
    `--accent:${accent}`,
    `--rim:${rgbAlpha(tint, Number(Math.min(.98, glow * .94).toFixed(3)))}`,
    `--shade:${rgbAlpha(tint, Number((glow * .27).toFixed(3)))}`,
    `--ease:${Math.round(230 / speed)}ms`,
  ]
  if (id === 'heart-rate' || id === 'music') colors.push(`--sweep:${Math.round((id === 'music' ? 6600 : 2350) / speed)}ms`)
  if (id === 'lock') colors.push(`--hold:${Math.round(850 / speed)}ms`)
  if (id === 'breathing') colors.push(`--halo:${rgbAlpha(tint, Number((glow * .32).toFixed(3)))}`)
  if (id === 'hydration') colors.push(
    `--water-top:${waterColor(accent, .64)}`, `--water-low:${waterColor(accent, .49)}`, `--water-rear:${rgbAlpha(accent, .38)}`,
    `--water-ease:${Math.round(460 / speed)}ms`, `--tide-fast:${Math.round(8200 / speed)}ms`, `--tide-slow:${Math.round(10900 / speed)}ms`,
  )
  const artAndBackdrop = preset.art + (preset.backdrop ?? '')
  const artworkClasses = new Set(Array.from(artAndBackdrop.matchAll(/class="([^"]+)"/g), match => match[1].split(' ')).flat())
  const artworkStyles = Object.entries(visualStyles).filter(([name]) => artworkClasses.has(name)).map(([, css]) => css).join('\n')
  const replayStyles = (preset.controls ?? '').includes('replay') || preset.art.includes('replay') ? '.replay{min-height:40px;padding:0 14px;background:#ffffff16}' : ''
  const css = styles + replayStyles + (preset.layout ? layoutStyles[preset.layout] : '') + artworkStyles + (cardStyles[id] ?? '')
  const detail = preset.detail ? `<p id="detail" class="detail">${preset.detail}</p>` : ''
  const actions = preset.controls ? `<div class="actions">${preset.controls}</div>` : ''
  const art = preset.art ? `<div class="art">${preset.art}</div>` : ''
  const behavior = preset.behavior ?? ''
  const speedVariable = /\bspeed\b/.test(behavior) ? `const speed = ${speed};` : ''
  const motionVariable = /\bstill\b/.test(behavior) ? `const still = ${reduced} || matchMedia('(prefers-reduced-motion: reduce)').matches;` : ''
  const features = Object.entries(featureScripts).filter(([name]) =>
    new RegExp(`\\b${name}\\(`).test(behavior) || (name === 'plot' && behavior.includes('line(')) || (name === 'markArc' && behavior.includes('arc(')),
  ).map(([, code]) => code).join('\n')

  return `<!doctype html><html lang="en"><head><style>${css}</style></head><body><main class="card ${id}-card${reduced ? ' still' : ''}" style="${colors.join(';')}">
${preset.backdrop ?? ''}<header class="head"><h1>${lineIcon(headerPaths[id], 14)}<span id="title">${preset.title}</span></h1>${preset.headerControls ? actions : ''}</header>
<div class="body"><div class="reading">${metric}${detail}</div>${art}</div>
${actions && !preset.headerControls ? `<footer class="foot">${actions}</footer>` : ''}
</main><script>(() => {'use strict';${speedVariable}${motionVariable}
${runtime}${valueScript(dots)}${features}
${behavior}
window.TelegramWidget?.ready?.();})();</script></body></html>`
}
