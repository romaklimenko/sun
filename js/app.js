/**
 * Main application module for sunrise/sunset visualization
 */

import { getSunTimes, getDayLength, getSunCondition } from './sun-calc.js';
import { SunChart } from './chart.js';

// Default location (Copenhagen)
const DEFAULT_LOCATION = { lat: 55.6761, lon: 12.5683, name: 'Copenhagen' };
const STORAGE_KEY = 'sun-location';

let location = null;
let chart = null;

/**
 * Format time as HH:MM
 */
function formatTime(date) {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function setTodayText(prefix, locationName, suffix) {
  const todayEl = document.getElementById('today');
  todayEl.textContent = prefix;

  const button = document.createElement('button');
  button.id = 'change-location';
  button.className = 'location-btn';
  button.textContent = locationName;
  button.addEventListener('click', showLocationPicker);

  todayEl.appendChild(button);
  todayEl.append(suffix);
}

function describeContinuousSun(date) {
  const condition = getSunCondition(date, location.lat, location.lon);
  if (condition === 'always-up') return 'continuous daylight';
  if (condition === 'always-down') return 'no daylight';
  return null;
}

/**
 * Update the info panels (yesterday/today/tomorrow)
 */
function updateInfoPanels() {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const yesterdayLength = getDayLength(yesterday, location.lat, location.lon);
  const todayLength = getDayLength(now, location.lat, location.lon);
  const tomorrowLength = getDayLength(tomorrow, location.lat, location.lon);

  const { sunrise, sunset } = getSunTimes(now, location.lat, location.lon);

  // Yesterday panel
  const yesterdayEl = document.getElementById('yesterday');
  if (yesterdayLength && todayLength) {
    const diff = Math.abs(Math.round(yesterdayLength - todayLength));
    const direction = yesterdayLength > todayLength ? 'longer' : 'shorter';
    const arrow = yesterdayLength > todayLength ? '\u2191' : '\u2193';
    yesterdayEl.textContent = `Yesterday was ${diff} minutes ${direction} ${arrow}`;
  } else {
    const description = describeContinuousSun(yesterday);
    yesterdayEl.textContent = description ? `Yesterday had ${description}` : '';
  }

  // Today panel
  const locationName = location.name || `${location.lat.toFixed(2)}, ${location.lon.toFixed(2)}`;
  if (sunrise && sunset) {
    setTodayText('Today at ', locationName, `, sunrise at ${formatTime(sunrise)} and sunset at ${formatTime(sunset)}`);
  } else {
    const condition = getSunCondition(now, location.lat, location.lon);
    const message = condition === 'always-up'
      ? ', the sun does not set today'
      : ', the sun does not rise today';
    setTodayText('Today at ', locationName, message);
  }

  // Tomorrow panel
  const tomorrowEl = document.getElementById('tomorrow');
  if (todayLength && tomorrowLength) {
    const diff = Math.abs(Math.round(todayLength - tomorrowLength));
    const direction = tomorrowLength > todayLength ? 'longer' : 'shorter';
    const arrow = tomorrowLength > todayLength ? '\u2191' : '\u2193';
    tomorrowEl.textContent = `Tomorrow will be ${diff} minutes ${direction} ${arrow}`;
  } else {
    const description = describeContinuousSun(tomorrow);
    tomorrowEl.textContent = description ? `Tomorrow will have ${description}` : '';
  }
}

/**
 * Render the chart
 */
function renderChart() {
  const container = document.getElementById('chart');
  if (!chart) {
    chart = new SunChart(container);
  }
  chart.render(location.lat, location.lon);
}

/**
 * Full render (info panels + chart)
 */
function render() {
  if (!location) return;
  updateInfoPanels();
  renderChart();
}

/**
 * Save location to localStorage
 */
function saveLocation(loc) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
  } catch (e) {
    // localStorage might be unavailable
  }
}

/**
 * Load location from localStorage
 */
function loadSavedLocation() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    // localStorage might be unavailable
  }
  return null;
}

/**
 * Set location and re-render
 */
