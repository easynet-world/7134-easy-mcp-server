const { BaseAPIEnhanced } = require('easy-mcp-server/lib/base-api-enhanced');

/**
 * @description AI Agent multi-step workflow execution
 * @summary AI Agent 多步骤工作流执行
 * @tags ai,agent,workflow
 * @requestBody {
 *   "type": "object",
 *   "required": ["task"],
 *   "properties": {
 *     "task": { "type": "string", "description": "任务描述" },
 *     "steps": { "type": "array", "items": { "type": "string" }, "description": "执行步骤" },
 *     "context": { "type": "object", "description": "上下文数据" }
 *   }
 * }
 */
class AIAgentWorkflowAPI extends BaseAPIEnhanced {
  constructor() {
    super('ai-agent-workflow', {
      llm: { provider: 'openai', apiKey: process.env.OPENAI_API_KEY }
    });
  }

  async process(req, res) {
    const { task, steps = [], context = {} } = req.body;

    try {
      // Step 1: Analyze the task
      const analysis = await this.llm.generateResponse({
        prompt: `Analyze this task and break it down into steps: ${task}`,
        model: 'gpt-4'
      });

      // Step 2: Execute each step
      const results = [];
      for (const step of steps.length > 0 ? steps : ['analyze', 'execute', 'summarize']) {
        const stepResult = await this.llm.generateResponse({
          prompt: `Execute this step: ${step}. Context: ${JSON.stringify(context)}`,
          model: 'gpt-4'
        });
        results.push({ step, result: stepResult });
      }

      // Step 3: Generate final report
      const report = await this.llm.generateResponse({
        prompt: `Generate a final report based on these results: ${JSON.stringify(results)}`,
        model: 'gpt-4'
      });

      this.responseUtils.sendSuccessResponse(res, {
        task,
        analysis,
        steps: results,
        report,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.responseUtils.sendErrorResponse(res, error.message, 'WORKFLOW_ERROR');
    }
  }
}

module.exports = AIAgentWorkflowAPI;
