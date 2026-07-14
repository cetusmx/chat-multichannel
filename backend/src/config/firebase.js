const admin = require('firebase-admin');

// Ensure FIREBASE_SERVICE_ACCOUNT is available
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT is not set in .env. Firebase Admin is NOT initialized.');
} else {
  try {
    if (admin.apps.length === 0) {
      // Parse base64 service account
      const serviceAccountJson = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8');
      const serviceAccount = JSON.parse(serviceAccountJson);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('✅ Firebase Admin initialized successfully.');
    } else {
      console.log('✅ Firebase Admin already initialized (hot-reloading).');
    }
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error);
  }
}

module.exports = admin;
