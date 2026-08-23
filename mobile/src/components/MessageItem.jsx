import React, { useState, memo } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, Platform } from 'react-native';
import Config from 'react-native-config';
import { theme } from '../utils/theme';
import useAuthStore from '@shared/stores/useAuthStore';

const BASE_URL = Config.BACKEND_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000');

const MessageItem = memo(({ message }) => {
  const isVendor = ['VENDOR', 'SYSTEM', 'COORDINATOR', 'ADMIN', 'IA'].includes(message.senderType);
  const attachments = message.attachments || [];
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const token = useAuthStore(state => state.token);

  // Handle status feedback (Task 4.2)
  const renderStatus = () => {
    if (!isVendor) return null;
    let statusText = '✓';
    if (message.status === 'sending') statusText = '...';
    if (message.status === 'error' || message.status === 'failed') statusText = '❌';
    if (message.status === 'READ') statusText = '✓✓';
    return <Text style={[styles.statusText, message.status === 'error' && styles.statusError]}>{statusText}</Text>;
  };

  const isWhisper = message.isInternal || (message.metadata && message.metadata.isWhisper);
  const authorName = isVendor ? (message.sender?.name || message.senderType) : null;

  return (
    <View style={[styles.container, isVendor ? styles.containerRight : styles.containerLeft]}>
      <View style={[
        styles.bubble, 
        isVendor ? styles.bubbleRight : styles.bubbleLeft,
        isWhisper && styles.bubbleWhisper
      ]}>
        {isVendor && authorName && (
          <Text style={[styles.authorText, isWhisper && styles.authorTextWhisper]}>{authorName}</Text>
        )}
        
        {attachments.map((att, idx) => {
          if (att.type === 'IMAGE' && att.url) {
            const base = BASE_URL.replace(/\/$/, '');
            const path = att.url.replace(/^\//, '');
            const url = att.url.startsWith('http') ? att.url : `${base}/${path}`;
            return (
              <View key={idx} style={styles.imageContainer}>
                {imageLoading && (
                  <View style={styles.imagePlaceholder}>
                    <ActivityIndicator size="small" color={isVendor ? '#fff' : theme.colors.primary} />
                  </View>
                )}
                {!imageError ? (
                  <Image 
                    source={{ uri: url, headers: { Authorization: `Bearer ${token}` } }} 
                    style={styles.image} 
                    onLoad={() => setImageLoading(false)}
                    onError={() => {
                      setImageLoading(false);
                      setImageError(true);
                    }}
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.errorText}>Error al cargar</Text>
                  </View>
                )}
              </View>
            );
          }
          return (
            <Text key={idx} style={[styles.text, isVendor ? styles.textRight : styles.textLeft, styles.attachmentFallback]}>
              [Adjunto no soportado: {att.type || 'Archivo'}]
            </Text>
          );
        })}

        {message.content && (
          <Text style={[
            styles.text, 
            isVendor ? styles.textRight : styles.textLeft,
            isWhisper && styles.textWhisper
          ]}>
            {message.content}
          </Text>
        )}
        
        <View style={styles.metaContainer}>
          <Text style={[styles.timeText, isWhisper && styles.timeTextWhisper]}>
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {renderStatus()}
        </View>
      </View>
    </View>
  );
});

export default MessageItem;

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  containerRight: {
    justifyContent: 'flex-end',
  },
  containerLeft: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 16,
  },
  bubbleRight: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleLeft: {
    backgroundColor: theme.colors.border,
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 15,
  },
  textRight: {
    color: '#fff',
  },
  textLeft: {
    color: '#fff',
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  timeText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginRight: 4,
  },
  statusText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statusError: {
    color: theme.colors.danger || 'red',
  },
  imageContainer: {
    width: 250,
    height: 250,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  imagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#888',
    fontSize: 12,
  },
  attachmentFallback: {
    fontStyle: 'italic',
    color: '#aaa',
  },
  bubbleWhisper: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  textWhisper: {
    color: '#92400e',
  },
  timeTextWhisper: {
    color: 'rgba(146, 64, 14, 0.6)',
  },
  authorText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#e2e8f0',
    marginBottom: 4,
  },
  authorTextWhisper: {
    color: '#b45309',
  }
});
