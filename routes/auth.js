import express from 'express';
import passport from 'passport';
import crypto from 'crypto';
import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Create JWT token
    const token = jwt.sign({ userId: req.user._id }, process.env.SESSION_SECRET);
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365); // 1 year

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/index.html?token=${token}&expires=${expires.toISOString()}`);
  }
);

// Add a test endpoint
router.get('/verify', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const user = await User.findOne({
      'sessions.token': token,
      'sessions.expiresAt': { $gt: new Date() }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    res.json({ valid: true, user: { email: user.email, name: user.name } });
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed' });
  }
});

export { router }; 