import React, { useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Text, ActivityIndicator, Platform, Keyboard } from 'react-native';
import { theme } from '../utils/theme';

const ChatInput = forwardRef(({ onSendText, onSendMedia, onRequestAi, onOpenActionMenu, isAiLoading }, ref) => {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isWhisperMode, setIsWhisperMode] = useState(false);
  const inputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    injectText: (draft) => {
      setText(draft);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    },
    insertText: (snippet) => {
      setText(prev => prev + snippet);
    }
  }));

  const handleSendText = async () => {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    try {
      // If whisper mode is on, we'd prefix or flag it. For now, we simulate whisper prefix.
      const draft = isWhisperMode ? `/whisper ${trimmedText}` : trimmedText;
      setText(''); // Optimistic UX: clear instantly
      setIsSending(true);
      await onSendText(draft);
      // Reset whisper mode after sending
      if (isWhisperMode) setIsWhisperMode(false);
    } catch (error) {
      console.error('Send text error in ChatInput', error);
      setText(trimmedText); // Restore on error
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleWhisper = () => {
    setIsWhisperMode(!isWhisperMode);
  };

  const handleQuickReplies = () => {
    // Emits or triggers quick replies logic. For now, just focus and append "/"
    setText(prev => prev.endsWith('/') ? prev : prev + '/');
    if (inputRef.current) inputRef.current.focus();
  };

  const disableInputs = isSending || isAiLoading;

  return (
    <View style={[styles.container, isWhisperMode && styles.containerWhisper]}>
      {/* 1. Menu (+) Button */}
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={onOpenActionMenu}
        disabled={disableInputs}
        accessibilityLabel="Abrir Menú"
      >
        <Text style={[styles.actionIcon, isWhisperMode && { color: '#854d0e' }]}>+</Text>
      </TouchableOpacity>

      {/* 2. Text Input Container */}
      <View style={[styles.inputWrapper, isWhisperMode && styles.inputWrapperWhisper]}>
        <TextInput
          ref={inputRef}
          style={[styles.input, isWhisperMode && styles.inputWhisper]}
          value={text}
          onChangeText={setText}
          placeholder={isWhisperMode ? "Escribe una nota interna..." : "Mensaje..."}
          placeholderTextColor={isWhisperMode ? "#a16207" : "#888"}
          multiline={true}
          maxLength={1000}
        />
        
        {/* Quick Replies (Lightning) Button inside the input */}
        <TouchableOpacity style={styles.quickReplyButton} onPress={handleQuickReplies}>
          <Text style={styles.quickReplyIcon}>⚡</Text>
        </TouchableOpacity>
      </View>

      {/* 3. Whisper Toggle Button */}
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={handleToggleWhisper}
        disabled={disableInputs}
        accessibilityLabel="Susurro"
      >
        <Text style={[styles.actionIcon, isWhisperMode && { color: '#ca8a04' }]}>🤫</Text>
      </TouchableOpacity>

      {/* 4. Send Button */}
      <TouchableOpacity 
        style={[styles.sendButton, (!text.trim() && !isSending) && styles.sendButtonDisabled, isWhisperMode && styles.sendButtonWhisper]} 
        onPress={handleSendText}
        disabled={disableInputs || !text.trim()}
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
    backgroundColor: '#1e293b', // slate-800
    borderTopWidth: 1,
    borderTopColor: '#334155', // slate-700
  },
  containerWhisper: {
    backgroundColor: '#fef3c7', // amber-50
    borderTopColor: '#fde68a', // amber-200
  },
  actionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionIcon: {
    color: '#94a3b8', // slate-400
    fontSize: 24,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#334155', // slate-700
    borderRadius: 20,
    marginHorizontal: 5,
    minHeight: 40,
    maxHeight: 220, // 10 líneas max
  },
  inputWrapperWhisper: {
    backgroundColor: '#fde68a', // amber-200
  },
  input: {
    flex: 1,
    color: '#f8fafc',
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 16,
    maxHeight: 220,
  },
  inputWhisper: {
    color: '#713f12', // yellow-900
  },
  quickReplyButton: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickReplyIcon: {
    fontSize: 18,
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
    backgroundColor: '#475569', // slate-600
  },
  sendButtonWhisper: {
    backgroundColor: '#ca8a04', // yellow-600
  },
  sendIcon: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 2, // optical alignment
  }
});
