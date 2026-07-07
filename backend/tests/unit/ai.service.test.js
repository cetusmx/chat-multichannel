const aiService = require('../../src/services/ai.service');
const prisma = require('../../src/config/database');
const knowledgeBaseService = require('../../src/services/knowledgeBase.service');
const ApiError = require('../../src/utils/ApiError');

jest.mock('../../src/config/database', () => ({
  message: {
    findMany: jest.fn()
  }
}));

jest.mock('../../src/services/knowledgeBase.service', () => ({
  searchSimilarChunks: jest.fn()
}));

// We'll mock generateResponse since it is an internal call
jest.spyOn(aiService, 'generateResponse').mockImplementation();

describe('AIService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAutoResponse', () => {
    it('should generate an auto response using history and RAG chunks', async () => {
      const mockHistory = [
        { senderType: 'CLIENT', content: 'hello' }
      ];
      prisma.message.findMany.mockResolvedValue(mockHistory);

      const mockChunks = [
        { text: 'Company info: we sell widgets.' }
      ];
      knowledgeBaseService.searchSimilarChunks.mockResolvedValue(mockChunks);

      aiService.generateResponse.mockResolvedValue('Hello there! We sell widgets.');

      const result = await aiService.generateAutoResponse('tenant1', 'conv1', 'hello');

      expect(prisma.message.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { conversationId: 'conv1' }
      }));
      expect(knowledgeBaseService.searchSimilarChunks).toHaveBeenCalledWith('tenant1', 'hello', 3);
      expect(aiService.generateResponse).toHaveBeenCalledWith(
        'tenant1',
        expect.any(Array), // Formatted history
        expect.stringContaining('Company info: we sell widgets.') // Context
      );
      expect(result).toBe('Hello there! We sell widgets.');
    });
  });
});
