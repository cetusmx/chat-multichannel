import React, { useEffect, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import Toast from 'react-native-toast-message';
import { registerFcmToken, removeFcmToken } from './src/services/push.service';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import ChatListScreen from './src/screens/ChatListScreen';
import ChatDetailScreen from './src/screens/ChatDetailScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Shared Stores Config
import useAuthStore, { configureAuthStorage } from '@shared/stores/useAuthStore';
import { configureChatStore } from '@shared/stores/useChatStore';
import * as keychainStorage from './src/utils/keychainStorage';
import * as api from './src/services/api';
import Config from 'react-native-config';

// Inject React Native specific implementations into the shared stores
configureAuthStorage(keychainStorage.default);
const BASE_URL = Config.BACKEND_URL 
  ? Config.BACKEND_URL.replace(/\/api\/?$/, '') + '/chat' 
  : (Platform.OS === 'android' ? 'http://10.0.2.2:4000/chat' : 'http://localhost:4000/chat');
configureChatStore(api, BASE_URL);

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

export default function App() {
  const token = useAuthStore((state) => state.token);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Check if already hydrated
    if (useAuthStore.persist.hasHydrated()) {
      setIsHydrated(true);
    } else {
      const unsub = useAuthStore.persist.onFinishHydration(() => setIsHydrated(true));
      const timeoutId = setTimeout(() => setIsHydrated(true), 1500);
      return () => {
        unsub();
        clearTimeout(timeoutId);
      };
    }
  }, []);

  if (!isHydrated) return null; // Prevent UI flicker

  useEffect(() => {
    if (Platform.OS === 'ios') {
      messaging().setBadge(0);
    }
    if (token) {
      registerFcmToken().catch(err => console.error('[PUSH] Failed to register token', err));
    }
  }, [token]);

  useEffect(() => {
    const unsubscribeMsg = messaging().onMessage(async remoteMessage => {
      // Foreground handler
      const title = remoteMessage.notification?.title || 'Nuevo mensaje';
      const body = remoteMessage.notification?.body || '';
      
      const currentRoute = navigationRef.isReady() ? navigationRef.getCurrentRoute() : null;
      const isSameChat = currentRoute?.name === 'ChatDetail' && String(currentRoute?.params?.chatId) === String(remoteMessage.data?.chatId);
      
      if (!isSameChat) {
        Toast.show({
          type: 'info',
          text1: title,
          text2: body,
          position: 'top',
          onPress: () => navigateToChat(remoteMessage.data?.chatId)
        });
      }
    });

    const navigateToChat = (chatId) => {
      if (!chatId) return;
      if (Platform.OS === 'ios') messaging().setBadge(0);
      let retries = 0;
      const tryNav = () => {
        if (navigationRef.isReady()) {
          navigationRef.navigate('ChatDetail', { chatId });
        } else if (retries < 20) {
          retries++;
          setTimeout(tryNav, 100);
        }
      };
      tryNav();
    };

    const unsubscribeTokenRefresh = messaging().onTokenRefresh(async (newToken) => {
      if (token) {
        try {
          const { post } = require('./src/services/api');
          await post('/users/fcm-token', { token: newToken });
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          await AsyncStorage.setItem('fcm_token', newToken);
        } catch (err) {
          console.error('[PUSH] Token refresh failed', err);
        }
      }
    });

    // Handle background notification click
    messaging().onNotificationOpenedApp(remoteMessage => {
      if (remoteMessage.data?.chatId) {
        navigateToChat(remoteMessage.data.chatId);
      }
    });

    // Handle quit state notification click
    messaging().getInitialNotification().then(remoteMessage => {
      if (remoteMessage && remoteMessage.data?.chatId) {
        navigateToChat(remoteMessage.data.chatId);
      }
    }).catch(err => console.error('[PUSH] getInitialNotification error', err));

    return () => {
      unsubscribeMsg();
      unsubscribeTokenRefresh();
    };
  }, [token]);

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator>
          {token ? (
            <>
              <Stack.Screen name="ChatList" component={ChatListScreen} />
              <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
            </>
          ) : (
            <Stack.Screen name="Login" component={LoginScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <Toast />
    </SafeAreaProvider>
  );
}
