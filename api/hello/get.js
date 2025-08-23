class HelloProcessor {
  process(req, res) {
    res.json({ message: 'Hello World!' });
  }
}
module.exports = HelloProcessor;
