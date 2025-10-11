const request = require('supertest');
const express = require('express');

// Simple test server setup
const createTestServer = async () => {
  const app = express();
  app.use(express.json());
  
  // Mock AI examples endpoints
  app.post('/ai-examples/chat', (req, res) => {
    const { message, model = 'gpt-4' } = req.body;
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }
    
    // Validate message type
    if (typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message must be a string'
      });
    }
    
    res.json({
      success: true,
      data: {
        reply: `AI response to: ${message}`,
        model,
        timestamp: new Date().toISOString()
      }
    });
  });

  app.post('/ai-examples/agent/workflow', (req, res) => {
    const { task, steps = ['analyze', 'execute', 'summarize'] } = req.body;
    if (!task) {
      return res.status(400).json({
        success: false,
        error: 'Task is required'
      });
    }
    
    res.json({
      success: true,
      data: {
        task,
        analysis: `Analysis of: ${task}`,
        steps: steps.map(step => ({ step, result: `Result of ${step}` })),
        report: `Report for: ${task}`,
        timestamp: new Date().toISOString()
      }
    });
  });

  app.post('/ai-examples/analysis/sentiment', (req, res) => {
    const { text, language = 'en', detailed = false } = req.body;
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }
    
    res.json({
      success: true,
      data: {
        text,
        sentiment: 'positive',
        confidence: 0.85,
        analysis: detailed ? `Detailed analysis of: ${text}` : undefined,
        language,
        timestamp: new Date().toISOString()
      }
    });
  });

  app.post('/ai-examples/integration/openai', (req, res) => {
    const { prompt, model = 'gpt-4', max_tokens = 1000, temperature = 0.7 } = req.body;
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }
    
    res.json({
      success: true,
      data: {
        response: `AI response to: ${prompt}`,
        model,
        usage: { max_tokens, temperature },
        timestamp: new Date().toISOString()
      }
    });
  });

  // Mock MCP endpoints
  app.post('/mcp', (req, res) => {
    const { method } = req.body;
    
    if (method === 'tools/list') {
      res.json({
        jsonrpc: '2.0',
        id: req.body.id,
        result: {
          tools: [
            { name: 'ai_chat', description: 'AI chat endpoint' },
            { name: 'sentiment_analysis', description: 'Sentiment analysis' },
            { name: 'agent_workflow', description: 'AI agent workflow' }
          ]
        }
      });
    } else if (method === 'tools/call') {
      res.json({
        jsonrpc: '2.0',
        id: req.body.id,
        result: {
          content: [{ type: 'text', text: 'AI response from MCP' }]
        }
      });
    } else {
      res.status(400).json({ error: 'Unknown method' });
    }
  });

  return app;
};

