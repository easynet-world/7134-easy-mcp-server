
const authenticate = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.user = { id: 1, name: 'Test User' };
  next();
};

const validateUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'User required' });
  }
  next();
};

module.exports = {
  authenticate,
  validateUser
};
