import { Request, Response } from 'express';

/**
 * Example POST API endpoint
 *
 * @api {post} /example Create example data
 * @apiName CreateExample
 * @apiGroup Example
 * @apiParam {String} message Example message
 * @apiSuccess {Object} data Created data
 */

// @description ('Request payload')
class RequestPayload {
  // @description ('Example message')
  message!: string;
}

// @description ('Response payload')
class ResponsePayload {
  // @description ('Created data')
  data?: {
    message: string;
    timestamp: number;
    id: string;
  };
  // @description ('Error message')
  error?: string;
}

// @description('Create example data')
// @summary('Create example data')
// @tags('example')
function handler(req: Request, res: Response): void {
  const { message } = req.body;

  if (!message) {
    res.status(400).json({
      error: 'Message is required'
    });
    return;
  }

  const output: ResponsePayload = {
    data: {
      message: message,
      timestamp: Date.now(),
      id: Math.random().toString(36).substr(2, 9)
    }
  };

  res.status(201).json(output);
}

module.exports = handler;
export {};
