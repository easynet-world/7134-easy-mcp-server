// OpenAPI will be auto-attached by the loader using Request/Response classes

// @description ('Request payload')
class Request {
  // @description ('Filter by active status')
  active: boolean;
}

import { User } from './models';

// @description ('Response payload')
class Response {
  // @description ('Array of user records')
  users: User[];
}

// @description('List users with optional active filter')
// @summary('List users')
// @tags('users')

function handler(req: any, res: any) {
  // Build typed request object
  const input = new Request();
  if (req.query && req.query.active !== undefined) {
    input.active = String(req.query.active) === 'true';
  }

  // Build typed response object
  const all: User[] = [
    { id: 1, name: 'John', active: true, email: 'john@example.com' },
    { id: 2, name: 'Jane', active: false, email: 'jane@example.com' }
  ];
  const output = new Response();
  output.users = input.active !== undefined ? all.filter(u => u.active === input.active) : all;

  res.json(output);
}

module.exports = handler;
export {};
