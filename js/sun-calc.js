/**
 * Sunrise/sunset calculation module.
 *
 * Based on Matt Kane's implementation of the US Naval Observatory's algorithm.
 * Original: https://github.com/triggertrap/sun-js
 *
 * Copyright 2012 Triggertrap Ltd. All rights reserved.
 *
 * This library is free software; you can redistribute it and/or modify it under
 * the terms of the GNU Lesser General Public License as published by the Free
 * Software Foundation; either version 2.1 of the License, or (at your option)
 * any later version.
 *
 * LGPL-2.1 License: http://www.gnu.org/licenses/old-licenses/lgpl-2.1.html
 */

const DEGREES_PER_HOUR = 15; // 360 / 24

// Trigonometric helpers
const sinDeg = (deg) => Math.sin(deg * Math.PI / 180);
const cosDeg = (deg) => Math.cos(deg * Math.PI / 180);
const tanDeg = (deg) => Math.tan(deg * Math.PI / 180);
const asinDeg = (x) => Math.asin(x) * 180 / Math.PI;
const acosDeg = (x) => Math.acos(x) * 180 / Math.PI;
const mod = (a, b) => ((a % b) + b) % b;

/**
 * Get day of year (1-366)
 * @param {Date} date
 * @returns {number}
 */
export function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date - start;
  return Math.ceil(diff / 86400000);
}

/**
 * Calculate sunrise or sunset time for a given date and location
 * @param {Date} date - The date to calculate for
 * @param {number} latitude - Latitude in degrees
 * @param {number} longitude - Longitude in degrees
 * @param {boolean} isSunrise - true for sunrise, false for sunset
 * @param {number} zenith - Solar zenith angle (default: 90.8333 for official sunrise/sunset)
 * @returns {Date} - The sunrise or sunset time
 */
function sunriseSet(date, latitude, longitude, isSunrise, zenith = 90.8333) {
  const hoursFromMeridian = longitude / DEGREES_PER_HOUR;
  const dayOfYear = getDayOfYear(date);

  // Approximate time of event in days
  const approxTimeOfEventInDays = isSunrise
    ? dayOfYear + ((6 - hoursFromMeridian) / 24)
    : dayOfYear + ((18 - hoursFromMeridian) / 24);

  // Sun's mean anomaly
  const sunMeanAnomaly = (0.9856 * approxTimeOfEventInDays) - 3.289;

  // Sun's true longitude
  let sunTrueLongitude = sunMeanAnomaly +
    (1.916 * sinDeg(sunMeanAnomaly)) +
    (0.020 * sinDeg(2 * sunMeanAnomaly)) +
    282.634;
  sunTrueLongitude = mod(sunTrueLongitude, 360);

  // Sun's right ascension
  const ascension = 0.91764 * tanDeg(sunTrueLongitude);
  let rightAscension = (360 / (2 * Math.PI)) * Math.atan(ascension);
  rightAscension = mod(rightAscension, 360);

  // Right ascension must be in same quadrant as sun's true longitude
  const lQuadrant = Math.floor(sunTrueLongitude / 90) * 90;
  const raQuadrant = Math.floor(rightAscension / 90) * 90;
  rightAscension = rightAscension + (lQuadrant - raQuadrant);
  rightAscension /= DEGREES_PER_HOUR;

  // Sun's declination
  const sinDec = 0.39782 * sinDeg(sunTrueLongitude);
  const cosDec = cosDeg(asinDeg(sinDec));

  // Sun's local hour angle
  const cosLocalHourAngle = (cosDeg(zenith) - (sinDec * sinDeg(latitude))) /
    (cosDec * cosDeg(latitude));

  // Check if sun never rises or sets at this location on this date
  if (cosLocalHourAngle > 1 || cosLocalHourAngle < -1) {
    return null; // Polar day or polar night
  }

  let localHourAngle = acosDeg(cosLocalHourAngle);
  if (isSunrise) {
    localHourAngle = 360 - localHourAngle;
  }

  const localHour = localHourAngle / DEGREES_PER_HOUR;

  // Local mean time of event
  const localMeanTime = localHour + rightAscension - (0.06571 * approxTimeOfEventInDays) - 6.622;

  // Convert to UTC
  let time = localMeanTime - (longitude / DEGREES_PER_HOUR);
  time = mod(time, 24);

  // Create date object for the result
  const midnight = new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ));

  return new Date(midnight.getTime() + (time * 60 * 60 * 1000));
}

/**
 * Get sunrise time for a given date and location
 * @param {Date} date
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Date|null}
 */
export function getSunrise(date, latitude, longitude) {
  return sunriseSet(date, latitude, longitude, true);
}

/**
 * Get sunset time for a given date and location
 * @param {Date} date
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Date|null}
 */
export function getSunset(date, latitude, longitude) {
  return sunriseSet(date, latitude, longitude, false);
}

/**
 * Get both sunrise and sunset times
 * @param {Date} date
 * @param {number} latitude
 * @param {number} longitude
 * @returns {{sunrise: Date|null, sunset: Date|null}}
 */
export function getSunTimes(date, latitude, longitude) {
  return {
    sunrise: getSunrise(date, latitude, longitude),
    sunset: getSunset(date, latitude, longitude)
  };
}

/**
 * Get day length in minutes
 * @param {Date} date
 * @param {number} latitude
 * @param {number} longitude
 * @returns {number|null}
 */
export function getDayLength(date, latitude, longitude) {
  const { sunrise, sunset } = getSunTimes(date, latitude, longitude);
  if (!sunrise || !sunset) return null;
  return (sunset - sunrise) / 60000; // Convert ms to minutes
}
