import { Product } from './models';

// @description ('Request payload')
class Request {
  // @description ('Product to create')
  product: Product;
}

// @description ('Operation result')
class Response {
  // @description ('Created product')
  product: Product;
}

// @description('Create a new product')
// @summary('Create product')
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
  output.product.id = input.product?.id || 'new-id';
  output.product.name = input.product?.name;
  output.product.price = input.product?.price;
  output.product.tags = input.product?.tags || [];

  // Return the response's JSON
  res.json(output);
}

module.exports = handler;
export {};
