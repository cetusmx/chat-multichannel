const knowledgeBaseService = require('../../src/services/knowledgeBase.service');
const prisma = require('../../src/config/database');
const aiService = require('../../src/services/ai.service');
const ApiError = require('../../src/utils/ApiError');

jest.mock('../../src/config/database', () => ({
  $queryRaw: jest.fn()
}));

jest.mock('../../src/services/ai.service', () => ({
  embed: jest.fn()
}));

describe('KnowledgeBaseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchSimilarChunks', () => {
    it('should throw ApiError if query is empty', async () => {
      await expect(knowledgeBaseService.searchSimilarChunks('tenant1', '')).rejects.toThrow(ApiError);
    });

    it('should fetch embeddings and query database with pgvector', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      aiService.embed.mockResolvedValue(mockEmbedding);
      
      const mockDbResponse = [
        { text: 'chunk 1', similarity: 0.9 },
        { text: 'chunk 2', similarity: 0.8 }
      ];
      prisma.$queryRaw.mockResolvedValue(mockDbResponse);

      const result = await knowledgeBaseService.searchSimilarChunks('tenant1', 'search query', 2);

      expect(aiService.embed).toHaveBeenCalledWith('tenant1', 'search query');
      expect(prisma.$queryRaw).toHaveBeenCalled();
      
      // Verify result
      expect(result).toEqual(mockDbResponse);
    });
  });
});
