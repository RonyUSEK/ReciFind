const OpenAI = require('openai');

// Initialize OpenAI client
let openai = null;

function getOpenAIClient() {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

/**
 * Check if OpenAI is configured
 */
function isConfigured() {
  return !!process.env.OPENAI_API_KEY;
}

module.exports = {
  getOpenAIClient,
  isConfigured,
};
