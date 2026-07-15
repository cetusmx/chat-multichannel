const AIProvider = require('./ai.provider.interface');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const ApiError = require('../utils/ApiError');
const prisma = require('../config/database');
const { decrypt } = require('../utils/encryption');

class GeminiProvider extends AIProvider {
  constructor() {
    super();
    this.defaultModel = 'gemini-1.5-flash';
  }

  async _getApiKey(tenantId) {
    const aiConfig = await prisma.aiConfig.findUnique({ where: { tenantId } });
    if (!aiConfig) throw new ApiError(404, 'AI configuration not found');
    return decrypt(aiConfig.apiKey);
  }

  async validateKey(apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: this.defaultModel });
      // Dummy call to validate key
      await model.generateContent('ping');
      return true;
    } catch (error) {
      throw new ApiError(400, 'Invalid Gemini API Key: ' + error.message);
    }
  }

  async generateResponse({ messages, context, tenantId }) {
    try {
      if (!messages || messages.length === 0) {
        throw new ApiError(400, 'Messages array cannot be empty');
      }

      const apiKey = await this._getApiKey(tenantId);
      const genAI = new GoogleGenerativeAI(apiKey);
      
      const formattedMessages = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: String(m.content || '') }]
      }));

      // System instruction is supported in gemini-1.5-flash and above
      let modelOptions = { model: this.defaultModel };
      if (context) {
        modelOptions.systemInstruction = typeof context === 'string' ? context : JSON.stringify(context);
      }
      
      const configuredModel = genAI.getGenerativeModel(modelOptions);
      
      const chat = configuredModel.startChat({
        history: formattedMessages.slice(0, -1),
      });

      const lastMessage = formattedMessages[formattedMessages.length - 1];
      const result = await chat.sendMessage(lastMessage.parts[0].text);
      return { content: result.response.text() };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(502, 'Gemini Provider Error: ' + error.message);
    }
  }

  async streamResponse({ messages, context, tenantId }) {
     throw new ApiError(501, 'Stream not implemented yet');
  }

  async embed({ text, tenantId }) {
    try {
      if (!text) throw new ApiError(400, 'Text cannot be empty for embedding');
      
      const apiKey = await this._getApiKey(tenantId);
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Use the recommended model for embeddings
      const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
      
      const result = await model.embedContent(text);
      const embedding = result.embedding;
      return embedding.values; // Returns Array of numbers
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(502, 'Gemini Provider Embed Error: ' + error.message);
    }
  }
}

module.exports = GeminiProvider;
