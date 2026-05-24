import jwt from 'jsonwebtoken';
import User from '../models/User';
import { AuthRequest } from './auth';

/** Sets req.user when a valid token is present; never rejects. */
export const optionalAuth = async (req: AuthRequest, _res: unknown, next: () => void) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer')) {
    return next();
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as { id: string };
    req.user = await User.findById(decoded.id).select('-password');
  } catch {
    // ignore invalid tokens for public reads
  }
  next();
};
