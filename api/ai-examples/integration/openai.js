const { BaseAPIEnhanced } = require('easy-mcp-server/lib/base-api-enhanced');

/**
 * @description OpenAI integration with multiple models
 * @summary OpenAI 多模型集成
 * @tags ai,openai,integration
 * @requestBody {
 *   "type": "object",
 *   "required": ["prompt"],
 *   "properties": {
 *     "prompt": { "type": "string", "description": "用户提示" },
 *     "model": { "type": "string", "default": "gpt-4", "description": "OpenAI模型" },
 *     "max_tokens": { "type": "number", "default": 1000, "description": "最大token数" },
 *     "temperature": { "type": "number", "default": 0.7, "description": "温度参数" }
 *   }
 * }
 */
class OpenAIIntegrationAPI extends BaseAPIEnhanced {
  constructor() {
    super('openai-integration', {
      llm: { provider: 'openai', apiKey: process.env.OPENAI_API_KEY }
    });
  }

  async process(req, res) {
    const { prompt, model = 'gpt-4', max_tokens = 1000, temperature = 0.7 } = req.body;

    try {
      const response = await this.llm.generateResponse({
        prompt,
        model,
        maxTokens: max_tokens,
        temperature
      });

      this.responseUtils.sendSuccessResponse(res, {
        response,
        model,
        usage: {
          max_tokens,
          temperature
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.responseUtils.sendErrorResponse(res, error.message, 'OPENAI_ERROR');
    }
  }
}

module.exports = OpenAIIntegrationAPI;
