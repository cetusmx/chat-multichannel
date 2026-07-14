import messaging from '@react-native-firebase/messaging';
import { post, del } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export async function requestPushPermission() {
  let authStatus = await messaging().hasPermission();
  
  if (
    authStatus === messaging.AuthorizationStatus.NOT_DETERMINED || 
    authStatus === messaging.AuthorizationStatus.DENIED
  ) {
    if (Platform.OS === 'ios' || (Platform.OS === 'android' && Platform.Version >= 33)) {
      authStatus = await messaging().requestPermission();
    } else {
      authStatus = messaging.AuthorizationStatus.AUTHORIZED; // Android < 13
    }
  }

  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
}

export async function checkPushPermission() {
  const authStatus = await messaging().hasPermission();
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
}

export async function registerFcmToken() {
  const enabled = await requestPushPermission();
  if (!enabled) {
    console.log('[PUSH] Permission not granted');
    return;
  }

  try {
    const token = await messaging().getToken();
    if (!token) return;

    const cachedToken = await AsyncStorage.getItem('fcm_token');
    if (token !== cachedToken) {
      const res = await post('/users/fcm-token', { token });
      if (res.ok) {
        await AsyncStorage.setItem('fcm_token', token);
        console.log('[PUSH] FCM token registered with backend');
      } else {
        console.error('[PUSH] Failed to register FCM token', await res.text());
      }
    }
  } catch (error) {
    console.error('[PUSH] Error registering FCM token:', error);
  }
}

export async function removeFcmToken() {
  try {
    const cachedToken = await AsyncStorage.getItem('fcm_token');
    if (cachedToken) {
      const res = await del(`/users/fcm-token/${encodeURIComponent(cachedToken)}`);
      if (res.ok) {
        console.log('[PUSH] FCM token removed from backend');
      }
    }
  } catch (error) {
    console.error('[PUSH] Error removing FCM token:', error);
  } finally {
    // Unconditionally remove from local storage and OS level to stop routing
    await AsyncStorage.removeItem('fcm_token');
    await messaging().deleteToken().catch(() => {});
  }
}
