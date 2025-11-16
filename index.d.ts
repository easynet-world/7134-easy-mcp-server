/**
 * Type definitions for easy-mcp-server
 */

/// <reference types="express" />

import { Application } from 'express';

export interface DynamicAPIServerOptions {
  port?: number;
  host?: string;
  cors?: {
    origin?: string | string[];
    methods?: string[];
    credentials?: boolean;
  };
  apiPath?: string;
  hotReload?: boolean;
  staticDirectory?: string | null;
  defaultFile?: string;
  enhancedHealth?: boolean;
  llmContextFiles?: boolean;
  adminEndpoints?: boolean;
  docsConfig?: {
    docExpansion?: 'list' | 'full' | 'none';
    defaultModelsExpandDepth?: number;
    defaultModelExpandDepth?: number;
    tryItOutEnabled?: boolean;
    requestInterceptor?: (request: any) => any;
    responseInterceptor?: (response: any) => any;
  };
}

export interface Route {
  path: string;
  method: string;
  processor: string;
  processorInstance?: any;
}

export interface APILoader {
  getRoutes(): Route[];
  getErrors(): any[];
  validateRoutes(): any[];
  loadAPIs(): void;
  reloadAPIs(): void;
}

export interface OpenAPIGenerator {
  generateSpec(): any;
}

export class DynamicAPIServer {
  port: number;
  host: string;
  cors: DynamicAPIServerOptions['cors'];
  apiPath: string;
  hotReload: boolean;
  staticDirectory: string | null;
  defaultFile: string;
  enhancedHealth: boolean;
  llmContextFiles: boolean;
  adminEndpoints: boolean;
  docsConfig: DynamicAPIServerOptions['docsConfig'];
  apisLoaded: boolean;
  app: Application;
  apiLoader: APILoader;
  openapiGenerator: OpenAPIGenerator;
  server: any;

  constructor(options?: DynamicAPIServerOptions);

  start(): Promise<void>;
  stop(): Promise<void>;
  reload(): void;
  getAPILoader(): APILoader;
  getOpenAPIGenerator(): OpenAPIGenerator;
  ensureApisLoaded(): void;
  addRoute(method: string, path: string, handler: any): void;
  addMiddleware(middleware: any): void;
  get expressApp(): Application;
}

export class BaseAPI {
  // Add method signatures as needed
}

export class BaseAPIEnhanced {
  // Add method signatures as needed
}

export class APILoader {
  // Add method signatures as needed
}

export class OpenAPIGenerator {
  // Add method signatures as needed
}

export class DynamicAPIMCPServer {
  // Add method signatures as needed
}

export class APIResponseUtils {
  static sendSuccessResponse(res: any, data?: any, message?: string, statusCode?: number): any;
  static sendErrorResponse(res: any, message: string, statusCode?: number, details?: any, errorCode?: string): any;
  // Add other static methods as needed
}

export function createLLMService(options?: any): any;

export class Logger {
  // Add method signatures as needed
}

export class HotReloader {
  // Add method signatures as needed
}

export class EnvHotReloader {
  // Add method signatures as needed
}

export class MCPBridgeReloader {
  // Add method signatures as needed
}

// For CommonJS compatibility
declare namespace EasyMcpServer {
  export { DynamicAPIServer, BaseAPI, BaseAPIEnhanced, APILoader, OpenAPIGenerator, DynamicAPIMCPServer, APIResponseUtils, createLLMService, Logger, HotReloader, EnvHotReloader, MCPBridgeReloader };
}

declare const easyMcpServer: {
  DynamicAPIServer: typeof DynamicAPIServer;
  BaseAPI: typeof BaseAPI;
  BaseAPIEnhanced: typeof BaseAPIEnhanced;
  APILoader: typeof APILoader;
  OpenAPIGenerator: typeof OpenAPIGenerator;
  DynamicAPIMCPServer: typeof DynamicAPIMCPServer;
  APIResponseUtils: typeof APIResponseUtils;
  createLLMService: typeof createLLMService;
  Logger: typeof Logger;
  HotReloader: typeof HotReloader;
  EnvHotReloader: typeof EnvHotReloader;
  MCPBridgeReloader: typeof MCPBridgeReloader;
};

export default easyMcpServer;
