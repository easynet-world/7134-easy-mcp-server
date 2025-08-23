class GetExample {
  process(req, res) {
    res.json({ message: 'GET request successful', method: 'GET' });
  }
}
module.exports = GetExample;
