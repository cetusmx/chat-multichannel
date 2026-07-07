const { getProvider } = require('../providers');
const ApiError = require('../utils/ApiError');

/**
 * AI Service 
 * Acts as a facade to the AI Provider Adapter.
 */
class AIService {
  
  async generateResponse(tenantId, messages, context = '') {
    try {
      const providerName = process.env.AI_PROVIDER || 'gemini';
      const provider = getProvider(providerName);
      return await provider.generateResponse({ messages, context, tenantId });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.internal('AI Service Error: ' + error.message);
    }
  }

  async embed(tenantId, text) {
    try {
      const providerName = process.env.AI_PROVIDER || 'gemini';
      const provider = getProvider(providerName);
      return await provider.embed({ text, tenantId });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.internal('AI Service Embed Error: ' + error.message);
    }
  }

  async generateAutoResponse(tenantId, conversationId, incomingText) {
    if (!tenantId || !conversationId || !incomingText) {
      throw new ApiError(400, 'Missing required parameters for auto-response');
    }
    const prisma = require('../config/database');
    const knowledgeBaseService = require('./knowledgeBase.service');

    try {
      // Fetch history
      const history = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: 10
      });
      
      // Map history to provider format (in chronological order)
      const formattedHistory = history
        .filter(msg => msg.senderType === 'CLIENT' || msg.senderType === 'IA' || msg.senderType === 'VENDOR')
        .reverse()
        .map(msg => ({
          role: msg.senderType === 'CLIENT' ? 'user' : 'model',
          content: msg.content || ' '
        }));

      // Query RAG chunks
      let contextString = '';
      try {
        const embedding = await this.embed(tenantId, incomingText);
        const chunks = await knowledgeBaseService.searchSimilarChunks(tenantId, embedding, 3);
        if (chunks && chunks.length > 0) {
          contextString = chunks.map(c => c.text).join('\n\n');
        }
      } catch (err) {
        console.warn('RAG search failed, continuing without context:', err.message);
      }

      if (!contextString) {
        return `You are a helpful sales assistant. However, I currently do not have access to the knowledge base. Please kindly inform the user that a human representative will assist them shortly.`;
      }

      const systemInstruction = `You are a helpful sales assistant for this company. Use ONLY the following context to answer the user's questions. If the context doesn't have the answer, say you don't know.\n\nContext:\n${contextString}`;

      return await this.generateResponse(tenantId, formattedHistory, systemInstruction);
    } catch (error) {
      console.error('[AI_SERVICE] Error generating auto-response:', error.message);
      throw error;
    }
  }

}

module.exports = new AIService();
