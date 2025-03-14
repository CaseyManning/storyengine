import express from 'express';
import supabase from '../utils/supabase';
import { z } from 'zod';
import '../types/types';

const router = express.Router();

// Input validation schemas
const signupSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

// Signup endpoint
router.post('/signup', async (req, res) => {
  try {
    // Validate request body
    const validation = signupSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.errors
      });
    }

    const { email, password } = validation.data;

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      console.error('Signup error:', error);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    // Return success response
    return res.status(201).json({
      success: true,
      data: {
        user: data.user,
        message: 'Check your email for confirmation link'
      }
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    // Validate request body
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.errors
      });
    }

    const { email, password } = validation.data;

    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Login error:', error);
      return res.status(401).json({
        success: false,
        error: 'Invalid login credentials'
      });
    }

    // Set session data
    if (req.session) {
      req.session.user = {
        id: data.user.id,
        email: data.user.email || null
      };
    }

    // Return user data and session
    return res.status(200).json({
      success: true,
      data: {
        user: data.user,
        session: data.session
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
  }
});

// Logout endpoint
router.post('/logout', async (req, res) => {
  try {
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    // Clear session
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session:', err);
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    // Get session from Supabase
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    // Return user data
    return res.status(200).json({
      success: true,
      data: {
        user: session.user
      }
    });
  } catch (err) {
    console.error('Get current user error:', err);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
  }
});

export default router;