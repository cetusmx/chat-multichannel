/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useChatStore from './useChatStore';
import io from 'socket.io-client';

// Mock socket.io-client
vi.mock('socket.io-client', () => {
  const mockSocket = {
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    io: {
      opts: {} // For auth updates
    }
  };
  return {
    default: vi.fn(() => mockSocket),
    __mockSocket: mockSocket
  };
});

describe('useChatStore - Socket functionality', () => {
  beforeEach(() => {
    // Reset state
    useChatStore.setState({
      conversations: [],
      currentConversationId: null,
      messages: [],
      socket: null,
      uploadingIds: {},
      errorMsg: null,
    });
    vi.clearAllMocks();
  });

  it('initializes socket and sets up robust event listeners', () => {
    useChatStore.getState().initializeSocket();
    
    expect(io).toHaveBeenCalled();
    const mockSocket = io();
    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('new_message', expect.any(Function));
  });

  it('new_message event appends message if it belongs to current conversation', () => {
    useChatStore.setState({ 
      currentConversationId: '123',
      messages: [{ id: 'msg1', content: 'hello' }] 
    });

    useChatStore.getState().initializeSocket();
    const mockSocket = io();
    
    // Find the new_message handler
    const newMessageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'new_message')[1];
    
    // Simulate incoming message
    newMessageHandler({ id: 'msg2', conversationId: '123', content: 'world' });
    
    expect(useChatStore.getState().messages).toHaveLength(2);
    expect(useChatStore.getState().messages[1].content).toBe('world');
  });

  it('new_message avoids duplicates', () => {
    useChatStore.setState({ 
      currentConversationId: '123',
      messages: [{ id: 'msg1', content: 'hello' }] 
    });

    useChatStore.getState().initializeSocket();
    const mockSocket = io();
    
    const newMessageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'new_message')[1];
    
    // Simulate incoming duplicate message
    newMessageHandler({ id: 'msg1', conversationId: '123', content: 'hello' });
    
  });

  describe('chat:escalated event', () => {
    it('updates the status of the conversation to ESCALATED', () => {
      useChatStore.setState({
        conversations: [{ id: 'conv1', status: 'ACTIVE' }, { id: 'conv2', status: 'ACTIVE' }]
      });

      useChatStore.getState().initializeSocket();
      const mockSocket = io();
      
      const escalatedHandler = mockSocket.on.mock.calls.find(call => call[0] === 'chat:escalated')?.[1];
      
      escalatedHandler({ payload: { conversationId: 'conv1', tenantId: 'tenant1' } });
      
      const conversations = useChatStore.getState().conversations;
      expect(conversations.find(c => c.id === 'conv1').status).toBe('ESCALATED');
      expect(conversations.find(c => c.id === 'conv2').status).toBe('ACTIVE');
    });
  });

  describe('conversation_reassigned event', () => {
    it('replaces ESCALATED status with the incoming updated conversation status when reassigned', () => {
      useChatStore.setState({
        conversations: [{ id: 'conv1', status: 'ESCALATED' }]
      });

      useChatStore.getState().initializeSocket();
      const mockSocket = io();
      
      const reassignedHandler = mockSocket.on.mock.calls.find(call => call[0] === 'conversation_reassigned')?.[1];
      
      reassignedHandler({
        action: 'added',
        conversationId: 'conv1',
        conversation: { id: 'conv1', status: 'ACTIVE' }
      });
      
      const conversations = useChatStore.getState().conversations;
      expect(conversations.find(c => c.id === 'conv1').status).toBe('ACTIVE');
    });
  });

  describe('chat:assigned and chat:resolved events', () => {
    it('clears ESCALATED status when assigned', () => {
      useChatStore.setState({
        conversations: [{ id: 'conv1', status: 'ESCALATED' }]
      });

      useChatStore.getState().initializeSocket();
      const mockSocket = io();
      const assignedHandler = mockSocket.on.mock.calls.find(call => call[0] === 'chat:assigned')?.[1];
      
      assignedHandler({ payload: { conversationId: 'conv1', status: 'ACTIVE' } });
      expect(useChatStore.getState().conversations.find(c => c.id === 'conv1').status).toBe('ACTIVE');
    });

    it('clears ESCALATED status when resolved', () => {
      useChatStore.setState({
        conversations: [{ id: 'conv1', status: 'ESCALATED' }]
      });

      useChatStore.getState().initializeSocket();
      const mockSocket = io();
      const resolvedHandler = mockSocket.on.mock.calls.find(call => call[0] === 'chat:resolved')?.[1];
      
      resolvedHandler({ payload: { conversationId: 'conv1', status: 'CLOSED' } });
      expect(useChatStore.getState().conversations.find(c => c.id === 'conv1').status).toBe('CLOSED');
    });
  });

  describe('Pagination', () => {
    it('loadMoreMessages does nothing if no nextCursor', async () => {
      useChatStore.setState({ currentConversationId: '123', hasMore: false, nextCursor: null });
      await useChatStore.getState().loadMoreMessages();
      expect(useChatStore.getState().isLoadingMore).toBe(false);
    });
  });
});
