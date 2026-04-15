import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/database';

// Extend Express Request to hold the user payload
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // BYPASS: Automatically assign a valid user to the request context
    let dummyUser = await prisma.user.findFirst();
    
    if (!dummyUser) {
      dummyUser = await prisma.user.create({
        data: {
          email: 'guest@local.dev',
          name: 'Guest Developer',
          password: 'bypassed_password_123',
        }
      });
    }

    req.user = {
      id: dummyUser.id,
      email: dummyUser.email
    };
    
    next();
  } catch (error) {
    console.error('Bypass error', error);
    next(error);
  }
};
