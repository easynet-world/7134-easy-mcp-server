/**
 * Simple middleware example for the example project
 * This file demonstrates basic middleware patterns
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Simple request logger
 */
export function logger(req: Request, res: Response, next: NextFunction): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
}

/**
 * Add a custom header to all responses
 */
export function addCustomHeader(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Example-Project', 'true');
  next();
}

// For backwards compatibility with CommonJS require
module.exports = {
  logger,
  addCustomHeader
};

export {};
