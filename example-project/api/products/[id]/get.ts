// OpenAPI will be auto-attached by the loader using Request/Response classes

import { Product } from '../models';

// @description ('Response payload')
class Response {
  // @description ('Product data')
  product: Product;
}

// @description('Get product by ID')
// @summary('Get product')
// @tags('products')
function handler(req: any, res: any) {
  const id = String((req.params && req.params.id) || '');
  // Build response
  const output = new Response();
  output.product = new Product();
  output.product.id = id;
  output.product.name = `Product ${id}`;
  res.json(output);
}

module.exports = handler;
export {};
