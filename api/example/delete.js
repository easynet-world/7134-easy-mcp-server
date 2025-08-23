class DeleteExample {
  process(req, res) {
    res.json({ message: 'DELETE request successful', method: 'DELETE' });
  }
}
module.exports = DeleteExample;
