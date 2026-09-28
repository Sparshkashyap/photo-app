# 📸 Photo App

> A modern, cloud-native photo management application built with React, Node.js, Express.js, and AWS serverless services.

<p align="center">
  <a href="https://main.ddvgp5hdlanze.amplifyapp.com/">
    <strong>🌐 Live Application</strong>
  </a>
</p>

<p align="center">
  <a href="https://main.ddvgp5hdlanze.amplifyapp.com/">
    Live Demo
  </a>
  •
  <a href="https://y181ertste.execute-api.ap-south-1.amazonaws.com">
    Backend API
  </a>
</p>

---

## ✨ Overview

Photo App is a full-stack cloud-based photo management platform inspired by modern photo storage applications.

The application provides a complete workflow for authenticating users, uploading and managing photos, organizing content into folders, managing favorites and trash, and generating secure photo access URLs.

The backend is designed around AWS serverless infrastructure, using **API Gateway, AWS Lambda, Amazon S3, and DynamoDB**.

---

## 🌐 Live Application

### Frontend

🔗 **https://main.ddvgp5hdlanze.amplifyapp.com/**

### Backend API

🔗 **https://y181ertste.execute-api.ap-south-1.amazonaws.com**

---

# 🚀 Features

## 🔐 Authentication

- User registration
- User login
- JWT-based authentication
- Protected API routes
- Password hashing using bcrypt
- Authentication middleware
- User session handling
- Google authentication service integration

---

## 📷 Photo Management

- Generate secure photo upload URLs
- Upload photos directly to Amazon S3
- Generate secure photo download URLs
- Photo ownership validation
- Photo metadata management
- Photo deletion
- Photo restoration through trash management

---

## 📁 Folder Management

- Create folders
- Rename folders
- Move photos between folders
- Organize photos using folders
- Folder tree navigation
- Folder-based photo organization

---

## ⭐ Favorites

- Mark photos as favorites
- Remove photos from favorites
- View favorite photos

---

## 🗑️ Trash

- Move photos to trash
- View deleted photos
- Restore photos
- Permanently delete photos
- Trash cleanup job support

---

## 🔗 Photo Sharing

- Generate shareable photo links
- Share photos using tokens
- Validate shared photo access
- Dedicated shared-photo routes

---

## 🔎 Search

The backend includes a dedicated search service for photo-related search functionality.

---

# 🏗️ Architecture

The application follows a serverless architecture:

```text
                    ┌──────────────────────┐
                    │      React App       │
                    │   TanStack Start     │
                    └──────────┬───────────┘
                               │
                               │ HTTPS
                               ▼
                    ┌──────────────────────┐
                    │    API Gateway       │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │     AWS Lambda       │
                    │   Node.js + Express  │
                    └───────┬───────┬──────┘
                            │       │
                ┌───────────┘       └────────────┐
                ▼                                ▼
       ┌─────────────────┐              ┌─────────────────┐
       │   DynamoDB      │              │    Amazon S3    │
       │                 │              │                 │
       │ User / Metadata │              │ Photo Storage   │
       └─────────────────┘              └─────────────────┘
