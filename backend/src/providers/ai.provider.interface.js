class AIProvider {
  /**
   * Validates if the given API key is valid.
   * @param {string} apiKey - The provider's API key
   * @returns {Promise<boolean>} True if valid, throws ApiError if invalid
   */
  async validateKey(apiKey) {
    throw new Error('Not implemented');
  }

  /**
   * Generates a response from the AI provider
   * @param {Object} params
   * @param {Array} params.messages - Conversation history
   * @param {Object|string} params.context - Additional context
   * @param {string} params.tenantId - The tenant ID
   */
  async generateResponse({ messages, context, tenantId }) {
    throw new Error('Not implemented');
  }

  async streamResponse({ messages, context, tenantId }) {
    throw new Error('Not implemented');
  }

  async embed({ text, tenantId }) {
    throw new Error('Not implemented');
  }
}

module.exports = AIProvider;
