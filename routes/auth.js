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
  (req, res, next) => {
    console.log('Starting OAuth callback');
    passport.authenticate('google', { 
      failureRedirect: '/login',
      session: false
    })(req, res, next);
  },
  async (req, res) => {
    try {
      console.log('User data:', {
        id: req.user?._id,
        email: req.user?.email,
        name: req.user?.name
      });

      // Debug logs
      console.log('Environment check:', {
        FRONTEND_URL: process.env.FRONTEND_URL,
        NODE_ENV: process.env.NODE_ENV
      });

      if (!process.env.FRONTEND_URL) {
        throw new Error('FRONTEND_URL environment variable is not set');
      }

      if (!req.user) {
        console.error('No user found in request');
        return res.status(401).json({ error: 'Authentication failed - No user found' });
      }

      // Create JWT token
      const token = jwt.sign(
        { userId: req.user._id }, 
        process.env.SESSION_SECRET,
        { expiresIn: '1y' }
      );
      
      console.log('Token created:', {
        tokenStart: token.substring(0, 20),
        secret: process.env.SESSION_SECRET?.substring(0, 5)
      });

      const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365);

      // Construct URL with error handling
      let redirectUrl;
      try {
        redirectUrl = new URL('/index.html', process.env.FRONTEND_URL);
      } catch (urlError) {
        console.error('URL construction error:', {
          FRONTEND_URL: process.env.FRONTEND_URL,
          error: urlError.message
        });
        throw new Error(`Invalid FRONTEND_URL: ${process.env.FRONTEND_URL}`);
      }

      redirectUrl.searchParams.set('token', token);
      redirectUrl.searchParams.set('expires', expires.toISOString());
      
      console.log('Final redirect URL:', {
        url: redirectUrl.toString(),
        params: {
          token: token.substring(0, 20) + '...',
          expires: expires
        }
      });
      
      res.redirect(redirectUrl.toString());
    } catch (error) {
      console.error('Detailed auth callback error:', {
        message: error.message,
        stack: error.stack,
        frontendUrl: process.env.FRONTEND_URL,
        hasUser: !!req.user,
        hasSecret: !!process.env.SESSION_SECRET
      });

      res.status(500).json({ 
        error: 'Authentication failed',
        details: error.message
      });
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