/* ===== Skye Weather script.js =====
   IMPORTANT: Replace YOUR_API_KEY_HERE with your free key from
   https://openweathermap.org/api  (free, takes 2 mins to sign up)
   ================================== */

const API_KEY = 'YOUR_API_KEY_HERE';
const BASE    = 'https://api.openweathermap.org/data/2.5';

let unit     = 'metric';
let lastCity = '';

/* ── DOM ── */
const searchInput   = document.getElementById('searchInput');
const searchBtn     = document.getElementById('searchBtn');
const loader        = document.getElementById('loader');
const errCard       = document.getElementById('errCard');
const errMsg        = document.getElementById('errMsg');
const weatherDiv    = document.getElementById('weather');
const defaultState  = document.getElementById('defaultState');

/* ── Unit switch ── */
function setUnit(u) {
  unit = u;
  document.getElementById('btnC').classList.toggle('active', u === 'metric');
  document.getElementById('btnF').classList.toggle('active', u === 'imperial');
  if(lastCity) fetchWeather(lastCity);
}

/* ── Search ── */
searchBtn.addEventListener('click', go);
searchInput.addEventListener('keydown', e => { if(e.key === 'Enter') go(); });

function go() {
  const city = searchInput.value.trim();
  if(!city) return;
  fetchWeather(city);
}

/* ── Fetch ── */
async function fetchWeather(city) {
  lastCity = city;
  show(loader); hide(errCard); hide(weatherDiv); hide(defaultState);

  try {
    const [cur, fc] = await Promise.all([
      apiFetch(`${BASE}/weather?q=${enc(city)}&units=${unit}&appid=${API_KEY}`),
      apiFetch(`${BASE}/forecast?q=${enc(city)}&units=${unit}&appid=${API_KEY}`)
    ]);
    hide(loader);
    renderCurrent(cur);
    renderForecast(fc);
    show(weatherDiv);
  } catch(err) {
    hide(loader);
    errMsg.textContent = err.message || 'Could not fetch weather.';
    show(errCard);
    show(defaultState);
  }
}

async function apiFetch(url) {
  const res = await fetch(url);
  if(!res.ok) {
    if(res.status === 404) throw new Error('City not found. Check the spelling and try again.');
    if(res.status === 401) throw new Error('Invalid API key — please add your OpenWeatherMap key in script.js.');
    throw new Error(`Server error (${res.status}). Please try again.`);
  }
  return res.json();
}

/* ── Render current ── */
function renderCurrent(d) {
  const u   = unit === 'metric' ? '°C' : '°F';
  const wu  = unit === 'metric' ? 'km/h' : 'mph';
  const wm  = unit === 'metric' ? 3.6 : 1;

  document.getElementById('city').textContent    = d.name;
  document.getElementById('country').textContent = d.sys.country;
  document.getElementById('wdate').textContent   = fmtDate(new Date());
  document.getElementById('tempBig').textContent = Math.round(d.main.temp);
  document.getElementById('tempUnit').textContent= u;
  document.getElementById('cond').textContent    = d.weather[0].description;
  document.getElementById('condBadge').textContent = d.weather[0].main;
  document.getElementById('feels').textContent   = `Feels like ${Math.round(d.main.feels_like)}${u}`;

  const icon = document.getElementById('wicon');
  icon.src = `https://openweathermap.org/img/wn/${d.weather[0].icon}@2x.png`;
  icon.alt = d.weather[0].description;

  document.getElementById('sHum').textContent  = `${d.main.humidity}%`;
  document.getElementById('sWind').textContent = `${Math.round(d.wind.speed * wm)} ${wu}`;
  document.getElementById('sVis').textContent  = `${(d.visibility/1000).toFixed(1)} km`;
  document.getElementById('sPres').textContent = `${d.main.pressure} hPa`;

  setTheme(d.weather[0].main, d.weather[0].icon);
}

