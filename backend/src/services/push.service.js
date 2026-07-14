const admin = require('../config/firebase');
const prisma = require('../config/database');
const logger = require('../utils/logger'); // Assuming a logger exists, or just use console

async function sendPushToVendor(vendorId, payload) {
  if (!admin.apps.length) {
    console.warn('Firebase Admin not initialized, skipping push notification');
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: vendorId },
    select: { fcmTokens: true }
  });

  if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
    return;
  }

  const tokens = user.fcmTokens;
  const BATCH_SIZE = 500;
  
  const staleTokens = [];

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const chunk = tokens.slice(i, i + BATCH_SIZE);
    const message = {
      ...payload,
      tokens: chunk
    };

    try {
      const response = await admin.messaging().sendMulticast(message);
      
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errorCode = resp.error?.code;
            if (errorCode === 'messaging/registration-token-not-registered' || errorCode === 'messaging/invalid-registration-token') {
              staleTokens.push(chunk[idx]);
            } else if (errorCode === 'messaging/third-party-auth-error') {
              console.error('CRITICAL: iOS APNs certificates have expired or are invalid.', resp.error);
            } else {
              console.error('FCM Push failed for token:', chunk[idx], resp.error);
            }
          }
        });
      }
    } catch (error) {
      console.error('Failed to send multicast push notification:', error);
    }
  }

  if (staleTokens.length > 0) {
    for (const token of staleTokens) {
      await prisma.$executeRaw`UPDATE "User" SET fcm_tokens = array_remove(fcm_tokens, ${token}) WHERE id = ${vendorId}`;
    }
    console.log(`Removed ${staleTokens.length} stale FCM tokens for user ${vendorId}`);
  }
}

module.exports = { sendPushToVendor };
