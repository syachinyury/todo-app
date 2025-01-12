import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/User.js';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

// Log to verify the values are loaded (remove in production)
console.log('Client ID:', process.env.GOOGLE_CLIENT_ID);
console.log('Client Secret:', process.env.GOOGLE_CLIENT_SECRET);

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.NODE_ENV === 'production' 
      ? "https://your-render-url/auth/google/callback"
      : "http://localhost:3000/auth/google/callback"
  },
  async function(accessToken, refreshToken, profile, done) {
    try {
      let user = await User.findOne({ googleId: profile.id });
      
      if (!user) {
        user = await User.create({
          googleId: profile.id,
          email: profile.emails[0].value,
          name: profile.displayName,
          picture: profile.photos[0]?.value
        });
      }

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport; 