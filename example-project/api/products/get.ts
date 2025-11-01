// OpenAPI will be auto-attached by the loader using Request/Response classes

// @description ('Request payload')
class Request {
  // @description ('Number of products to return')
  limit: number = undefined as any;
}

import { Product } from './models';

// @description ('Response payload')
class Response {
  // @description ('Array of product records')
  products: Product[];
}

// @description('List products with optional limit')
// @summary('List products')
// @tags('products')
function handler(req: any, res: any) {
  // Build typed request object
  const input = new Request();
  if (req.query && req.query.limit !== undefined) {
    const n = Number(req.query.limit);
    if (!Number.isNaN(n)) input.limit = n;
  }

  // Build typed response object
  const all: Product[] = [
    { id: '1', name: 'Product 1', price: 10, tags: [] },
    { id: '2', name: 'Product 2', price: 20, tags: [] }
  ];
  const output = new Response();
  output.products = input.limit !== undefined ? all.slice(0, input.limit) : all;

  res.json(output);
}

module.exports = handler;
export {};
