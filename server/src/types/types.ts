import { Session } from 'express-session';

// Extend express-session with custom user property
declare module 'express-session' {
  interface Session {
    user?: {
      id: string;
      email: string | null;
    };
  }
}

export interface User {
  id: string;
  email: string | null;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user?: any;
    session?: any;
    message?: string;
  };
  error?: string | any[];
}