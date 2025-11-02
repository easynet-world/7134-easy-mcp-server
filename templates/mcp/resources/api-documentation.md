# API Documentation

## Overview
This is your API documentation that AI agents can access through MCP.

## Available Endpoints

### GET /example
Retrieves example data.

**Response:**
```json
{
  "data": {
    "message": "string",
    "timestamp": "number"
  }
}
```

### POST /example
Creates new example data.

**Request Body:**
```json
{
  "message": "string"
}
```

**Response:**
```json
{
  "data": {
    "message": "string",
    "timestamp": "number",
    "id": "string"
  }
}
```

