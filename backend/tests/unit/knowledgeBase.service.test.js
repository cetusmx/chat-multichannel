process.env.ENCRYPTION_KEY = '01234567890123456789012345678901';

const knowledgeBaseService = require('../../src/services/knowledgeBase.service');
const prisma = require('../../src/config/database');
const ApiError = require('../../src/utils/ApiError');

jest.mock('../../src/config/database', () => ({
  $queryRaw: jest.fn()
}));

describe('KnowledgeBaseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchSimilarChunks', () => {
    it('should throw ApiError if embedding is empty', async () => {
      await expect(knowledgeBaseService.searchSimilarChunks('tenant1', null)).rejects.toThrow(ApiError);
    });

    it('should query database with pgvector', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      
      const mockDbResponse = [
        { text: 'chunk 1', similarity: 0.9 },
        { text: 'chunk 2', similarity: 0.8 }
      ];
      prisma.$queryRaw.mockResolvedValue(mockDbResponse);

      const result = await knowledgeBaseService.searchSimilarChunks('tenant1', mockEmbedding, 2);

      expect(prisma.$queryRaw).toHaveBeenCalled();
      
      // Verify result
      expect(result).toEqual(mockDbResponse);
    });
  });
});
