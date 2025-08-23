class GetExample {
  process(req, res) {
    res.json({ message: 'GET request successful', method: 'GET' });
  }
  
  get description() {
    return 'Retrieve data from the server. This endpoint demonstrates a simple GET request that returns a success message.';
  }
}
module.exports = GetExample;