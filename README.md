# Kids Math Game

An interactive math game designed to help children practice and improve their math skills in a fun, engaging way. The application features adaptive difficulty levels, profile customization, and progress tracking.

## 🌟 Features

- **Multiple difficulty levels**: Customized math problems for different grade levels
- **Profile creation and management**: Allow children to create their own profiles
- **Login system**: Secure user authentication with password reset capability
- **Interactive UI**: Kid-friendly design with engaging visuals
- **Progress tracking**: See improvement over time
- **Language selection**: Support for multiple languages

## 🚀 Technology Stack

- **Frontend**: Angular 12
- **Backend**: Node.js with Express.js
- **Database**: MongoDB (via Mongoose)
- **Authentication**: JWT tokens and bcrypt password hashing
- **Email Service**: Nodemailer with Gmail

## 📋 Prerequisites

- Node.js (v14+)
- Angular CLI (v12.2.18)
- MongoDB (local or Atlas cloud instance)
- Gmail account (for password reset functionality)

## 🔧 Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd math-game
```

### 2. Frontend setup

```bash
# Install dependencies
npm install

# Start the development server
npm start
```

The application will be available at `http://localhost:4200/`.

### 3. Backend setup

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env file with your credentials
# Update MongoDB URI, JWT secret, and Gmail credentials

# Start the server
npm run dev
```

The server will run on `http://localhost:3000/` by default.

## 📝 Environment Configuration

### Frontend

No specific environment configuration is needed for development.

### Backend

Edit the `.env` file with the following details:

- `PORT`: Server port (default: 3000)
- `MONGODB_URI`: Your MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token generation
- `GMAIL_USER`: Your Gmail address
- `GMAIL_APP_PASSWORD`: Your Gmail App Password

For details on setting up Gmail App Password, refer to the [server README](./server/README.md).

## 📚 Usage

1. Create a new account or log in with existing credentials
2. Set up a child profile with name and grade level
3. Select difficulty level for math problems
4. Solve problems and track progress
5. View results and overall performance

## 🧪 Running Tests

```bash
# Run frontend tests
npm test

# Run end-to-end tests (requires additional setup)
npm run e2e
```

## 🔨 Development Commands

- `ng serve`: Start development server
- `ng build`: Build the project
- `ng generate component component-name`: Generate new component
- `ng help`: Get more help on Angular CLI

## 📄 License

[License information]

## 👥 Contributors

[List contributors here]

## 🙏 Acknowledgments

- Angular team for the excellent framework
- Contributors and testers who helped improve the game
