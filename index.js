import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import session from 'express-session';
import passport from './config/passport.js';
import { router as authRouter } from './routes/auth.js';
import { router as taskRouter } from './routes/tasks.js';

dotenv.config();

const app = express();

// Update CORS to handle multiple origins
const allowedOrigins = [
  'http://localhost:5500',
  'https://todo-frontend-self-120125.vercel.app'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// Improved MongoDB connection with retry logic
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Detailed MongoDB connection error:', err);
    // Don't exit in production
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
};

connectDB();

// Handle MongoDB connection errors
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

// Add a root route
app.get('/', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const envVars = {
      hasMongoUri: !!process.env.MONGODB_URI,
      hasGoogleId: !!process.env.GOOGLE_CLIENT_ID,
      hasGoogleSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasSessionSecret: !!process.env.SESSION_SECRET,
      hasFrontendUrl: !!process.env.FRONTEND_URL,
      nodeEnv: process.env.NODE_ENV
    };
    
    res.json({ 
      message: 'Todo List API is running',
      database: dbStatus,
      environment: envVars
    });
  } catch (error) {
    console.error('Root route error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Routes
app.use('/auth', authRouter);
app.use('/tasks', taskRouter);

const PORT = process.env.PORT || 3000;

// Update for Vercel
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Add this for Vercel
export default app; 