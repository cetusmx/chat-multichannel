const { getBusinessMinutesElapsed } = require('./backend/src/utils/date.js');

const createdAt = new Date('2026-08-27T10:00:00Z');
const statusUpdatedAt = new Date('2026-08-27T10:11:00Z'); // 11 mins active
const now = new Date('2026-08-27T12:11:00Z'); // 2 hours later

const bh = null; // No business hours for test

const elapsedPaused = Math.floor(getBusinessMinutesElapsed(statusUpdatedAt, now, bh));
console.log('elapsedPaused:', elapsedPaused); // Should be 120

const totalElapsed = getBusinessMinutesElapsed(createdAt, now, bh);
console.log('totalElapsed:', totalElapsed); // Should be 131

const finalElapsed = Math.max(0, totalElapsed - elapsedPaused);
console.log('finalElapsed:', finalElapsed); // Should be 11
