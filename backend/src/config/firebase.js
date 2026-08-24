const { getApps, initializeApp, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');

// Ensure FIREBASE_SERVICE_ACCOUNT is available
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT is not set in .env. Firebase Admin is NOT initialized.');
} else {
  try {
    if (getApps().length === 0) {
      // Parse base64 service account
      const serviceAccountJson = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8');
      const serviceAccount = JSON.parse(serviceAccountJson);

      initializeApp({
        credential: cert(serviceAccount)
      });
      console.log('✅ Firebase Admin initialized successfully.');
    } else {
      console.log('✅ Firebase Admin already initialized (hot-reloading).');
    }
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error);
  }
}

module.exports = {
  getApps,
  getMessaging,
};
