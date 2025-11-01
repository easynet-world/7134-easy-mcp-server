import { User } from './models';
// OpenAPI will be auto-attached by the loader using Request/Response classes

// @description ('Request payload')
class Request {
  // @description ('User to create')
  user: User;
}

// @description ('Response payload')
class Response {
  // @description ('Created user')
  user: User;
}

// @description('Create a new user')
// @summary('Create user')
// @tags('users')
function handler(req: any, res: any) {
  // Build typed request object
  const input = new Request();
  input.user = new User();
  if (req.body && req.body.user) {
    const u = req.body.user;
    if (typeof u.id === 'number') input.user.id = u.id;
    if (typeof u.name === 'string') input.user.name = u.name;
    if (typeof u.email === 'string') input.user.email = u.email;
    if (typeof u.active === 'boolean') input.user.active = u.active;
  }
  // Build typed response object
  const output = new Response();
  output.user = new User();
  output.user.id = input.user?.id ?? 3;
  output.user.name = input.user?.name;
  output.user.email = input.user?.email;
  output.user.active = input.user?.active ?? true;
  res.json(output);
}

module.exports = handler;
export {};
