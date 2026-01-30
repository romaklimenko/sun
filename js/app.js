/**
 * Main application module for sunrise/sunset visualization
 */

import { getSunTimes, getDayLength } from './sun-calc.js';
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
  }

  // Today panel
  const todayEl = document.getElementById('today');
  const locationName = location.name || `${location.lat.toFixed(2)}, ${location.lon.toFixed(2)}`;
  if (sunrise && sunset) {
    todayEl.innerHTML = `Today at <button id="change-location" class="location-btn">${locationName}</button>, sunrise at ${formatTime(sunrise)} and sunset at ${formatTime(sunset)}`;
    document.getElementById('change-location').addEventListener('click', showLocationPicker);
  }

  // Tomorrow panel
  const tomorrowEl = document.getElementById('tomorrow');
  if (todayLength && tomorrowLength) {
    const diff = Math.abs(Math.round(todayLength - tomorrowLength));
    const direction = tomorrowLength > todayLength ? 'longer' : 'shorter';
    const arrow = tomorrowLength > todayLength ? '\u2191' : '\u2193';
    tomorrowEl.textContent = `Tomorrow will be ${diff} minutes ${direction} ${arrow}`;
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

/**
 * Parse location input (supports "lat, lon" format)
 */
function parseLocationInput(input) {
  const trimmed = input.trim();

  // Try to parse as "lat, lon"
  const coordsMatch = trimmed.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (coordsMatch) {
    const lat = parseFloat(coordsMatch[1]);
    const lon = parseFloat(coordsMatch[2]);
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return { lat, lon, name: null };
    }
  }

  // Try as city name (simple lookup)
  const cities = {
    'copenhagen': { lat: 55.6761, lon: 12.5683 },
    'london': { lat: 51.5074, lon: -0.1278 },
    'new york': { lat: 40.7128, lon: -74.0060 },
    'tokyo': { lat: 35.6762, lon: 139.6503 },
    'sydney': { lat: -33.8688, lon: 151.2093 },
    'paris': { lat: 48.8566, lon: 2.3522 },
    'berlin': { lat: 52.5200, lon: 13.4050 },
    'moscow': { lat: 55.7558, lon: 37.6173 },
    'oslo': { lat: 59.9139, lon: 10.7522 },
    'stockholm': { lat: 59.3293, lon: 18.0686 },
    'helsinki': { lat: 60.1699, lon: 24.9384 },
    'reykjavik': { lat: 64.1466, lon: -21.9426 },
    'amsterdam': { lat: 52.3676, lon: 4.9041 },
    'rome': { lat: 41.9028, lon: 12.4964 },
    'madrid': { lat: 40.4168, lon: -3.7038 },
    'lisbon': { lat: 38.7223, lon: -9.1393 },
    'athens': { lat: 37.9838, lon: 23.7275 },
    'dubai': { lat: 25.2048, lon: 55.2708 },
    'singapore': { lat: 1.3521, lon: 103.8198 },
    'hong kong': { lat: 22.3193, lon: 114.1694 },
    'los angeles': { lat: 34.0522, lon: -118.2437 },
    'san francisco': { lat: 37.7749, lon: -122.4194 },
    'chicago': { lat: 41.8781, lon: -87.6298 },
    'toronto': { lat: 43.6532, lon: -79.3832 },
    'vancouver': { lat: 49.2827, lon: -123.1207 },
    'mexico city': { lat: 19.4326, lon: -99.1332 },
    'sao paulo': { lat: -23.5505, lon: -46.6333 },
    'buenos aires': { lat: -34.6037, lon: -58.3816 },
    'cape town': { lat: -33.9249, lon: 18.4241 },
    'cairo': { lat: 30.0444, lon: 31.2357 },
    'mumbai': { lat: 19.0760, lon: 72.8777 },
    'delhi': { lat: 28.7041, lon: 77.1025 },
    'bangkok': { lat: 13.7563, lon: 100.5018 },
    'seoul': { lat: 37.5665, lon: 126.9780 },
    'beijing': { lat: 39.9042, lon: 116.4074 },
    'shanghai': { lat: 31.2304, lon: 121.4737 },
    'melbourne': { lat: -37.8136, lon: 144.9631 },
    'auckland': { lat: -36.8509, lon: 174.7645 },
    'dnipro': { lat: 48.4647, lon: 35.0462 },
    'kyiv': { lat: 50.4501, lon: 30.5234 },
    'warsaw': { lat: 52.2297, lon: 21.0122 },
    'prague': { lat: 50.0755, lon: 14.4378 },
    'vienna': { lat: 48.2082, lon: 16.3738 },
    'zurich': { lat: 47.3769, lon: 8.5417 },
    'dublin': { lat: 53.3498, lon: -6.2603 },
    'edinburgh': { lat: 55.9533, lon: -3.1883 }
  };

  const cityKey = trimmed.toLowerCase();
  if (cities[cityKey]) {
    return { ...cities[cityKey], name: trimmed };
  }

  return null;
}

/**
 * Handle location form submission
 */
function handleLocationSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('location-input');
  const errorEl = document.getElementById('location-error');
  const value = input.value;

  const parsed = parseLocationInput(value);
  if (parsed) {
    setLocation(parsed.lat, parsed.lon, parsed.name || value);
    hideLocationPicker();
    errorEl.textContent = '';
  } else {
    errorEl.textContent = 'Enter coordinates (e.g., "55.67, 12.56") or a city name';
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
