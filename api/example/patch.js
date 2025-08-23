class PatchExample {
  process(req, res) {
    res.json({ message: 'PATCH request successful', data: req.body, method: 'PATCH' });
  }
  
  get description() {
    return 'Partially update a resource on the server. This endpoint allows you to modify specific fields of an existing resource without replacing the entire object.';
  }
}
module.exports = PatchExample;