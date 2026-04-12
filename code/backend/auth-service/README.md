# Auth Service

## Overview

The Auth Service is responsible for user authentication, authorization, and user management in the FinFlow platform. It provides JWT-based authentication and handles user registration, login, and profile management.

## Features

- User registration and login
- JWT token generation and validation
- Password hashing and verification
- User profile management
- Role-based access control
- Session management

## API Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Authenticate a user and return JWT
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/logout` - Invalidate current session
- `POST /api/auth/refresh-token` - Refresh JWT token
- `DELETE /api/auth/account` - Delete user account (GDPR compliance)

## Environment Variables

- `AUTH_PORT` - Port for the Auth service (default: 3001)
- `JWT_SECRET` - Secret key for JWT signing
- `JWT_EXPIRY` - JWT token expiration time (default: 24h)
- `POSTGRES_HOST` - PostgreSQL host
- `POSTGRES_PORT` - PostgreSQL port
- `POSTGRES_USER` - PostgreSQL username
- `POSTGRES_PASSWORD` - PostgreSQL password
- `POSTGRES_DB` - PostgreSQL database name

## Getting Started

1. Install dependencies:

   ```
   npm install
   ```

2. Set up environment variables (see `.env.example`)

3. Start the service:
   ```
   npm run dev
   ```

## Testing

Run tests with:

```
npm test
```

## Docker

Build the Docker image:

```
docker build -t finflow-auth-service .
```

Run the container:

```
docker run -p 3001:3001 --env-file .env finflow-auth-service
```
