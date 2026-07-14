import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { theme } from '../utils/theme';
import useAuthStore from '@shared/stores/useAuthStore';
import { removeFcmToken } from '../services/push.service';

export default function ProfileScreen() {
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const handleLogout = async () => {
    try {
      await Promise.race([
        removeFcmToken(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ]);
    } catch (err) {
      console.error('Logout push cleanup failed', err);
    } finally {
      clearAuth();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>ProfileScreen Placeholder</Text>
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: theme.colors.text,
  },
});
