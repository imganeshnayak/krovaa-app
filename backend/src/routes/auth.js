import express from 'express';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import User, { hashPassword, comparePassword } from '../models/User.js';
import { prisma } from '../config/db.js';

const router = express.Router();
const pendingRegistrations = new Map();
const pendingPasswordResets = new Map();
const OTP_TTL_MS = 10 * 60 * 1000;
const USER_CODE_LENGTH = 6;
const USER_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function createToken(user) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }

  return jwt.sign({ id: user.id, email: user.email }, secret, {
    expiresIn: '30d',
  });
}

function getUserResponse(user, token) {
  return {
    token,
    user: {
      id: String(user.id),
      email: user.email,
      username: user.username,
      userCode: user.userCode,
    },
  };
}

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}

function generateUserCode() {
  let code = '';

  for (let index = 0; index < USER_CODE_LENGTH; index += 1) {
    const randomIndex = Math.floor(Math.random() * USER_CODE_ALPHABET.length);
    code += USER_CODE_ALPHABET[randomIndex];
  }

  return code;
}

async function createUserWithUniqueCode(userData) {
  const hashedPassword = await hashPassword(userData.password);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const userCode = generateUserCode();

    try {
      return await User.create({
        data: {
          ...userData,
          password: hashedPassword,
          userCode,
        },
      });
    } catch (error) {
      if (error.code !== 'P2002' || !error.meta?.target?.includes('userCode')) {
        throw error;
      }
    }
  }

  throw new Error('Unable to generate a unique user code.');
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
  const allowSelfSigned = String(process.env.SMTP_ALLOW_SELF_SIGNED || '').toLowerCase() === 'true';

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    tls: {
      // Useful in local/dev networks where SSL inspection injects a custom certificate.
      rejectUnauthorized: !allowSelfSigned,
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

function getPendingPasswordReset(email) {
  const key = email.toLowerCase();
  const pending = pendingPasswordResets.get(key);

  if (!pending) {
    return null;
  }

  if (pending.expiresAt < Date.now()) {
    pendingPasswordResets.delete(key);
    return null;
  }

  return pending;
}

router.post('/register', async (req, res) => {
  try {
    const { email, username, password, retypePassword } = req.body;

    if (!email || !username || !password || !retypePassword) {
      return res.status(400).json({ error: 'Email, username, password, and retype password are required.' });
    }

    if (password !== retypePassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsername = normalizeUsername(username);

    if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
      return res.status(400).json({ error: 'Username must be 3 to 20 characters and use only letters, numbers, or underscores.' });
    }

    const existingUser = await User.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const existingUsername = await User.findUnique({ where: { username: normalizedUsername } });
    if (existingUsername) {
      return res.status(409).json({ error: 'This username is already taken.' });
    }

    const user = await createUserWithUniqueCode({
      email: normalizedEmail,
      username: normalizedUsername,
      password,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(normalizedUsername)}&background=random&color=fff&size=150`,
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
    const { email, username, password, retypePassword } = req.body;

    if (!email || !username || !password || !retypePassword) {
      return res.status(400).json({ error: 'Email, username, password, and retype password are required.' });
    }

    if (password !== retypePassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsername = normalizeUsername(username);

    if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
      return res.status(400).json({ error: 'Username must be 3 to 20 characters and use only letters, numbers, or underscores.' });
    }

    const existingUser = await User.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const existingUsername = await User.findUnique({ where: { username: normalizedUsername } });
    if (existingUsername) {
      return res.status(409).json({ error: 'This username is already taken.' });
    }

    const otp = generateOtp();
    const expiresAt = Date.now() + OTP_TTL_MS;
    pendingRegistrations.set(normalizedEmail, {
      email: normalizedEmail,
      username: normalizedUsername,
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

    const existingUser = await User.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      pendingRegistrations.delete(normalizedEmail);
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const existingUsername = await User.findUnique({ where: { username: pending.username } });
    if (existingUsername) {
      pendingRegistrations.delete(normalizedEmail);
      return res.status(409).json({ error: 'This username is already taken.' });
    }

    const user = await createUserWithUniqueCode({
      email: normalizedEmail,
      username: pending.username,
      password: pending.password,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(pending.username)}&background=random&color=fff&size=150`,
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

    const user = await User.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isPasswordValid = await comparePassword(password, user.password);
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

router.post('/forgot-password/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      return res.status(404).json({ error: 'No account found with this email.' });
    }

    const otp = generateOtp();
    const expiresAt = Date.now() + OTP_TTL_MS;
    pendingPasswordResets.set(normalizedEmail, {
      email: normalizedEmail,
      userId: user.id,
      otp,
      expiresAt,
    });

    const transporter = createTransporter();
    const { fromEmail, fromName } = getSmtpSettings();

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: normalizedEmail,
      subject: 'Password Reset Code',
      text: `Your password reset code is ${otp}. It expires in 10 minutes.`,
      html: `<p>Your password reset code is <strong>${otp}</strong>.</p><p>This code expires in 10 minutes.</p>`,
    });

    return res.json({
      message: 'OTP sent successfully.',
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to send OTP.' });
  }
});

router.post('/forgot-password/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const pending = getPendingPasswordReset(normalizedEmail);

    if (!pending) {
      return res.status(400).json({ error: 'OTP has expired or was not requested.' });
    }

    if (pending.otp !== otp.trim()) {
      return res.status(400).json({ error: 'Invalid OTP.' });
    }

    return res.json({
      message: 'OTP verified successfully.',
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to verify OTP.' });
  }
});

router.post('/forgot-password/reset', async (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    if (!email || !otp || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const pending = getPendingPasswordReset(normalizedEmail);

    if (!pending) {
      return res.status(400).json({ error: 'OTP has expired or was not requested.' });
    }

    if (pending.otp !== otp.trim()) {
      return res.status(400).json({ error: 'Invalid OTP.' });
    }

    const hashedPassword = await hashPassword(newPassword);
    await User.update({
      where: { id: pending.userId },
      data: { password: hashedPassword },
    });

    pendingPasswordResets.delete(normalizedEmail);

    return res.json({
      message: 'Password reset successfully.',
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to reset password.' });
  }
});

export default router;