function setLocation(lat, lon, name = null) {
  location = { lat, lon, name };
  saveLocation(location);
  render();
}

/**
 * Show the location picker dialog
 */
function showLocationPicker() {
  const dialog = document.getElementById('location-dialog');
  const input = document.getElementById('location-input');

  // Pre-fill with current location
  if (location) {
    input.value = location.name || `${location.lat}, ${location.lon}`;
  }

  dialog.classList.add('visible');
  input.focus();
  input.select();
}

/**
 * Hide the location picker dialog
 */
function hideLocationPicker() {
  const dialog = document.getElementById('location-dialog');
  dialog.classList.remove('visible');
}


function formatLocationResult(result, fallbackName) {
  if (!result.display_name) return fallbackName;
  const parts = result.display_name.split(',').map((part) => part.trim()).filter(Boolean);
  return parts.slice(0, 3).join(', ') || fallbackName;
}

async function geocodeCityName(cityName) {
  if (!('fetch' in window)) return null;

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('q', cityName);

  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) return null;

    const results = await response.json();
    const result = results[0];
    if (!result) return null;

    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    return {
      lat,
      lon,
      name: formatLocationResult(result, cityName)
    };
  } catch (e) {
    return null;
  }
}

/**
 * Parse location input (supports "lat, lon" format and city names)
 */
async function parseLocationInput(input) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Try to parse as "lat, lon"
  const coordsMatch = trimmed.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (coordsMatch) {
    const lat = parseFloat(coordsMatch[1]);
    const lon = parseFloat(coordsMatch[2]);
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return { lat, lon, name: null };
    }
  }

  // Look up any typed city or place name rather than restricting users to a fixed list.
  return geocodeCityName(trimmed);
}

/**
 * Handle location form submission
 */
async function handleLocationSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('location-input');
  const errorEl = document.getElementById('location-error');
  const submitBtn = e.submitter || document.querySelector('#location-form button[type="submit"]');
  const value = input.value;

  errorEl.textContent = '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Finding location...';
  }

  const parsed = await parseLocationInput(value);
  if (parsed) {
    setLocation(parsed.lat, parsed.lon, parsed.name || value);
    hideLocationPicker();
  } else {
    errorEl.textContent = 'Enter coordinates (e.g., "55.67, 12.56") or a city name';
  }

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Set Location';
  }
}

/**
 * Try to get user's geolocation
 */
async function requestGeolocation() {
  if (!('geolocation' in navigator)) {
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          name: null
        });
      },
      () => resolve(null),
      { timeout: 10000, maximumAge: 3600000 }
    );
  });
}

/**
 * Initialize the application
 */
async function init() {
  // Set up event listeners
  const form = document.getElementById('location-form');
  form.addEventListener('submit', handleLocationSubmit);

  const cancelBtn = document.getElementById('location-cancel');
  cancelBtn.addEventListener('click', hideLocationPicker);

  const geoBtn = document.getElementById('use-geolocation');
  geoBtn.addEventListener('click', async () => {
    geoBtn.textContent = 'Getting location...';
    const geo = await requestGeolocation();
    if (geo) {
      setLocation(geo.lat, geo.lon, null);
      hideLocationPicker();
    } else {
      document.getElementById('location-error').textContent = 'Could not get your location';
    }
    geoBtn.textContent = 'Use my location';
  });

  // Close dialog on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideLocationPicker();
    }
  });

  // Close dialog when clicking backdrop
  const dialog = document.getElementById('location-dialog');
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      hideLocationPicker();
    }
  });

  // Try to load saved location
  const saved = loadSavedLocation();
  if (saved) {
    location = saved;
    render();
  } else {
    // Try geolocation, fall back to picker
    const geo = await requestGeolocation();
    if (geo) {
      setLocation(geo.lat, geo.lon, null);
    } else {
      // Show location picker
      location = DEFAULT_LOCATION;
      render();
      showLocationPicker();
    }
  }

  // Debounced resize handler
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(render, 250);
  });

  // Update every minute
  setInterval(render, 60000);
}

// Start the app
init();
