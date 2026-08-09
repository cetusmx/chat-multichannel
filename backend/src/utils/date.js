/**
 * @typedef {Object} BusinessHoursDayConfig
 * @property {boolean} isOpen
 * @property {string} start - Start time in HH:mm format (e.g. "09:00")
 * @property {string} end - End time in HH:mm format (e.g. "18:00")
 */

/**
 * @typedef {Object} BusinessHours
 * @property {string} timezone - IANA timezone string (e.g. "America/Mexico_City")
 * @property {Record<string, BusinessHoursDayConfig>} schedule - Keys 0-6 (0=Sunday, 1=Monday...)
 * 
 * Legacy format fallback support:
 * @property {string} start
 * @property {string} end
 * @property {number[]} days
 */

const { formatInTimeZone, toDate } = require('date-fns-tz');

function getMinutes(timeStr) {
  const [h, m] = String(timeStr).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function normalizeBusinessHours(bh) {
  if (!bh || !bh.timezone) return null;
  
  let schedule = null;
  
  if (bh.schedule) {
    schedule = bh.schedule;
  } else if (bh.start && bh.end && Array.isArray(bh.days)) {
    // Convert legacy
    schedule = {};
    for (let i = 0; i <= 6; i++) {
      schedule[i] = {
        isOpen: bh.days.includes(i),
        start: bh.start,
        end: bh.end
      };
    }
  }

  if (!schedule) return null;
  return { timezone: bh.timezone, schedule };
}

/**
 * Checks if the given date is outside the configured business hours.
 */
function isOffHours(businessHours, currentDate = new Date()) {
  const bh = normalizeBusinessHours(businessHours);
  if (!bh) return false; // Default to 24/7 if unconfigured

  try {
    const { timezone, schedule } = bh;
    
    // date-fns-tz 'i' format returns 1=Monday... 7=Sunday. Convert to 0=Sunday.
    const dayOfWeek = parseInt(formatInTimeZone(currentDate, timezone, 'i'), 10) % 7; 
    const currentTimeStr = formatInTimeZone(currentDate, timezone, 'HH:mm');
    const currentMins = getMinutes(currentTimeStr);

    const dayConfig = schedule[dayOfWeek];
    if (!dayConfig || !dayConfig.isOpen) {
      return true; // Day is closed
    }

    const startMins = getMinutes(dayConfig.start);
    const endMins = getMinutes(dayConfig.end);

    // Assuming normal shifts (start < end). For overnight shifts, additional logic is needed.
    if (startMins === endMins) return false; // 24 hours open
    
    if (currentMins < startMins || currentMins >= endMins) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('[DATE_UTILS] Error parsing business hours:', error.message || error);
    return false;
  }
}

/**
 * Calculates the number of business minutes elapsed between two dates.
 * @param {number|Date|string} startTime 
 * @param {number|Date|string} endTime 
 * @param {BusinessHours|null|undefined} businessHours 
 * @returns {number} elapsed business minutes
 */
function getBusinessMinutesElapsed(startTime, endTime, businessHours) {
  const startMs = new Date(startTime).getTime();
  const endMs = new Date(endTime).getTime();
  
  if (startMs >= endMs) return 0;
  
  const bh = normalizeBusinessHours(businessHours);
  if (!bh) {
    // If no config, return raw wall clock minutes
    return (endMs - startMs) / 60000;
  }

  try {
    const { timezone, schedule } = bh;
    let currentMs = startMs;
    let businessMinutes = 0;
    
    // Jump by hour or by minute, for precision we'll jump by minute
    // This loop executes up to 60 * 24 * 7 (10,080) times per week, which is fast in Node.js
    
    // Limit to max 30 days to prevent infinite loops in edge cases
    const MAX_ITERATIONS = 60 * 24 * 30; 
    let iterations = 0;

    // Convert startMs to minute boundary to avoid drift
    currentMs = Math.floor(currentMs / 60000) * 60000;
    const finalMs = Math.floor(endMs / 60000) * 60000;

    while (currentMs < finalMs && iterations < MAX_ITERATIONS) {
      iterations++;
      
      const dayOfWeek = parseInt(formatInTimeZone(currentMs, timezone, 'i'), 10) % 7; 
      const dayConfig = schedule[dayOfWeek];
      
      if (!dayConfig || !dayConfig.isOpen) {
        // Skip entire day by advancing to next midnight in this timezone
        currentMs += 60000 * 60; // Just advance safely by 1 hour to let timezone format recalculate
        continue;
      }
      
      const currentMins = getMinutes(formatInTimeZone(currentMs, timezone, 'HH:mm'));
      const startMins = getMinutes(dayConfig.start);
      const endMins = getMinutes(dayConfig.end);
      
      if (currentMins >= startMins && currentMins < endMins) {
        businessMinutes++;
      }
      
      currentMs += 60000; // advance 1 minute
    }

    // Add any fractional minutes from the exact end time
    const fractionalMin = (endMs - finalMs) / 60000;
    if (fractionalMin > 0) {
       const dayOfWeek = parseInt(formatInTimeZone(finalMs, timezone, 'i'), 10) % 7; 
       const dayConfig = schedule[dayOfWeek];
       if (dayConfig && dayConfig.isOpen) {
         const currentMins = getMinutes(formatInTimeZone(finalMs, timezone, 'HH:mm'));
         const startMins = getMinutes(dayConfig.start);
         const endMins = getMinutes(dayConfig.end);
         if (currentMins >= startMins && currentMins < endMins) {
           businessMinutes += fractionalMin;
         }
       }
    }

    return businessMinutes;
  } catch (error) {
    console.error('[DATE_UTILS] Error calculating business minutes:', error.message || error);
    // Fallback to raw time
    return (endMs - startMs) / 60000;
  }
}

module.exports = {
  isOffHours,
  getBusinessMinutesElapsed
};
