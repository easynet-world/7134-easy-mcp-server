class PutExample {
  process(req, res) {
    res.json({ message: 'PUT request successful', data: req.body, method: 'PUT' });
  }
  
  get description() {
    return 'Update an entire resource on the server. This endpoint replaces the complete resource with the data provided in the request body.';
  }
}
module.exports = PutExample;