/**
 * @typedef {Object} BusinessHours
 * @property {string} start - Start time in HH:mm format (e.g. "09:00")
 * @property {string} end - End time in HH:mm format (e.g. "18:00")
 * @property {string} timezone - IANA timezone string (e.g. "America/Mexico_City")
 * @property {number[]} days - Array of days where 0 is Sunday, 1 is Monday, etc. (e.g. [1, 2, 3, 4, 5])
 */

const { formatInTimeZone } = require('date-fns-tz');

function getMinutes(timeStr) {
  const [h, m] = String(timeStr).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Checks if the given date is outside the configured business hours.
 * @param {BusinessHours|null|undefined} businessHours 
 * @param {Date} [currentDate] - Date to check, defaults to new Date()
 * @returns {boolean} true if it's off-hours, false if it's within business hours or if businessHours is not configured
 */
function isOffHours(businessHours, currentDate = new Date()) {
  if (!businessHours || !businessHours.start || !businessHours.end || !businessHours.timezone || !Array.isArray(businessHours.days)) {
    return false; // Assume 24/7 operation if not fully configured
  }

  try {
    const { start, end, timezone, days } = businessHours;
    if (!days.every(d => typeof d === 'number' || (typeof d === 'string' && d.trim() !== ''))) return false;
    if (!/^\d{1,2}:\d{2}$/.test(start) || !/^\d{1,2}:\d{2}$/.test(end)) return false;
    
    const numDays = days.map(Number).filter(n => !isNaN(n));
    
    // 'i' format returns 1=Monday, 7=Sunday. % 7 converts it to 0=Sunday, 1=Monday...
    const dayOfWeek = parseInt(formatInTimeZone(currentDate, timezone, 'i'), 10) % 7; 
    const currentTimeStr = formatInTimeZone(currentDate, timezone, 'HH:mm');

    const startMins = getMinutes(start);
    const endMins = getMinutes(end);
    const currentMins = getMinutes(currentTimeStr);

    let activeDay = dayOfWeek;

    if (startMins > endMins && currentMins < endMins) {
      // Overnight shift, and we are in the morning part of it.
      // Therefore, the shift belongs to yesterday's business day configuration.
      activeDay = (dayOfWeek + 6) % 7;
    }
    
    if (!numDays.includes(activeDay)) {
      return true;
    }

    if (startMins === endMins) {
      return false; // 24-hour shift on this day
    }

    if (startMins < endMins) {
      if (currentMins < startMins || currentMins >= endMins) return true;
    } else {
      if (!(currentMins >= startMins || currentMins < endMins)) return true;
    }

    return false;
  } catch (error) {
    console.error('[DATE_UTILS] Error parsing business hours:', error.message || error);
    return false;
  }
}

module.exports = {
  isOffHours
};
