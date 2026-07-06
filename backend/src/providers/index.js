const GeminiProvider = require('./gemini.provider');
const ApiError = require('../utils/ApiError');

function getProvider(providerName = process.env.AI_PROVIDER || 'gemini') {
  const name = (providerName || process.env.AI_PROVIDER || 'gemini').toLowerCase();
  switch (name) {
    case 'gemini':
      return new GeminiProvider();
    default:
      throw new ApiError(500, `AI Provider '${providerName}' is not supported`);
  }
}

module.exports = { getProvider };
