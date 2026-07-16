/**
 * @format
 */

import { AppRegistry, Alert } from 'react-native';
import messaging from '@react-native-firebase/messaging';

const defaultErrorHandler = global.ErrorUtils.getGlobalHandler();
global.ErrorUtils.setGlobalHandler((error, isFatal) => {
  Alert.alert(
    'FATAL CRASH INFO',
    `Error: ${error.name}: ${error.message}\n\nStack:\n${error.stack ? error.stack.substring(0, 1000) : ''}`,
    [{ text: 'OK' }]
  );
  if (defaultErrorHandler) {
    defaultErrorHandler(error, isFatal);
  }
});

import App from './App';
import { name as appName } from './app.json';

// Register background handler
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Message handled in the background!', remoteMessage);
});

AppRegistry.registerComponent(appName, () => App);
