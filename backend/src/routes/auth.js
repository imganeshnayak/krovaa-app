import express from 'express';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import User from '../models/User.js';

const router = express.Router();
const pendingRegistrations = new Map();
const OTP_TTL_MS = 10 * 60 * 1000;

function createToken(user) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }

  return jwt.sign({ id: user._id.toString(), email: user.email }, secret, {
    expiresIn: '30d',
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

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getSmtpSettings() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM_EMAIL || user;
  const fromName = process.env.SMTP_FROM_NAME || 'Krovaa';

  if (!host || !user || !pass || !fromEmail) {
    throw new Error('SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM_EMAIL are required');
  }

  return { host, port, user, pass, fromEmail, fromName };
}

function createTransporter() {
  const { host, port, user, pass } = getSmtpSettings();

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

function buildOtpEmail(otp, minutes) {
  return `Your Krovaa verification code is ${otp}. It expires in ${minutes} minutes.`;
}

function getPendingRegistration(email) {
  const key = email.toLowerCase();
  const pending = pendingRegistrations.get(key);

  if (!pending) {
    return null;
  }

  if (pending.expiresAt < Date.now()) {
    pendingRegistrations.delete(key);
    return null;
  }

  return pending;
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

router.post('/register/send-otp', async (req, res) => {
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

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const otp = generateOtp();
    const expiresAt = Date.now() + OTP_TTL_MS;
    pendingRegistrations.set(normalizedEmail, {
      email: normalizedEmail,
      password,
      otp,
      expiresAt,
    });

    const transporter = createTransporter();
    const { fromEmail, fromName } = getSmtpSettings();

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: normalizedEmail,
      subject: 'Your Krovaa verification code',
      text: buildOtpEmail(otp, OTP_TTL_MS / 60000),
      html: `<p>Your Krovaa verification code is <strong>${otp}</strong>.</p><p>This code expires in ${OTP_TTL_MS / 60000} minutes.</p>`,
    });

    return res.json({
      message: 'OTP sent successfully.',
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to send OTP.' });
  }
});

router.post('/register/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const pending = getPendingRegistration(normalizedEmail);

    if (!pending) {
      return res.status(400).json({ error: 'OTP has expired or was not requested.' });
    }

    if (pending.otp !== otp.trim()) {
      return res.status(400).json({ error: 'Invalid OTP.' });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      pendingRegistrations.delete(normalizedEmail);
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const user = await User.create({
      email: normalizedEmail,
      password: pending.password,
    });

    pendingRegistrations.delete(normalizedEmail);

    const token = createToken(user);
    return res.status(201).json({
      message: 'Registration successful.',
      ...getUserResponse(user, token),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to verify OTP.' });
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
