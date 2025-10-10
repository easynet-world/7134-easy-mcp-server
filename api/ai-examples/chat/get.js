const { BaseAPIEnhanced } = require('easy-mcp-server/lib/base-api-enhanced');

/**
 * @description AI Chat endpoint with streaming support
 * @summary AI聊天接口 - 支持流式响应
 * @tags ai,chat,openai
 * @requestBody {
 *   "type": "object",
 *   "required": ["message"],
 *   "properties": {
 *     "message": { "type": "string", "description": "用户消息" },
 *     "model": { "type": "string", "default": "gpt-4", "description": "AI模型" },
 *     "stream": { "type": "boolean", "default": false }
 *   }
 * }
 */
class AIChatAPI extends BaseAPIEnhanced {
  constructor() {
    super('ai-chat', {
      llm: { provider: 'openai', apiKey: process.env.OPENAI_API_KEY }
    });
  }

  async process(req, res) {
    const { message, model = 'gpt-4', stream = false } = req.body;

    try {
      const response = await this.llm.generateResponse({
        prompt: message,
        model,
        stream
      });

      this.responseUtils.sendSuccessResponse(res, {
        reply: response,
        model,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.responseUtils.sendErrorResponse(res, error.message, 'AI_ERROR');
    }
  }
}

module.exports = AIChatAPI;
