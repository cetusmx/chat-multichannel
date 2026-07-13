import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';

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

export default function App() {
  const token = useAuthStore((state) => state.token);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Check if already hydrated
    if (useAuthStore.persist.hasHydrated()) {
      setIsHydrated(true);
    } else {
      const unsub = useAuthStore.persist.onFinishHydration(() => setIsHydrated(true));
      return unsub;
    }
  }, []);

  if (!isHydrated) return null; // Prevent UI flicker

  return (
    <SafeAreaProvider>
      <NavigationContainer>
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
    </SafeAreaProvider>
  );
}
