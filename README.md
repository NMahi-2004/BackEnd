# Learning Management System - Backend API

## Overview
This is the backend API for the Learning Management System built with Node.js, Express, MongoDB, and JWT authentication.

## Features
- JWT-based authentication
- Role-based authorization (Admin, Faculty, Student)
- User management
- Password hashing with bcrypt
- Input validation
- Error handling
- CORS support

## Prerequisites
- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Setup:**
   Copy `.env.example` to `.env` and update the values:
   ```bash
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/lms_database
   JWT_SECRET=your_super_secret_jwt_key
   JWT_EXPIRE=7d
   ```

3. **Database Setup:**
   
   **Option A: Local MongoDB**
   - Install MongoDB locally
   - Start MongoDB service
   - Use: `mongodb://localhost:27017/lms_database`

   **Option B: MongoDB Atlas (Cloud)**
   - Create account at https://www.mongodb.com/atlas
   - Create cluster and get connection string
   - Use: `mongodb+srv://username:password@cluster.mongodb.net/lms_database`

4. **Seed Admin User:**
   ```bash
   npm run seed:admin
   ```
   This creates an admin user:
   - Username: `admin`
   - Password: `admin123`
   - Email: `admin@lms.com`

## Running the Application

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will run on `http://localhost:5000`

## API Endpoints

### Authentication Routes (`/api/auth`)

#### POST `/api/auth/login`
Login user with username, password, and role.

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123",
  "role": "admin"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "user_id",
      "username": "admin",
      "email": "admin@lms.com",
      "role": "admin",
      "firstName": "System",
      "lastName": "Administrator",
      "fullName": "System Administrator",
      "isFirstLogin": false
    }
  }
}
```

#### PUT `/api/auth/change-password`
Change user password (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "currentPassword": "old_password",
  "newPassword": "new_password"
}
```

#### GET `/api/auth/profile`
Get current user profile (requires authentication).

#### POST `/api/auth/logout`
Logout user (client-side token removal).

### User Management Routes (`/api/users`) - Admin Only

#### POST `/api/users`
Create new user (Admin only).

**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "role": "student",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### GET `/api/users`
Get all users with filtering and pagination.

**Query Parameters:**
- `role`: Filter by role (admin, faculty, student)
- `isActive`: Filter by active status (true/false)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

#### GET `/api/users/:id`
Get user by ID.

#### PUT `/api/users/:id`
Update user information.

#### PUT `/api/users/:id/reset-password`
Reset user password (generates temporary password).

#### DELETE `/api/users/:id`
Delete user.

### Health Check

#### GET `/api/health`
Check if the API is running.

## User Roles

### Admin
- Full system access
- Create/manage users
- System settings
- View all data

### Faculty
- Create and manage quizzes
- View student progress
- Manage assigned courses

### Student
- Take quizzes
- View personal progress
- Access assigned courses

## Authentication Flow

1. **Login:** User provides username, password, and role
2. **Token Generation:** Server validates credentials and returns JWT token
3. **Protected Routes:** Client includes token in Authorization header
4. **Token Verification:** Server validates token on each protected request
5. **Role Authorization:** Server checks user role for specific endpoints

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [] // Validation errors if applicable
}
```

## Security Features

- Password hashing with bcrypt (cost factor: 12)
- JWT token expiration
- Input validation and sanitization
- Role-based access control
- CORS configuration
- Environment variable protection

## Development

**File Structure:**
```
backend/
├── config/
│   └── database.js
├── controllers/
│   ├── authController.js
│   └── userController.js
├── middleware/
│   ├── auth.js
│   └── validation.js
├── models/
│   └── User.js
├── routes/
│   ├── auth.js
│   └── users.js
├── scripts/
│   └── seedAdmin.js
├── utils/
│   └── jwt.js
├── .env
├── .gitignore
├── package.json
└── server.js
```

## Testing

Use tools like Postman or curl to test the API endpoints.

**Example Login Request:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123",
    "role": "admin"
  }'
```

## Next Steps

1. Set up MongoDB (local or Atlas)
2. Run the seeder to create admin user
3. Test authentication endpoints
4. Integrate with frontend application
5. Implement quiz module
6. Add more features as needed