const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const Business = require('../models/Business');
const { JWT_SECRET, authenticate } = require('../middleware/auth');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 100 : 5, // Limit each IP to 5 login requests per `window` (here, per 15 minutes)
  message: {
    success: false,
    error: 'Too many login attempts from this IP, please try again after 15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }

    const user = User.findByUsername(username);
    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const business = Business.findById(user.business_id);
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, business_id: user.business_id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          role: user.role
        },
        business
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/profile', authenticate, (req, res, next) => {
  try {
    const user = User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
