# API Documentation

## Authentication

### POST /auth/signup

Request:

{
  "name": "Sparsh",
  "email": "sparsh@example.com",
  "password": "password123"
}

Response:

{
  "success": true,
  "message": "User created successfully"
}

---

### POST /auth/login

Request:

{
  "email": "sparsh@example.com",
  "password": "password123"
}

Response:

{
  "success": true,
  "token": "JWT_TOKEN",
  "user": {
    "userId": "USER_ID",
    "name": "Sparsh",
    "email": "sparsh@example.com"
  }
}

---

## Photos

### POST /photos/upload-url

Authentication:

Authorization: Bearer <token>

Request:

{
  "fileName": "photo.jpg",
  "contentType": "image/jpeg"
}

Response:

{
  "success": true,
  "uploadUrl": "PRESIGNED_URL",
  "key": "photos/user-id/uuid-photo.jpg"
}

---

### GET /photos/download-url

Authentication:

Authorization: Bearer <token>

Query:

?key=photos/user-id/uuid-photo.jpg

Response:

{
  "success": true,
  "downloadUrl": "PRESIGNED_URL"
}