const fs = require('fs');
const path = require('path');
const express = require('express');
const request = require('supertest');

describe('Function-exported API handlers', () => {
  let app;
  let apiLoader;
  let tempDir;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    const APILoader = require('../src/core/api-loader');
    tempDir = path.join(__dirname, 'temp-fn-api');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    apiLoader = new APILoader(app, tempDir);
  });

  afterAll(() => {
    try {
      // Cleanup temp directory
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        for (const f of files) fs.unlinkSync(path.join(tempDir, f));
        fs.rmdirSync(tempDir);
      }
    } catch (_) {}
  });

  test('should load and invoke a plain function export', async () => {
    const getApiPath = path.join(tempDir, 'get.js');
    const code = `
module.exports = (req, res) => {
  res.json({ ok: true, method: req.method });
};
`;
    fs.writeFileSync(getApiPath, code);

    const routes = apiLoader.loadAPIs();
    expect(routes.length).toBeGreaterThan(0);
    expect(routes.find(r => r.path === '/' && r.method === 'GET')).toBeDefined();

    const res = await request(app).get('/').expect(200);
    expect(res.body).toEqual({ ok: true, method: 'GET' });
  });

  test('should load object export with process method', async () => {
    const postApiPath = path.join(tempDir, 'post.js');
    const code = `
module.exports = {
  process(req, res) {
    res.status(201).json({ created: true });
  }
};
`;
    fs.writeFileSync(postApiPath, code);

    const routes = apiLoader.reloadAPIs();
    expect(routes.find(r => r.path === '/' && r.method === 'POST')).toBeDefined();

    const res = await request(app).post('/').send({}).expect(201);
    expect(res.body).toEqual({ created: true });
  });
});


