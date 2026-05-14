import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import User from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();
const PROFESSION_OPTIONS = [
  'tech',
  'creative',
  'engineering',
  'professional',
  'freelancer',
  'student',
  'none',
  'other',
];

function mapUserResponse(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    fullName: user.fullName,
    location: user.location,
    city: user.city,
    pincode: user.pincode,
    phoneNumber: user.phoneNumber,
    age: user.age,
    gender: user.gender,
    profession: user.profession,
    bio: user.bio,
    avatar: user.avatar,
    skills: user.skills,
    stats: user.stats,
  };
}

const uploadDirectory = path.join(process.cwd(), 'uploads', 'profile');
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `${req.userId}-${Date.now()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image uploads are allowed.'));
      return;
    }
    cb(null, true);
  },
});

// GET user profile by ID
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({
      user: mapUserResponse(user),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to fetch profile.' });
  }
});

// GET current user profile (requires token)
router.get('/', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({
      user: mapUserResponse(user),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to fetch profile.' });
  }
});

// UPDATE user profile (requires token)
router.put('/', verifyToken, async (req, res) => {
  try {
    const {
      fullName,
      location,
      city,
      pincode,
      phoneNumber,
      age,
      gender,
      profession,
      bio,
      avatar,
      skills,
    } = req.body;

    if (profession !== undefined) {
      const normalizedProfession = String(profession).trim().toLowerCase();
      if (!PROFESSION_OPTIONS.includes(normalizedProfession)) {
        return res.status(400).json({
          error: `Profession must be one of: ${PROFESSION_OPTIONS.join(', ')}`,
        });
      }
    }

    if (age !== undefined && age !== null) {
      const ageNumber = Number(age);
      if (!Number.isFinite(ageNumber) || ageNumber < 0 || ageNumber > 120) {
        return res.status(400).json({ error: 'Age must be a valid number between 0 and 120.' });
      }
    }

    const normalizedSkills =
      skills === undefined
        ? undefined
        : Array.isArray(skills)
        ? skills.map((skill) => String(skill).trim()).filter(Boolean)
        : String(skills)
            .split(',')
            .map((skill) => skill.trim())
            .filter(Boolean);

    const updates = {
      ...(fullName !== undefined && { fullName: String(fullName).trim() }),
      ...(location !== undefined && { location: String(location).trim() }),
      ...(city !== undefined && { city: String(city).trim() }),
      ...(pincode !== undefined && { pincode: String(pincode).trim() }),
      ...(phoneNumber !== undefined && { phoneNumber: String(phoneNumber).trim() }),
      ...(age !== undefined && { age: age === null || age === '' ? null : Number(age) }),
      ...(gender !== undefined && { gender: String(gender).trim() }),
      ...(profession !== undefined && { profession: String(profession).trim().toLowerCase() }),
      ...(bio !== undefined && { bio: String(bio).trim() }),
      ...(avatar !== undefined && { avatar: String(avatar).trim() }),
      ...(normalizedSkills !== undefined && { skills: normalizedSkills }),
    };

    const user = await User.findByIdAndUpdate(
      req.userId,
      updates,
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({
      message: 'Profile updated successfully.',
      user: mapUserResponse(user),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to update profile.' });
  }
});

// UPLOAD profile photo (requires token)
router.post('/photo', verifyToken, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Photo file is required.' });
    }

    const avatar = `${req.protocol}://${req.get('host')}/uploads/profile/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(req.userId, { avatar }, { new: true }).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.status(201).json({
      message: 'Profile photo uploaded successfully.',
      user: mapUserResponse(user),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to upload profile photo.' });
  }
});

// UPDATE user stats (requires token)
router.put('/stats', verifyToken, async (req, res) => {
  try {
    const { jobsDone, reviews, earned } = req.body;

    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        stats: {
          jobsDone: jobsDone !== undefined ? jobsDone : undefined,
          reviews: reviews !== undefined ? reviews : undefined,
          earned: earned !== undefined ? earned : undefined,
        },
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({
      message: 'Stats updated successfully.',
      stats: user.stats,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to update stats.' });
  }
});

export default router;
