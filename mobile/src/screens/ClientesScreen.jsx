import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ClientesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Clientes - Pr\u00f3ximamente</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  text: { color: '#cbd5e1', fontSize: 18 }
});
