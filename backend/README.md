# Photo App Backend

Node.js/Express backend for the Photo App with AWS integration.

## Features
- User authentication with JWT
- Photo upload and management
- AWS S3 for file storage
- AWS DynamoDB for database
- AWS Lambda deployment support
- CORS enabled
- Error handling middleware

## Setup

### Prerequisites
- Node.js 18+
- AWS Account (for production)
- npm or yarn

### Installation

```bash
npm install
```

### Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:
- JWT_SECRET: Secret key for token generation
- AWS credentials and region
- Database and S3 bucket names

### Running Locally

```bash
npm start
```

The server will start on `http://localhost:3000`

### API Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/logout` - User logout

#### Photos
- `GET /api/photos` - Get all photos (requires auth)
- `POST /api/photos` - Upload photo (requires auth)
- `DELETE /api/photos/:id` - Delete photo (requires auth)

## Project Structure

```
src/
├── controllers/     # Route controllers
├── middleware/      # Express middleware
├── routes/          # Route definitions
├── services/        # Business logic
├── utils/           # Utility functions
├── app.js           # Express app
└── lambda.js        # Lambda handler
```

## Development

### Running Tests

```bash
npm test
```

### Deployment

#### AWS SAM

```bash
sam build
sam deploy
```

## Documentation

See `/docs` folder for detailed documentation:
- `architecture.md` - System design
- `api.md` - API documentation
- `project.md` - Project setup
- `memory.md` - Important notes
