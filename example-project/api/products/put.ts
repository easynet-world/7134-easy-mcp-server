// OpenAPI will be auto-attached by the loader using Request/Response classes

import { Product } from './models';

// @description ('Request payload')
class Request {
  // @description ('Updated product payload')
  product: Product;
}

// @description ('Response payload')
class Response {
  // @description ('Updated product')
  product: Product;
}

// @description('Update an existing product by ID with a new name')
// @summary('Update product')
// @tags('products')
function handler(req: any, res: any) {
  // Build typed request object
  const input = new Request();
  input.product = new Product();
  if (req.body && req.body.product) {
    const p = req.body.product;
    if (typeof p.id === 'string') input.product.id = p.id;
    if (typeof p.name === 'string') input.product.name = p.name;
    if (typeof p.price === 'number') input.product.price = p.price;
    if (Array.isArray(p.tags)) input.product.tags = p.tags;
  }
  // Build typed response object
  const output = new Response();
  output.product = new Product();
  output.product.id = input.product?.id;
  output.product.name = input.product?.name;
  output.product.price = input.product?.price;
  output.product.tags = input.product?.tags || [];
  res.json(output);
}

module.exports = handler;
export {};
