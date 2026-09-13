# Backend Architecture

## 1. Overview

Google Photos inspired application backend.

## 2. Architecture

React
 ↓
API Gateway
 ↓
AWS Lambda
 ↓
Express
 ↓
DynamoDB / S3

## 3. Authentication

Signup
 ↓
bcrypt password hash
 ↓
DynamoDB

Login
 ↓
bcrypt compare
 ↓
JWT

Protected API
 ↓
JWT middleware
 ↓
req.user.userId

## 4. Photo Upload

Client
 ↓
POST /photos/upload-url
 ↓
Lambda
 ↓
Presigned S3 URL
 ↓
Client PUT
 ↓
S3

## 5. Photo Download

Client
 ↓
GET /photos/download-url
 ↓
JWT verification
 ↓
Ownership verification
 ↓
Presigned GET URL
 ↓
S3

## 6. Storage

DynamoDB
 └── Users

S3
 └── photos/{userId}/{file}

## 7. Security

JWT
bcrypt
S3 private
Presigned URLs
User ownership validation
IAM least privilege
Environment variables
CORS

## 8. Deployment

AWS SAM
 ↓
Lambda
 ↓
API Gateway
 ↓
DynamoDB
 ↓
S3