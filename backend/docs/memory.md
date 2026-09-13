# Project Memory

## Current Status

Backend architecture finalized.

## Important Decisions

### 1. Why S3?

Photos are object-storage data.

S3 is designed for storing files and images.

We should not store image binary data inside DynamoDB.

### 2. Why DynamoDB?

The project only needs user information and simple lookups.

Users are accessed using:

- userId
- email

Therefore DynamoDB is sufficient.

### 3. Why JWT?

The backend needs stateless authentication.

After login, the backend generates a JWT.

Protected requests send:

Authorization: Bearer <token>

### 4. Why bcrypt?

Passwords must never be stored as plaintext.

bcrypt hashes passwords before storing them.

### 5. Why Presigned URLs?

The Lambda should not receive the actual photo.

Lambda only generates a temporary S3 URL.

The frontend uploads directly to S3.

### 6. Why userId in S3 key?

Photos are isolated by user.

Example:

photos/user-123/photo-abc.jpg

This makes ownership validation easier.

### 7. Why Express inside Lambda?

Express provides familiar routing and middleware.

AWS Lambda handles the server execution.

serverless-http connects Express with Lambda.

### 8. Why SAM?

AWS SAM allows the infrastructure to be defined in template.yaml.

This makes deployment repeatable.