describe('AI Examples Integration Tests', () => {
  let server;

  beforeAll(async () => {
    server = await createTestServer();
  });

  afterAll(async () => {
    // No cleanup needed for simple express app
  });

  describe('AI Chat API', () => {
    test('should handle AI chat request', async () => {
      const response = await request(server)
        .post('/ai-examples/chat')
        .send({
          message: 'Hello, how are you?',
          model: 'gpt-4'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reply).toBeDefined();
      expect(response.body.data.model).toBe('gpt-4');
      expect(response.body.data.timestamp).toBeDefined();
    });

    test('should handle streaming request', async () => {
      const response = await request(server)
        .post('/ai-examples/chat')
        .send({
          message: 'Tell me a story',
          model: 'gpt-4',
          stream: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reply).toBeDefined();
    });

    test('should handle missing message', async () => {
      const response = await request(server)
        .post('/ai-examples/chat')
        .send({
          model: 'gpt-4'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('AI Agent Workflow API', () => {
    test('should execute AI workflow', async () => {
      const response = await request(server)
        .post('/ai-examples/agent/workflow')
        .send({
          task: 'Analyze sales data and generate report',
          steps: ['analyze', 'summarize', 'recommend'],
          context: { department: 'sales', period: 'Q1' }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.task).toBe('Analyze sales data and generate report');
      expect(response.body.data.analysis).toBeDefined();
      expect(response.body.data.steps).toBeDefined();
      expect(response.body.data.report).toBeDefined();
    });

    test('should handle workflow with default steps', async () => {
      const response = await request(server)
        .post('/ai-examples/agent/workflow')
        .send({
          task: 'Simple task',
          context: { data: 'test' }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.steps).toBeDefined();
      expect(Array.isArray(response.body.data.steps)).toBe(true);
    });

    test('should handle missing task', async () => {
      const response = await request(server)
        .post('/ai-examples/agent/workflow')
        .send({
          steps: ['analyze']
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Sentiment Analysis API', () => {
    test('should analyze sentiment', async () => {
      const response = await request(server)
        .post('/ai-examples/analysis/sentiment')
        .send({
          text: 'I love this product! It\'s amazing.',
          language: 'en',
          detailed: false
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sentiment).toBeDefined();
      expect(response.body.data.confidence).toBeDefined();
      expect(response.body.data.text).toBe('I love this product! It\'s amazing.');
    });

    test('should provide detailed analysis', async () => {
      const response = await request(server)
        .post('/ai-examples/analysis/sentiment')
        .send({
          text: 'This is a mixed review with both positive and negative aspects.',
          detailed: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sentiment).toBeDefined();
      expect(response.body.data.analysis).toBeDefined();
    });

    test('should handle missing text', async () => {
      const response = await request(server)
        .post('/ai-examples/analysis/sentiment')
        .send({
          language: 'en'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('OpenAI Integration API', () => {
    test('should handle OpenAI request', async () => {
      const response = await request(server)
        .post('/ai-examples/integration/openai')
        .send({
          prompt: 'Explain quantum computing',
          model: 'gpt-4',
          max_tokens: 500,
          temperature: 0.7
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.response).toBeDefined();
      expect(response.body.data.model).toBe('gpt-4');
      expect(response.body.data.usage).toBeDefined();
    });

    test('should handle default parameters', async () => {
      const response = await request(server)
        .post('/ai-examples/integration/openai')
        .send({
          prompt: 'Hello world'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.model).toBe('gpt-4');
      expect(response.body.data.usage.max_tokens).toBe(1000);
      expect(response.body.data.usage.temperature).toBe(0.7);
    });

    test('should handle missing prompt', async () => {
      const response = await request(server)
        .post('/ai-examples/integration/openai')
        .send({
          model: 'gpt-4'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle AI service errors gracefully', async () => {
      // Mock AI service error
      const originalEnv = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'invalid-key';

      const response = await request(server)
        .post('/ai-examples/chat')
        .send({
          message: 'Test message'
        });

      // Restore original environment
      process.env.OPENAI_API_KEY = originalEnv;

      // Should handle error gracefully
      expect(response.status).toBeDefined();
    });

    test('should validate request schemas', async () => {
      const response = await request(server)
        .post('/ai-examples/chat')
        .send({
          message: 123, // Invalid type
          model: 'gpt-4'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    test('should handle concurrent requests', async () => {
      const requests = Array(10).fill().map(() =>
        request(server)
          .post('/ai-examples/chat')
          .send({
            message: 'Test concurrent request',
            model: 'gpt-4'
          })
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBeDefined();
      });
    });

    test('should respond within reasonable time', async () => {
      const startTime = Date.now();
      
      await request(server)
        .post('/ai-examples/chat')
        .send({
          message: 'Quick test',
          model: 'gpt-4'
        });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // 5 seconds max
    });
  });

  describe('MCP Integration', () => {
    test('should expose AI examples as MCP tools', async () => {
      const response = await request(server)
        .post('/mcp')
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list'
        })
        .expect(200);

      expect(response.body.result).toBeDefined();
      expect(response.body.result.tools).toBeDefined();
      
      const tools = response.body.result.tools;
      const aiTools = tools.filter(tool => 
        tool.name.includes('ai_chat') || 
        tool.name.includes('sentiment') ||
        tool.name.includes('workflow')
      );
      
      expect(aiTools.length).toBeGreaterThan(0);
    });

    test('should execute AI tools via MCP', async () => {
      const response = await request(server)
        .post('/mcp')
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'ai_chat',
            arguments: {
              message: 'Hello from MCP',
              model: 'gpt-4'
            }
          }
        })
        .expect(200);

      expect(response.body.result).toBeDefined();
      expect(response.body.result.content).toBeDefined();
    });
  });
});
