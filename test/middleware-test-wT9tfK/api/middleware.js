
const logRequest = (req, res, next) => {
  console.log('Global middleware:', req.method, req.path);
  next();
};

const addTimestamp = (req, res, next) => {
  req.timestamp = new Date().toISOString();
  next();
};

module.exports = [logRequest, addTimestamp];
