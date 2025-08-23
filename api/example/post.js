class PostExample {
  process(req, res) {
    res.json({ message: 'POST request successful', data: req.body, method: 'POST' });
  }
}
module.exports = PostExample;