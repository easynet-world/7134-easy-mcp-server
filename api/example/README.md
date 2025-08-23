# HTTP Method Examples

Simple examples for all HTTP methods. Just copy and modify!

## GET - Read data
```bash
curl http://localhost:3000/example
```

## POST - Create data
```bash
curl -X POST http://localhost:3000/example \
  -H "Content-Type: application/json" \
  -d '{"name": "test"}'
```

## PUT - Update entire resource
```bash
curl -X PUT http://localhost:3000/example \
  -H "Content-Type: application/json" \
  -d '{"name": "updated"}'
```

## PATCH - Partial update
```bash
curl -X PATCH http://localhost:3000/example \
  -H "Content-Type: application/json" \
  -d '{"name": "partial"}'
```

## DELETE - Remove resource
```bash
curl -X DELETE http://localhost:3000/example
```

## File Structure
```
api/example/
├── get.js      → GET /example
├── post.js     → POST /example
├── put.js      → PUT /example
├── patch.js    → PATCH /example
└── delete.js   → DELETE /example
```
