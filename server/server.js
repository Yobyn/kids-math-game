require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { AccountStore } = require('./store');
const { signToken, verifyToken } = require('./token');

const app = express();
const port = process.env.PORT || 3000;
const secretKey = process.env.JWT_SECRET;

// Accounts survive a restart now; see store.js for why it is a file rather
// than a database server.
const accounts = new AccountStore(process.env.ACCOUNTS_FILE);
// Reset tokens stay in memory on purpose: they live for an hour, and a
// restart making every outstanding link invalid is the safe way to fail.
const passwordResetTokens = new Map();

/** The least a username and password have to be to be worth storing. */
const MIN_USERNAME = 3;
const MIN_PASSWORD = 6;

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

  verifyToken(token, secretKey).then(
    (user) => {
      req.user = user;
      next();
    },
    () => res.sendStatus(403)
  );
};

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // Checked here rather than left to bcrypt, which throws on undefined and
    // turns a missing field into a 500 with a stack trace in it
    if (typeof username !== 'string' || username.trim().length < MIN_USERNAME) {
      return res.status(400).json({ message: 'Username is too short' });
    }
    if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
      return res.status(400).json({ message: 'Password is too short' });
    }

    if (accounts.findByUsername(username.trim())) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Written to disk before the token is handed out, so an account that
    // says it exists does
    const user = accounts.add({
      username: username.trim(),
      password: hashedPassword,
      email
    });

    // Create token
    const token = await signToken({ userId: user.id }, secretKey);

    res.status(201).json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = accounts.findByUsername(username.trim());
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create token
    const token = await signToken({ userId: user.id }, secretKey);

    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

// Reset password request endpoint
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email } = req.body;

    const user = accounts.findByEmail(email);
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

    if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD) {
      return res.status(400).json({ message: 'Password is too short' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    if (!accounts.updatePassword(resetData.userId, hashedPassword)) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove used token
    passwordResetTokens.delete(token);

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port} with ${accounts.count} account(s)`);
});