/* ── Render forecast ── */
function renderForecast(data) {
  const u    = unit === 'metric' ? '°C' : '°F';
  const days = {};

  data.list.forEach(item => {
    const date = item.dt_txt.split(' ')[0];
    const time = item.dt_txt.split(' ')[1];
    if(!days[date] && time >= '11:00:00' && time <= '14:00:00') days[date] = item;
  });
  data.list.forEach(item => {
    const date = item.dt_txt.split(' ')[0];
    if(!days[date]) days[date] = item;
  });

  const grid = document.getElementById('fcGrid');
  grid.innerHTML = '';
  Object.keys(days).slice(0,5).forEach(ds => {
    const item = days[ds];
    const d    = new Date(ds + 'T12:00:00');
    const day  = d.toLocaleDateString('en-US',{weekday:'short'});
    const icon = item.weather[0].icon;
    const desc = item.weather[0].description;
    const hi   = Math.round(item.main.temp_max);
    const lo   = Math.round(item.main.temp_min);

    const el = document.createElement('div');
    el.className = 'fc-day';
    el.innerHTML = `
      <div class="fc-dname">${day}</div>
      <div class="fc-icon"><img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${desc}"/></div>
      <div class="fc-temps"><span class="fc-hi">${hi}${u}</span><span class="fc-lo">${lo}${u}</span></div>
      <div class="fc-desc">${desc}</div>`;
    grid.appendChild(el);
  });
}

/* ── Theme ── */
function setTheme(cond, icon) {
  const night = icon && icon.endsWith('n');
  const c = cond.toLowerCase();
  const body = document.body;
  body.className = '';
  if(c.includes('thunderstorm'))                     body.className = 'theme-thunder';
  else if(c.includes('drizzle')||c.includes('rain')) body.className = 'theme-rain';
  else if(c.includes('snow'))                        body.className = 'theme-snow';
  else if(c.includes('mist')||c.includes('fog')||c.includes('haze')||c.includes('smoke')) body.className = 'theme-mist';
  else if(c.includes('cloud'))                       body.className = 'theme-clouds';
  else if(c.includes('clear'))                       body.className = night ? 'theme-default' : 'theme-clear';
  else                                               body.className = 'theme-default';
}

/* ── Helpers ── */
function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }
function enc(s)   { return encodeURIComponent(s); }
function fmtDate(d) { return d.toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'}); }

/* ── Search History ── */
const HISTORY_KEY = 'skye_search_history';
const MAX_HISTORY = 5;

function getHistory() {
     try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
     catch(e) { return []; }
}

function saveToHistory(city) {
     let history = getHistory();
     // Remove duplicate (case-insensitive) and add to front
  history = history.filter(c => c.toLowerCase() !== city.toLowerCase());
     history.unshift(city);
     history = history.slice(0, MAX_HISTORY);
     localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
     renderHistory();
}

function renderHistory() {
     const history = getHistory();
     let container = document.getElementById('searchHistory');
     if (!container) return;
     if (history.length === 0) {
            container.innerHTML = '';
            return;
     }
     container.innerHTML = '<span style="font-size:12px;opacity:.55;margin-right:6px;">Recent:</span>' +
            history.map(city =>
                     `<button onclick="searchFromHistory('${city.replace(/'/g, "\\'")}')"
                             style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);
                                            color:#fff;border-radius:20px;padding:4px 12px;font-size:12.5px;
                                                           cursor:pointer;margin:2px 3px;font-family:inherit;transition:.2s ease;"
                                                                   onmouseover="this.style.background='rgba(255,255,255,.28)'"
                                                                           onmouseout="this.style.background='rgba(255,255,255,.15)'">${city}</button>`
                            ).join('');
}

function searchFromHistory(city) {
     searchInput.value = city;
     fetchWeather(city);
}

// Patch go() to also save history
const _origGo = go;
function go() {
     const city = searchInput.value.trim();
     if (!city) return;
     saveToHistory(city);
     fetchWeather(city);
}

// Inject the history container below search box on page load
document.addEventListener('DOMContentLoaded', function() {
     const searchWrap = document.querySelector('.search-wrap') || document.querySelector('.sw');
     if (searchWrap && !document.getElementById('searchHistory')) {
            const histDiv = document.createElement('div');
            histDiv.id = 'searchHistory';
            histDiv.style.cssText = 'margin-top:8px;display:flex;align-items:center;flex-wrap:wrap;min-height:28px;';
            searchWrap.appendChild(histDiv);
            renderHistory();
     }
});

function fmtDate(d) { return d.toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'}); }
