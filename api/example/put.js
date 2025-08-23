class PutExample {
  process(req, res) {
    res.json({ message: 'PUT request successful', data: req.body, method: 'PUT' });
  }
}
module.exports = PutExample;
