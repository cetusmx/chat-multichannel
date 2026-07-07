process.env.ENCRYPTION_KEY = '01234567890123456789012345678901';

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

      aiService.generateResponse.mockResolvedValue({ content: 'Hello there! We sell widgets.' });

      const result = await aiService.generateAutoResponse('tenant1', 'conv1', 'hello');

      expect(prisma.message.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { 
          conversationId: 'conv1',
          senderType: { in: ['CLIENT', 'IA', 'VENDOR'] },
          content: { not: '' }
        }
      }));
      expect(knowledgeBaseService.searchSimilarChunks).toHaveBeenCalledWith('tenant1', 'hello', 3);
      expect(aiService.generateResponse).toHaveBeenCalledWith(
        'tenant1',
        expect.any(Array), // Formatted history
        expect.stringContaining('Company info: we sell widgets.') // Context
      );
      expect(result).toEqual({ content: 'Hello there! We sell widgets.' });
    });
  });
  describe('generateInlineSuggestion', () => {
    it('should generate an inline suggestion using history and RAG chunks steered by userPrompt', async () => {
      const mockHistory = [
        { senderType: 'CLIENT', content: 'hello' }
      ];
      prisma.message.findMany.mockResolvedValue(mockHistory);

      const mockChunks = [
        { text: 'Company info: we sell widgets.' }
      ];
      knowledgeBaseService.searchSimilarChunks.mockResolvedValue(mockChunks);

      aiService.generateResponse.mockResolvedValue({ content: 'Suggested reply: We sell widgets.' });

      const result = await aiService.generateInlineSuggestion('tenant1', 'conv1', 'summarize our products');

      expect(prisma.message.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { 
          conversationId: 'conv1',
          senderType: { in: ['CLIENT', 'IA', 'VENDOR'] },
          content: { not: '' }
        }
      }));
      expect(knowledgeBaseService.searchSimilarChunks).toHaveBeenCalledWith('tenant1', 'summarize our products: hello', 3);
      expect(aiService.generateResponse).toHaveBeenCalledWith(
        'tenant1',
        expect.any(Array), // Formatted history
        expect.stringMatching(/Company info: we sell widgets/)
      );
      expect(result).toBe('Suggested reply: We sell widgets.');
    });
  });
});
