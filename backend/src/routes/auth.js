import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

function createToken(user) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }

  return jwt.sign({ id: user._id.toString(), email: user.email }, secret, {
    expiresIn: '7d',
  });
}

function getUserResponse(user, token) {
  return {
    token,
    user: {
      id: user._id.toString(),
      email: user.email,
    },
  };
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, retypePassword } = req.body;

    if (!email || !password || !retypePassword) {
      return res.status(400).json({ error: 'Email, password, and retype password are required.' });
    }

    if (password !== retypePassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const user = await User.create({
      email,
      password,
    });

    const token = createToken(user);
    return res.status(201).json({
      message: 'Registration successful.',
      ...getUserResponse(user, token),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Something went wrong.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = createToken(user);
    return res.json({
      message: 'Login successful.',
      ...getUserResponse(user, token),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Something went wrong.' });
  }
});

export default router;
