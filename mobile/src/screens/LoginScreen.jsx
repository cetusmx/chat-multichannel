import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform, 
  Alert 
} from 'react-native';
import useAuthStore from '@shared/stores/useAuthStore';
import * as api from '../services/api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  async function handleSubmit() {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor ingresa tu email y contraseña.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error?.message || 'Error al iniciar sesión');
      }

      const { user, token, refreshToken } = body.data;
      setAuth(user, token, refreshToken);
      // La navegación hacia adentro (App.jsx) es automática porque cambia el estado de 'token' en Zustand.
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>SalesFlow</Text>
          <Text style={styles.subtitle}>Inicia sesión en tu cuenta</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="tu@email.com"
              placeholderTextColor="#64748b"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="********"
              placeholderTextColor="#64748b"
              secureTextEntry
            />
          </View>

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Iniciar Sesión</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a', // slate-900 (tema web)
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)', // fondo semi-transparente como en web
    borderRadius: 16,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f1f5f9', // slate-100
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8', // slate-400
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)', // slate-800/50
    borderWidth: 1,
    borderColor: '#334155', // slate-700
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#f1f5f9',
    fontSize: 15,
  },
  button: {
    backgroundColor: '#f97316', // orange-500
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
