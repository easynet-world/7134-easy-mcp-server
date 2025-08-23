class UserProfileProcessor {
  process(req, res) {
    res.json({ 
      user: {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        profile: 'This is a dynamically loaded API endpoint!'
      }
    });
  }
}
module.exports = UserProfileProcessor;
