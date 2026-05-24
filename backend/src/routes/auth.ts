import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { protect } from '../middleware/auth';

const router = express.Router();

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d',
  });
};

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Validate email strictly matches format: name_ug_24@branch.nits.ac.in
  const emailRegex = /^[a-zA-Z0-9._-]+_(ug|pg)_\d{2}@[a-zA-Z0-9-]+\.nits\.ac\.in$/i;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please use your valid institute email format (e.g., john_ug_23@cse.nits.ac.in).' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
  }

  try {
    let user = await User.findOne({ email });

    if (!user) {
      // Magic sign-up: create user if they don't exist
      const name = email.split('@')[0];
      user = await User.create({ name, email, password });
    } else {
      // User exists, verify password
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }
    }

    res.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      trustScore: user.trustScore,
      token: generateToken(user._id.toString()),
    });
  } catch (error) {
    console.error('Auth Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/me', protect, async (req: any, res) => {
  res.json(req.user);
});

export default router;
