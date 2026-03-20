/* ================================ */
/*  Skye Weather App — script.js     */
/* ================================ */

// ─────────────────────────────────
//  !! IMPORTANT: Replace the value below with your own free API key
//  Get one free at: https://openweathermap.org/api  (takes ~2 mins)
// ─────────────────────────────────
const API_KEY = 'YOUR_API_KEY_HERE';
const BASE    = 'https://api.openweathermap.org/data/2.5';

/* ---------- State ---------- */
let currentUnit = 'metric'; // 'metric' (°C) or 'imperial' (°F)
let lastCity    = '';

/* ---------- DOM refs ---------- */
const searchInput   = document.getElementById('searchInput');
const searchBtn     = document.getElementById('searchBtn');
const loader        = document.getElementById('loader');
const errorCard     = document.getElementById('errorCard');
const errorMsg      = document.getElementById('errorMsg');
const weatherMain   = document.getElementById('weatherMain');
const defaultPrompt = document.getElementById('defaultPrompt');

const cityName      = document.getElementById('cityName');
const countryName   = document.getElementById('countryName');
const currentDate   = document.getElementById('currentDate');
const tempNum       = document.getElementById('tempNum');
const tempUnit      = document.getElementById('tempUnit');
const conditionText = document.getElementById('conditionText');
const feelsLike     = document.getElementById('feelsLike');
const weatherIcon   = document.getElementById('weatherIcon');
const conditionLabel= document.getElementById('conditionLabel');

const humidity      = document.getElementById('humidity');
const windSpeed     = document.getElementById('windSpeed');
const visibility    = document.getElementById('visibility');
const pressure      = document.getElementById('pressure');
const forecastGrid  = document.getElementById('forecastGrid');

/* ---------- Events ---------- */
searchBtn.addEventListener('click', doSearch);
searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') doSearch();
});

/* ---------- Unit Toggle ---------- */
function setUnit(unit) {
  currentUnit = unit;
  document.getElementById('btnC').classList.toggle('active', unit === 'metric');
  document.getElementById('btnF').classList.toggle('active', unit === 'imperial');
  if (lastCity) fetchWeather(lastCity);
}

/* ---------- Main Search ---------- */
function doSearch() {
  const city = searchInput.value.trim();
  if (!city) return;
  fetchWeather(city);
}

/* ---------- Fetch Weather ---------- */
async function fetchWeather(city) {
  lastCity = city;
  showLoader();

  try {
    const [current, forecast] = await Promise.all([
      fetchJSON(`${BASE}/weather?q=${encodeURIComponent(city)}&units=${currentUnit}&appid=${API_KEY}`),
      fetchJSON(`${BASE}/forecast?q=${encodeURIComponent(city)}&units=${currentUnit}&appid=${API_KEY}`)
    ]);

    hideLoader();
    hideError();
    renderCurrent(current);
    renderForecast(forecast);
    showWeather();

  } catch (err) {
    hideLoader();
    hideWeather();
    showError(err.message || 'City not found. Please try again.');
  }
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) throw new Error('City not found. Please check the spelling.');
    if (res.status === 401) throw new Error('Invalid API key. Please add your OpenWeatherMap key in script.js.');
    throw new Error(`Error ${res.status}: Could not fetch weather data.`);
  }
  return res.json();
}

/* ---------- Render Current ---------- */
function renderCurrent(data) {
  const unit     = currentUnit === 'metric' ? '°C' : '°F';
  const windUnit = currentUnit === 'metric' ? 'km/h' : 'mph';
  const windMult = currentUnit === 'metric' ? 3.6 : 1;

  cityName.textContent      = data.name;
  countryName.textContent   = data.sys.country;
  currentDate.textContent   = formatDate(new Date());
  tempNum.textContent       = Math.round(data.main.temp);
  tempUnit.textContent      = unit;
  conditionText.textContent = data.weather[0].description;
  conditionLabel.textContent= data.weather[0].main;
  feelsLike.textContent     = `${Math.round(data.main.feels_like)}${unit}`;

  // Icon
  const iconCode = data.weather[0].icon;
  weatherIcon.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  weatherIcon.alt = data.weather[0].description;

  // Stats
  humidity.textContent  = `${data.main.humidity}%`;
  windSpeed.textContent = `${Math.round(data.wind.speed * windMult)} ${windUnit}`;
  visibility.textContent= `${(data.visibility / 1000).toFixed(1)} km`;
  pressure.textContent  = `${data.main.pressure} hPa`;

  // Background
  setBackground(data.weather[0].main, iconCode);
}

/* ---------- Render Forecast ---------- */
function renderForecast(data) {
  // Get one entry per day at ~noon (filter by time 12:00:00)
  const days = {};
  data.list.forEach(item => {
    const date = item.dt_txt.split(' ')[0];
    const time = item.dt_txt.split(' ')[1];
    if (!days[date] && time >= '11:00:00' && time <= '14:00:00') {
      days[date] = item;
    }
  });

  // Fallback: first entry per day if no noon entry found
  data.list.forEach(item => {
    const date = item.dt_txt.split(' ')[0];
    if (!days[date]) days[date] = item;
  });

  const unit     = currentUnit === 'metric' ? '°C' : '°F';
  const dayKeys  = Object.keys(days).slice(0, 5);

  forecastGrid.innerHTML = '';

  dayKeys.forEach(dateStr => {
    const item    = days[dateStr];
    const d       = new Date(dateStr + 'T12:00:00');
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const icon    = item.weather[0].icon;
    const desc    = item.weather[0].description;
    const high    = Math.round(item.main.temp_max);
    const low     = Math.round(item.main.temp_min);

    const card = document.createElement('div');
    card.className = 'forecast-day';
    card.innerHTML = `
      <div class="fc-day-name">${dayName}</div>
      <div class="fc-icon">
        <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${desc}" />
      </div>
      <div class="fc-temps">
        <span class="fc-high">${high}${unit}</span>
        <span class="fc-low">${low}${unit}</span>
      </div>
      <div class="fc-desc">${desc}</div>
    `;
    forecastGrid.appendChild(card);
  });
}

/* ---------- Background ---------- */
function setBackground(condition, icon) {
  const isNight = icon && icon.endsWith('n');
  const c = condition.toLowerCase();
  const body = document.body;

  body.className = ''; // reset

  if (c.includes('thunderstorm'))              body.classList.add('bg-thunderstorm');
  else if (c.includes('drizzle') || c.includes('rain')) body.classList.add('bg-rain');
  else if (c.includes('snow'))                 body.classList.add('bg-snow');
  else if (c.includes('mist') || c.includes('fog') || c.includes('haze') || c.includes('smoke')) body.classList.add('bg-mist');
  else if (c.includes('cloud'))                body.classList.add('bg-clouds');
  else if (c.includes('clear'))                body.classList.add(isNight ? 'bg-default' : 'bg-clear');
  else                                         body.classList.add('bg-default');
}

/* ---------- Helpers ---------- */
function formatDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function showLoader() {
  loader.classList.add('show');
  hideWeather();
  hideError();
  defaultPrompt.style.display = 'none';
}

function hideLoader() {
  loader.classList.remove('show');
}

function showWeather() {
  weatherMain.classList.add('show');
  defaultPrompt.style.display = 'none';
}

function hideWeather() {
  weatherMain.classList.remove('show');
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorCard.classList.add('show');
}

function hideError() {
  errorCard.classList.remove('show');
}
