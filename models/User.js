import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true
  },
  name: String,
  picture: String,
  sessions: [{
    token: String,
    expiresAt: Date
  }]
});

export const User = mongoose.model('User', userSchema); 