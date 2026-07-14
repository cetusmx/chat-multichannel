import React, { useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Text, ActivityIndicator, PermissionsAndroid, Platform } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Toast from 'react-native-toast-message';
import { theme } from '../utils/theme';

const ChatInput = forwardRef(({ onSendText, onSendMedia, onRequestAi, isAiLoading }, ref) => {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    injectText: (draft) => {
      setText(draft);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }));

  const handleSendText = async () => {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    // AI Command Hijack
    const aiMatch = trimmedText.match(/^\/ai(\s+|$)/i);
    if (aiMatch) {
      if (onRequestAi) {
        const prompt = trimmedText.replace(/^\/ai\s*/i, '').trim();
        setText(''); // CLEAR COMMAND
        onRequestAi(prompt);
        return;
      }
      // If no AI handler is provided, fallback to sending normally
    }

    try {
      const draft = trimmedText;
      setText(''); // Optimistic UX: clear instantly
      setIsSending(true);
      await onSendText(draft);
    } catch (error) {
      console.error('Send text error in ChatInput', error);
      setText(trimmedText); // Restore on error
    } finally {
      setIsSending(false);
    }
  };

  const handleAiSuggest = () => {
    const trimmedText = text.trim();
    const prompt = trimmedText.replace(/^\/ai\s*/i, '').trim();
    if (onRequestAi) onRequestAi(prompt);
  };

  const requestAndroidPermission = async () => {
    if (Platform.OS !== 'android') return true;
    if (Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } else {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
  };

  const handlePickImage = async () => {
    try {
      const hasPermission = await requestAndroidPermission();
      if (!hasPermission) {
        Toast.show({ type: 'error', text1: 'Permiso Denegado', text2: 'No se puede acceder a las fotos' });
        return;
      }

      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
      });

      if (result.didCancel) {
        return;
      }
      if (result.errorCode) {
        Toast.show({ type: 'error', text1: 'Error', text2: result.errorMessage || 'Error del selector' });
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        try {
          const draft = text.trim();
          setText(''); // Optimistic UX
          setIsSending(true);
          await onSendMedia(asset, draft);
        } catch (error) {
          setText(text); // Restore on error
        } finally {
          setIsSending(false);
        }
      }
    } catch (error) {
      console.error('Image picker error', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Fallo al abrir la galería' });
    }
  };

  const disableInputs = isSending || isAiLoading;

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={handlePickImage}
        disabled={disableInputs}
        accessibilityRole="button"
        accessibilityState={{ disabled: disableInputs }}
        accessibilityLabel="Adjuntar Imagen"
      >
        <Text style={styles.actionIcon}>+</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={handleAiSuggest}
        disabled={disableInputs}
        accessibilityRole="button"
        accessibilityState={{ disabled: disableInputs }}
        accessibilityLabel="Sugerencia AI"
      >
        {isAiLoading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <Text style={styles.actionIcon}>✨</Text>
        )}
      </TouchableOpacity>

      <TextInput
        ref={inputRef}
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Escribe un mensaje o /ai..."
        placeholderTextColor="#888"
        multiline={true}
        maxLength={1000}
        accessibilityLabel="Entrada de mensaje"
      />

      <TouchableOpacity 
        style={[styles.sendButton, (!text.trim() && !isSending) && styles.sendButtonDisabled]} 
        onPress={handleSendText}
        disabled={disableInputs || !text.trim()}
        accessibilityRole="button"
        accessibilityState={{ disabled: disableInputs || !text.trim() }}
        accessibilityLabel="Enviar Mensaje"
      >
        {isSending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.sendIcon}>➤</Text>
        )}
      </TouchableOpacity>
    </View>
  );
});

export default ChatInput;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 10,
    alignItems: 'flex-end',
    backgroundColor: '#222',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  actionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionIcon: {
    color: theme.colors.primary,
    fontSize: 22,
    fontWeight: 'bold',
  },
  iconDisabled: {
    color: '#555',
  },
  input: {
    flex: 1,
    backgroundColor: '#333',
    color: '#fff',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: 120,
    marginHorizontal: 5,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    marginLeft: 5,
  },
  sendButtonDisabled: {
    backgroundColor: '#555',
  },
  sendIcon: {
    color: '#fff',
    fontSize: 18,
  }
});
