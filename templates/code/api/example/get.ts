import { Request, Response } from 'express';

/**
 * Example GET API endpoint
 *
 * @api {get} /example Get example data
 * @apiName GetExample
 * @apiGroup Example
 * @apiSuccess {Object} data Example data object
 * @apiSuccess {String} data.message Example message
 * @apiSuccess {Number} data.timestamp Current timestamp
 */

// @description ('Request payload')
class RequestPayload {
  // Optional query parameters can be added here
}

// @description ('Response payload')
class ResponsePayload {
  // @description ('Response data')
  data: {
    message: string;
    timestamp: number;
    description: string;
  };
}

// @description('Get example data')
// @summary('Get example data')
// @tags('example')
function handler(req: Request, res: Response): void {
  const output: ResponsePayload = {
    data: {
      message: 'This is an example API endpoint',
      timestamp: Date.now(),
      description: 'This endpoint was automatically generated when you ran easy-mcp-server init'
    }
  };

  res.json(output);
}

module.exports = handler;
export {};
