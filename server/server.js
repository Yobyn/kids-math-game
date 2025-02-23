require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;
const secretKey = process.env.JWT_SECRET;

// In-memory storage (replace with database in production)
const users = [];
const passwordResetTokens = new Map(); // Store reset tokens

// Configure nodemailer with Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

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
    const { username, password, email } = req.body;

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
      password: hashedPassword,
      email
    };
    users.push(user);

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

// Reset password request endpoint
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email } = req.body;

    // Find user by email
    const user = users.find(u => u.email === email);
    if (!user) {
      // For security, don't reveal if email exists or not
      return res.json({ message: 'If the email exists, password reset instructions will be sent' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = Date.now() + 3600000; // 1 hour

    // Store reset token
    passwordResetTokens.set(resetToken, {
      userId: user.id,
      expires: resetExpires
    });

    // Create reset URL
    const resetUrl = `http://localhost:4200/reset-password?token=${resetToken}`;

    // Send email
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <p>You requested a password reset for your Math Game account.</p>
        <p>Click this link to reset your password:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'Password reset instructions sent' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Error sending reset email', error: error.message });
  }
});

// Reset password with token endpoint
app.post('/api/auth/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    // Verify token
    const resetData = passwordResetTokens.get(token);
    if (!resetData || resetData.expires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Find user
    const user = users.find(u => u.id === resetData.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;

    // Remove used token
    passwordResetTokens.delete(token);

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});