// OpenAPI will be auto-attached by the loader using Request/Response classes

// @description ('Request payload')
class Request {
  // @description ('Filter by active status')
  active: boolean;
}

import { User } from './models';

class Response {
  // @description ('List of users')
  users: User[];
}

// @description('List users with optional active filter')
// @summary('List users')
// @tags('users')

function handler(req: any, res: any) {
  res.json({ users: [{ id: 1, name: 'John', active: true, email: 'john@example.com' }] });
}

module.exports = handler;
export {};
