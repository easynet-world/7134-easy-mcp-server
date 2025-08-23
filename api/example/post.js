class PostExample {
  process(req, res) {
    res.json({ message: 'POST request successful', data: req.body, method: 'POST' });
  }
  
  get description() {
    return 'Create new data on the server. This endpoint accepts JSON data in the request body and returns the submitted data along with a success message.';
  }
}
module.exports = PostExample;