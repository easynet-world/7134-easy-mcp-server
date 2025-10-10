# API Documentation

## Overview
User management API with AI integration via MCP protocol.

## Endpoints

### GET /users
Retrieve user data with filtering and pagination.

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "admin",
      "status": "active"
    }
  ]
}
```

### POST /users
Create new user accounts.

**Request**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "role": "user"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": 123,
    "name": "John Doe",
    "email": "john@example.com",
    "status": "active"
  }
}
```

## AI Tools
- `api__users_get`: Get user data with AI insights
- `api__users_post`: Create users with AI validation

## Features
- File-based routing
- Hot reload development
- Built-in CORS and validation
- AI-powered analysis
