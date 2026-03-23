const fs = require('fs');
const path = require('path');

const promptPath = path.join(__dirname, 'prompt.md');

module.exports = {
  api: {
    baseURL: process.env.AI_BASE_URL || 'https://your-openai-compatible-host/v1',
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || 'your-model-name',
    temperature: 0.05,
    timeoutMs: 60000
  },
  prompt: {
    system: fs.readFileSync(promptPath, 'utf8').trim()
  }
};
