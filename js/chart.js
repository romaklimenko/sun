/**
 * SVG Chart rendering module for sunrise/sunset visualization
 */

import { getSunrise, getSunset, getDayOfYear, getSunCondition } from './sun-calc.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Material-inspired colors. Night is the dark background; daylight is painted on top.
const COLORS = {
  gridLine: 'rgba(255, 255, 255, 0.08)',
  gridText: '#9FA8DA',     // Indigo 200
  nightBg: '#0D1B4D',      // Cobalt-like dark blue night sky
  dayFill: '#FFE082',      // Amber 200 — daylight
  dayCurve: '#FFB300',     // Amber 600 — horizon line
  currentLine: '#FF7043',  // Deep Orange 400
  currentDot: '#FFD54F',
  currentDotStroke: '#F4511E'
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

    // Background (night)
    this.svg.appendChild(createSvgElement('rect', {
      x: 0, y: 0, width, height,
      fill: COLORS.nightBg
    }));

    // Draw components
    this.drawDaylightArea(dates, latitude, longitude, width, height);
    this.drawGrid(width, height);
    this.drawMonthGrid(dates, width, height);
    this.drawCurrentPosition(now, latitude, longitude, width, height, dates.length);

    // Clear and append
    this.container.innerHTML = '';
    this.container.appendChild(this.svg);
  }

  /**
   * Draw the hour grid lines
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
   * Draw month grid lines and labels independent of sunrise/sunset availability.
   */
  drawMonthGrid(dates, width, height) {
    const pxPerDay = width / (dates.length - 1);

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const x = i * pxPerDay;

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
  }

  /**
   * Return the daylight interval for one date as Y coordinates.
   */
  getDaylightInterval(date, latitude, longitude, height) {
    const sunrise = getSunrise(date, latitude, longitude);
    const sunset = getSunset(date, latitude, longitude);

    if (sunrise && sunset) {
      return {
        startY: timeToY(sunrise, height),
        endY: timeToY(sunset, height),
        hasBoundary: true,
        condition: 'normal'
      };
    }

    const condition = getSunCondition(date, latitude, longitude);
    if (condition === 'always-up') {
      return {
        startY: 0,
        endY: height,
        hasBoundary: false,
        condition
      };
    }

    return {
      startY: null,
      endY: null,
      hasBoundary: false,
      condition
    };
  }

  /**
   * A normal daylight interval can wrap across midnight near polar day.
   */
  getDaylightBands(interval, height) {
    if (!interval || interval.condition === 'always-down') return [];
    if (interval.condition === 'always-up') return [{ startY: 0, endY: height }];
    if (interval.startY <= interval.endY) return [{ startY: interval.startY, endY: interval.endY }];

    return [
      { startY: 0, endY: interval.endY },
      { startY: interval.startY, endY: height }
    ];
  }

  /**
   * Draw a continuous boundary line through sunrise or sunset points.
   *
   * A null entry marks a discontinuity (polar day/night, or a transition day
   * whose interval wraps across midnight). The path is split there so the line
   * simply ends at the edge of the daylight region — the dark night fill closes
   * the shape — instead of drawing a false spike to the chart edge.
   */
  drawBoundaryPath(points) {
    let pathData = '';

    const flushPath = () => {
      if (pathData) this.appendBoundaryPath(pathData);
      pathData = '';
    };

    for (const point of points) {
      if (!point) {
        flushPath();
        continue;
      }
      pathData += pathData ? ` L ${point.x} ${point.y}` : `M ${point.x} ${point.y}`;
    }

    flushPath();
  }

  appendBoundaryPath(pathData) {
    this.svg.appendChild(createSvgElement('path', {
      d: pathData,
      fill: 'none',
      stroke: COLORS.dayCurve,
      'stroke-width': 1,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    }));
  }

  appendDaylightPath(pathData) {
    this.svg.appendChild(createSvgElement('path', {
      d: pathData,
      fill: COLORS.dayFill,
      'fill-opacity': 0.92,
      stroke: COLORS.dayFill,
      'stroke-width': 0.5
    }));
  }

  /**
   * Draw one filled daylight quadrilateral between two adjacent dates.
   */
  drawDaylightQuad(previousX, previousBand, x, band) {
    const pathData = [
      `M ${previousX} ${previousBand.startY}`,
      `L ${x} ${band.startY}`,
      `L ${x} ${band.endY}`,
      `L ${previousX} ${previousBand.endY}`,
      'Z'
    ].join(' ');

    this.appendDaylightPath(pathData);
  }

  /**
   * Draw adjacent daylight bands that overlap vertically. Wrapped-midnight days
   * have top and bottom bands; matching by overlap keeps those bands separate
   * instead of drawing false connectors across the night gap.
   */
  drawDaylightBetweenDays(previousX, previousBands, x, bands) {
    for (const previousBand of previousBands) {
      for (const band of bands) {
        const overlap = Math.min(previousBand.endY, band.endY) - Math.max(previousBand.startY, band.startY);
        if (overlap <= 0) continue;

        this.drawDaylightQuad(previousX, previousBand, x, band);
      }
    }
  }

  /**
   * Draw the filled daylight area between sunrise and sunset curves.
   * Polar day is daylight for the full 24-hour column; polar night is left unfilled.
   */
  drawDaylightArea(dates, latitude, longitude, width, height) {
    const pxPerDay = width / (dates.length - 1);
    const intervals = dates.map((date) => this.getDaylightInterval(date, latitude, longitude, height));
    const bandsByDay = intervals.map((interval) => this.getDaylightBands(interval, height));
    const sunrisePoints = [];
    const sunsetPoints = [];

    for (let i = 1; i < intervals.length; i++) {
      this.drawDaylightBetweenDays((i - 1) * pxPerDay, bandsByDay[i - 1], i * pxPerDay, bandsByDay[i]);
    }

    for (let i = 0; i < intervals.length; i++) {
      const interval = intervals[i];
      const x = i * pxPerDay;

      // Only stroke normal days. A wrapped interval (sunrise after sunset)
      // happens on the single transition day next to polar day; treating it as
      // a break keeps the curve smooth and lets the night fill close the shape.
      if (interval?.hasBoundary && interval.startY <= interval.endY) {
        sunrisePoints.push({ x, y: interval.startY });
        sunsetPoints.push({ x, y: interval.endY });
      } else {
        sunrisePoints.push(null);
        sunsetPoints.push(null);
      }
    }

    this.drawBoundaryPath(sunrisePoints);
    this.drawBoundaryPath(sunsetPoints);
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
