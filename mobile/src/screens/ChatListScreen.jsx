import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { get } from '../services/api';
import { theme } from '../utils/theme';

export default function ChatListScreen() {
  const navigation = useNavigation();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = async (isRefresh = false) => {
    try {
      const res = await get('/chat/conversations');
      const data = await res.json();
      if (res.ok && data.data) {
        setConversations(Array.isArray(data.data) ? data.data : []);
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudieron cargar los chats' });
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Error de red' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchConversations();
  }, []);

  const navigateToChat = (chatId, clientName) => {
    if (!chatId) return;
    navigation.navigate('ChatDetailScreen', { chatId, clientName });
  };

  const renderItem = ({ item }) => {
    const clientName = item.client?.name || item.client?.phone || 'Unknown Client';
    const lastMsgObj = item.messages?.[0];
    
    let lastMessage = 'No messages yet';
    if (lastMsgObj) {
      if (lastMsgObj.content) {
        lastMessage = lastMsgObj.content;
      } else if (lastMsgObj.attachments && lastMsgObj.attachments.length > 0) {
        lastMessage = '[Media]';
      }
    }

    const unreadCount = item.unreadCount || 0; // Backend might not send this yet, defaulting to 0

    return (
      <TouchableOpacity 
        style={styles.chatItem} 
        onPress={() => navigateToChat(item.id, clientName)}
      >
        <View style={styles.chatItemContent}>
          <Text style={styles.clientName}>{clientName}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>{lastMessage}</Text>
        </View>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const ListEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      {loading ? (
        <Text style={styles.emptyText}>Cargando chats...</Text>
      ) : (
        <Text style={styles.emptyText}>No tienes chats asignados.</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['right', 'bottom', 'left']}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={conversations.length === 0 ? styles.flexGrow : styles.listContent}
        ListEmptyComponent={ListEmptyComponent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flexGrow: {
    flexGrow: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatItemContent: {
    flex: 1,
    marginRight: 10,
  },
  clientName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  lastMessage: {
    color: '#aaa',
    fontSize: 14,
  },
  badge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center',
  },
});
