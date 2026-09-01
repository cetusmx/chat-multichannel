import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Text, ActivityIndicator, Platform, Keyboard, ScrollView } from 'react-native';
import { theme } from '../utils/theme';
import { get, post } from '../services/api';



const ChatInput = forwardRef(({ onSendText, onSendMedia, onRequestAi, onOpenActionMenu, isAiLoading }, ref) => {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isWhisperMode, setIsWhisperMode] = useState(false);
  const [filteredReplies, setFilteredReplies] = useState([]);
  const [cannedResponses, setCannedResponses] = useState([]);

  useEffect(() => {
    const fetchCanned = async () => {
      try {
        const res = await get('/canned-responses/my-usage');
        if (res.ok) {
          const data = await res.json();
          setCannedResponses(data.data || []);
        }
      } catch (err) {
        console.error('Error fetching canned responses in mobile:', err);
      }
    };
    fetchCanned();
  }, []);
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

  useEffect(() => {
    if (text.startsWith('/')) {
      const q = text.slice(1).toLowerCase();
      const matches = cannedResponses.filter(qr => 
        (qr.shortcut && qr.shortcut.toLowerCase().includes(q)) || 
        qr.title.toLowerCase().includes(q)
      );
      setFilteredReplies(matches);
    } else {
      setFilteredReplies([]);
    }
  }, [text, cannedResponses]);

  const selectQuickReply = async (reply) => {
    setText(reply.content);
    setFilteredReplies([]);
    try {
      await post(`/canned-responses/${reply.id}/use`);
    } catch (e) {
      // ignore
    }
    if (inputRef.current) inputRef.current.focus();
  };

  const handleSendText = async () => {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    try {
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
    <View style={{ width: '100%' }}>
      {filteredReplies.length > 0 && (
        <View style={styles.quickRepliesContainer}>
          <ScrollView keyboardShouldPersistTaps="handled">
            
          {filteredReplies.map((qr) => (
            <TouchableOpacity key={qr.id} style={styles.quickReplyItem} onPress={() => selectQuickReply(qr)}>
              <Text style={styles.qrCommand}>/{qr.shortcut || qr.title}</Text>
              <Text style={styles.qrText} numberOfLines={1}>{qr.content}</Text>
            </TouchableOpacity>
          ))}
        
          </ScrollView>
        </View>
      )}
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
  },
  quickRepliesContainer: {
      position: 'absolute',
      bottom: '100%',
      left: 0,
      right: 0,
      backgroundColor: '#fff',
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
      maxHeight: 200,
      elevation: 4,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowOffset: { width: 0, height: -3 },
      shadowRadius: 5,
      zIndex: 10, // Ensure it's on top
    },
  quickReplyItem: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  qrCommand: {
    fontWeight: 'bold',
    color: '#2563eb',
    marginRight: 8,
    width: 60,
  },
  qrText: {
    color: '#475569',
    flex: 1,
  }
});
