import { Request, Response, NextFunction } from 'express';
import supabase from '../utils/supabase';

/**
 * Middleware to check if the user is authenticated
 */
export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get session from Supabase
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Add user to request for use in route handlers
    req.user = session.user;
    
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
};

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}