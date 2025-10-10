const { BaseAPIEnhanced } = require('easy-mcp-server/lib/base-api-enhanced');

/**
 * @description AI-powered sentiment analysis
 * @summary AI 情感分析
 * @tags ai,analysis,sentiment
 * @requestBody {
 *   "type": "object",
 *   "required": ["text"],
 *   "properties": {
 *     "text": { "type": "string", "description": "要分析的文本" },
 *     "language": { "type": "string", "default": "auto", "description": "文本语言" },
 *     "detailed": { "type": "boolean", "default": false, "description": "是否返回详细分析" }
 *   }
 * }
 */
class SentimentAnalysisAPI extends BaseAPIEnhanced {
  constructor() {
    super('sentiment-analysis', {
      llm: { provider: 'openai', apiKey: process.env.OPENAI_API_KEY }
    });
  }

  async process(req, res) {
    const { text, language = 'auto', detailed = false } = req.body;

    try {
      const prompt = detailed 
        ? `Analyze the sentiment of this text in detail: "${text}". Provide sentiment (positive/negative/neutral), confidence score, and reasoning.`
        : `Analyze the sentiment of this text: "${text}". Return only: sentiment (positive/negative/neutral) and confidence (0-1).`;

      const response = await this.llm.generateResponse({
        prompt,
        model: 'gpt-4'
      });

      // Parse the response to extract sentiment and confidence
      const sentimentMatch = response.match(/(positive|negative|neutral)/i);
      const confidenceMatch = response.match(/confidence[:\s]*([0-9.]+)/i);
      
      const sentiment = sentimentMatch ? sentimentMatch[1].toLowerCase() : 'neutral';
      const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5;

      this.responseUtils.sendSuccessResponse(res, {
        text,
        sentiment,
        confidence,
        analysis: detailed ? response : undefined,
        language,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.responseUtils.sendErrorResponse(res, error.message, 'SENTIMENT_ERROR');
    }
  }
}

module.exports = SentimentAnalysisAPI;
