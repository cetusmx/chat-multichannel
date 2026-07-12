const { setupAlerts } = require('../../src/socket/alerts.handler');
const slaService = require('../../src/services/sla.service');
const jwt = require('jsonwebtoken');

describe('Socket.IO Alerts Handler Integration', () => {
  let mockSocket, mockNamespace;

  beforeEach(() => {
    mockSocket = {
      handshake: { auth: {} },
      join: jest.fn(),
      emit: jest.fn(),
      on: jest.fn((event, cb) => {
        if (event === 'join:tenant') {
          mockSocket.joinTenantCb = cb;
        }
      })
    };

    mockNamespace = {
      on: jest.fn((event, cb) => {
        if (event === 'connection') {
          mockNamespace.connectionCb = cb;
        }
      }),
      to: jest.fn().mockReturnThis(),
      emit: jest.fn()
    };
    
    slaService.removeAllListeners('alerts:breach');
  });

  it('should authenticate and join tenant room', () => {
    setupAlerts(mockNamespace);
    mockNamespace.connectionCb(mockSocket);
    
    const token = jwt.sign({ tenantId: 't1', role: 'VENDOR' }, process.env.JWT_SECRET || 'fallback_secret');
    mockSocket.handshake.auth.token = token;
    
    mockSocket.joinTenantCb('t1');
    
    expect(mockSocket.join).toHaveBeenCalledWith('tenant:t1');
  });

  it('should reject unauthorized tenant join', () => {
    setupAlerts(mockNamespace);
    mockNamespace.connectionCb(mockSocket);
    
    const token = jwt.sign({ tenantId: 't2', role: 'VENDOR' }, process.env.JWT_SECRET || 'fallback_secret');
    mockSocket.handshake.auth.token = token;
    
    mockSocket.joinTenantCb('t1');
    
    expect(mockSocket.join).not.toHaveBeenCalled();
    expect(mockSocket.emit).toHaveBeenCalledWith('alerts:error', { message: 'Unauthorized access to tenant' });
  });

  it('should reject invalid token', () => {
    setupAlerts(mockNamespace);
    mockNamespace.connectionCb(mockSocket);
    
    mockSocket.handshake.auth.token = 'invalid.token.here';
    
    mockSocket.joinTenantCb('t1');
    
    expect(mockSocket.join).not.toHaveBeenCalled();
    expect(mockSocket.emit).toHaveBeenCalledWith('alerts:error', { message: 'Invalid token' });
  });

  it('should reject unauthenticated request', () => {
    setupAlerts(mockNamespace);
    mockNamespace.connectionCb(mockSocket);
    
    mockSocket.joinTenantCb('t1');
    
    expect(mockSocket.join).not.toHaveBeenCalled();
    expect(mockSocket.emit).toHaveBeenCalledWith('alerts:error', { message: 'Authentication required' });
  });

  it('should forward SLA breaches to the correct tenant room', () => {
    setupAlerts(mockNamespace);
    
    const alertData = { tenantId: 't1', payload: { conversationId: 'c1' } };
    slaService.emit('alerts:breach', alertData);
    
    expect(mockNamespace.to).toHaveBeenCalledWith('tenant:t1');
    expect(mockNamespace.emit).toHaveBeenCalledWith('alerts:breach', alertData);
  });
});
