require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const port = process.env.PORT || 3000;
const secretKey = 'your-secret-key';

// In-memory storage (replace with database in production)
const users = [];
const scores = new Map(); // userId -> ScoreHistory[]

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
};

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if user exists
    if (users.find(u => u.username === username)) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = {
      id: users.length + 1,
      username,
      password: hashedPassword
    };
    users.push(user);
    scores.set(user.id, []); // Initialize empty score history for user

    // Create token
    const token = jwt.sign(
      { userId: user.id },
      secretKey,
      { expiresIn: '24h' }
    );

    res.status(201).json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = users.find(u => u.username === username);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create token
    const token = jwt.sign(
      { userId: user.id },
      secretKey,
      { expiresIn: '24h' }
    );

    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

// Save score
app.post('/api/scores', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const scoreHistory = scores.get(userId) || [];
  const newScore = {
    ...req.body,
    userId,
    timestamp: new Date()
  };
  
  scoreHistory.push(newScore);
  scores.set(userId, scoreHistory);
  
  res.status(201).json({ message: 'Score saved successfully' });
});

// Get user's score history
app.get('/api/scores', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const userScores = scores.get(userId) || [];
  res.json(userScores);
});

// Get user's score statistics
app.get('/api/scores/stats', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const userScores = scores.get(userId) || [];
  
  const stats = {
    totalGames: userScores.length,
    averageScore: userScores.reduce((acc, score) => acc + score.percentage, 0) / (userScores.length || 1),
    bestScore: Math.max(...userScores.map(score => score.percentage), 0),
    recentScores: userScores.slice(-5) // Last 5 scores
  };
  
  res.json(stats);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 