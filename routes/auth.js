import express from 'express';
import passport from 'passport';
import crypto from 'crypto';
import { User } from '../models/User.js';

const router = express.Router();

router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  async (req, res) => {
    try {
      // Generate session token
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      // Save session
      req.user.sessions.push({
        token: sessionToken,
        expiresAt
      });
      await req.user.save();

      // Redirect to frontend with token
      res.redirect(`http://localhost:5500/index.html?token=${sessionToken}&expires=${expiresAt.toISOString()}`);
    } catch (error) {
      console.error('Auth error:', error);
      res.redirect('/login?error=auth_failed');
    }
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