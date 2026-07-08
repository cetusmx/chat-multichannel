const assignmentService = require('../../src/services/assignment.service');
const prisma = require('../../src/config/database');
const { getIo } = require('../../src/socket');

jest.mock('../../src/config/database', () => ({
  assignmentRule: {
    findUnique: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
  eligibleVendor: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  conversation: {
    updateMany: jest.fn(),
    findFirst: jest.fn(),
  },
  $transaction: jest.fn(),
}));

jest.mock('../../src/socket', () => ({
  getIo: jest.fn(),
}));

describe('AssignmentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('autoAssign', () => {
    it('should return null if no conversation found', async () => {
      prisma.$transaction.mockImplementation(async (callback) => {
        return callback(prisma);
      });
      prisma.conversation.findFirst.mockResolvedValue(null);

      const result = await assignmentService.autoAssign('tenant-1', 'conv-1');
      expect(result).toBeNull();
    });

    it('should return null if strategy is MANUAL', async () => {
      prisma.$transaction.mockImplementation(async (callback) => {
        return callback(prisma);
      });
      prisma.conversation.findFirst.mockResolvedValue({ status: 'PENDING_ASSIGNMENT' });
      prisma.assignmentRule.findUnique.mockResolvedValue({
        strategy: 'MANUAL'
      });

      const result = await assignmentService.autoAssign('tenant-1', 'conv-1');
      expect(result).toBeNull();
    });

    it('should return null if no eligible vendors', async () => {
      prisma.$transaction.mockImplementation(async (callback) => {
        return callback(prisma);
      });
      prisma.conversation.findFirst.mockResolvedValue({ status: 'PENDING_ASSIGNMENT' });
      prisma.assignmentRule.findUnique.mockResolvedValue({
        id: 'rule-1',
        strategy: 'ROUND_ROBIN'
      });
      prisma.user.findMany.mockResolvedValue([]);

      const result = await assignmentService.autoAssign('tenant-1', 'conv-1');
      expect(result).toBeNull();
    });

    it('should assign to vendor with least active load and emit socket event', async () => {
      prisma.$transaction.mockImplementation(async (callback) => {
        return callback(prisma);
      });
      
      const mockConversation = { id: 'conv-1', status: 'PENDING_ASSIGNMENT' };
      prisma.conversation.findFirst.mockResolvedValue(mockConversation);
      
      const vendor2 = { id: 'v2', _count: { conversations: 2 } };
      
      prisma.assignmentRule.findUnique.mockResolvedValue({
        id: 'rule-1',
        strategy: 'ROUND_ROBIN'
      });
      prisma.user.findMany.mockResolvedValue([vendor2]); // The service uses take: 1, so it only gets one user

      prisma.conversation.updateMany.mockResolvedValue({ count: 1 });
      
      const mockEmit = jest.fn();
      const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
      const mockOf = jest.fn().mockReturnValue({ to: mockTo });
      getIo.mockReturnValue({ of: mockOf });

      const result = await assignmentService.autoAssign('tenant-1', 'conv-1');

      expect(result).toEqual(vendor2);
      expect(prisma.conversation.updateMany).toHaveBeenCalledWith({
        where: { id: 'conv-1', tenantId: 'tenant-1', status: 'PENDING_ASSIGNMENT' },
        data: { vendorId: 'v2', status: 'ACTIVE' }
      });
      
      expect(mockOf).toHaveBeenCalledWith('/chat');
      expect(mockTo).toHaveBeenCalledWith('vendor_v2');
      expect(mockEmit).toHaveBeenCalledWith('chat:assigned', expect.objectContaining({
        type: 'chat:assigned',
        payload: { conversationId: 'conv-1' }
      }));
    });
  });
});
