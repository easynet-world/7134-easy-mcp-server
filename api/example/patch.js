class PatchExample {
  process(req, res) {
    res.json({ message: 'PATCH request successful', data: req.body, method: 'PATCH' });
  }
}
module.exports = PatchExample;