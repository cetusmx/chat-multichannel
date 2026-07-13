import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../utils/theme';

export default function MessageInput() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>MessageInput Component</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  text: {
    color: theme.colors.text,
  },
});
