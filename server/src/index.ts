import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import session from 'express-session';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import storyRoutes from './routes/storyRoutes';
import authRoutes from './routes/authRoutes'

// Import Supabase client
import supabase from './utils/supabase';

// Initialize express app
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session management
app.use(session({
  secret: process.env.SESSION_SECRET || 'default_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// Import Supabase setup utility
import setupSupabaseTables from './utils/setupSupabase';

// Test Supabase connection and set up tables
const initializeSupabase = async () => {
  try {
    // Try to set up tables and test connection
    await setupSupabaseTables();
  } catch (error) {
    console.error('Supabase initialization failed:', error);
    console.log('Continuing startup - you may need to set up the database manually');
  }
};

// Routes
app.use('/api/stories', storyRoutes);
app.use('/api/auth', authRoutes);

// WebSocket setup
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
  
  // Story-related events will be handled here
});

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, async () => {
  await initializeSupabase();
  console.log(`Server running on port ${PORT}`);
});

export { io, supabase };