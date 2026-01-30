/**
 * SVG Chart rendering module for sunrise/sunset visualization
 */

import { getSunrise, getSunset, getDayOfYear } from './sun-calc.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Solarized colors
const COLORS = {
  gridLine: '#93a1a1',
  gridText: '#93a1a1',
  chartBg: '#eee8d5',
  dayFill: '#fdf6e3',
  dayCurve: '#657b83',
  currentLine: '#cb4b16',
  currentDot: '#FFFF00',
  currentDotStroke: '#cb4b16'
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Create an SVG element with given attributes
 */
function createSvgElement(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
  return el;
}

/**
 * Generate all dates for a given year
 */
function generateYearDates(year) {
  const dates = [];
  const isLeap = new Date(year, 1, 29).getMonth() === 1;
  const count = isLeap ? 366 : 365;

  for (let i = 0; i < count; i++) {
    const date = new Date(year, 0, 1);
    date.setDate(date.getDate() + i);
    dates.push(date);
  }
  return dates;
}

/**
 * Convert time to Y coordinate (00:00 at top, 24:00 at bottom)
 */
function timeToY(date, height) {
  const minutes = date.getHours() * 60 + date.getMinutes();
  return (minutes / (24 * 60)) * height;
}

/**
 * SunChart class for rendering the sunrise/sunset visualization
 */
export class SunChart {
  constructor(container) {
    this.container = container;
    this.svg = null;
  }

  /**
   * Render the chart
   */
  render(latitude, longitude) {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const year = new Date().getFullYear();
    const dates = generateYearDates(year);
    const now = new Date();

    // Create SVG
    this.svg = createSvgElement('svg', {
      width: '100%',
      height: '100%',
      viewBox: `0 0 ${width} ${height}`,
      preserveAspectRatio: 'none'
    });

    // Background
    this.svg.appendChild(createSvgElement('rect', {
      x: 0, y: 0, width, height,
      fill: COLORS.chartBg
    }));

    // Draw components
    this.drawGrid(width, height);
    this.drawDaylightArea(dates, latitude, longitude, width, height);
    this.drawCurrentPosition(now, latitude, longitude, width, height, dates.length);

    // Clear and append
    this.container.innerHTML = '';
    this.container.appendChild(this.svg);
  }

  /**
   * Draw the hour and month grid lines
   */
  drawGrid(width, height) {
    const pxPerHour = height / 24;

    // Hour lines and labels
    for (let hour = 0; hour < 24; hour++) {
      const y = pxPerHour * hour;

      // Horizontal line
      this.svg.appendChild(createSvgElement('line', {
        x1: 0, y1: y, x2: width, y2: y,
        stroke: COLORS.gridLine,
        'stroke-width': 0.5
      }));

      // Hour label
      const text = createSvgElement('text', {
        x: 15,
        y: y + pxPerHour / 2 + 4,
        fill: COLORS.gridText,
        'font-size': '11px',
        'font-family': 'sans-serif'
      });
      text.textContent = `${hour}:00`;
      this.svg.appendChild(text);
    }

    // Bottom line
    this.svg.appendChild(createSvgElement('line', {
      x1: 0, y1: height - 1, x2: width, y2: height - 1,
      stroke: COLORS.gridLine,
      'stroke-width': 0.5
    }));
  }

  /**
   * Draw the filled daylight area between sunrise and sunset curves
   */
  drawDaylightArea(dates, latitude, longitude, width, height) {
    const pxPerDay = width / (dates.length - 1);
    let pathData = '';

    // Build sunrise path (left to right)
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const sunrise = getSunrise(date, latitude, longitude);
      if (!sunrise) continue;

      const x = i * pxPerDay;
      const y = timeToY(sunrise, height);

      if (i === 0 || pathData === '') {
        pathData = `M ${x} ${y}`;
      } else {
        pathData += ` L ${x} ${y}`;
      }

      // Draw month separators and labels
      if (i !== 0 && date.getDate() === 1) {
        this.svg.appendChild(createSvgElement('line', {
          x1: x, y1: 0, x2: x, y2: height,
          stroke: COLORS.gridLine,
          'stroke-width': 0.5
        }));
      } else if (date.getDate() === 15) {
        const monthText = createSvgElement('text', {
          x: x,
          y: 12,
          fill: COLORS.gridText,
          'font-size': '11px',
          'font-family': 'sans-serif',
          'text-anchor': 'middle'
        });
        monthText.textContent = MONTHS[date.getMonth()];
        this.svg.appendChild(monthText);
      }
    }

    // Build sunset path (right to left)
    for (let i = dates.length - 1; i >= 0; i--) {
      const date = dates[i];
      const sunset = getSunset(date, latitude, longitude);
      if (!sunset) continue;

      const x = i * pxPerDay;
      const y = timeToY(sunset, height);
      pathData += ` L ${x} ${y}`;
    }

    // Close the path
    pathData += ' Z';

    // Draw filled area
    this.svg.appendChild(createSvgElement('path', {
      d: pathData,
      fill: COLORS.dayFill,
      'fill-opacity': 0.5,
      stroke: COLORS.dayCurve,
      'stroke-width': 1
    }));
  }

  /**
   * Draw current time crosshair and sun position dot
   */
  drawCurrentPosition(now, latitude, longitude, width, height, daysInYear) {
    const dayOfYear = getDayOfYear(now);
    const pxPerDay = width / (daysInYear - 1);
    const x = (dayOfYear - 1) * pxPerDay;
    const y = timeToY(now, height);

    // Vertical line (current day)
    this.svg.appendChild(createSvgElement('line', {
      x1: x, y1: 0, x2: x, y2: height,
      stroke: COLORS.currentLine,
      'stroke-width': 1
    }));

    // Horizontal line (current time)
    this.svg.appendChild(createSvgElement('line', {
      x1: 0, y1: y, x2: width, y2: y,
      stroke: COLORS.currentLine,
      'stroke-width': 1
    }));

    // Sun position dot
    this.svg.appendChild(createSvgElement('circle', {
      cx: x,
      cy: y,
      r: 6,
      fill: COLORS.currentDot,
      stroke: COLORS.currentDotStroke,
      'stroke-width': 1.5
    }));
  }
}
