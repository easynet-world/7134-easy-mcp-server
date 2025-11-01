
module.exports = (req, res) => {
  res.json({ ok: true, method: req.method });
};
