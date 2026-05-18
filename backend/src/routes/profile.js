import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
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

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary storage for avatars
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'krovaa/profiles',
    resource_type: 'auto',
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image uploads are allowed.'));
      return;
    }
    cb(null, true);
  },
});

function mapUserResponse(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    username: user.username,
    userCode: user.userCode,
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
    blockedUsers: user.blockedUsers ? user.blockedUsers.map((id) => id.toString()) : [],
  };
}

// GET user profile by unique user code
router.get('/code/:userCode', async (req, res) => {
  try {
    const userCode = String(req.params.userCode || '').trim().toUpperCase();

    if (!userCode) {
      return res.status(400).json({ error: 'User code is required.' });
    }

    const user = await User.findOne({ userCode }).select('-password');
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

// GET user profile by username
router.get('/username/:username', async (req, res) => {
  try {
    const username = String(req.params.username || '').trim().toLowerCase();

    if (!username) {
      return res.status(400).json({ error: 'Username is required.' });
    }

    const user = await User.findOne({ username }).select('-password');
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

    // Use Cloudinary URL
    const avatar = req.file.path || req.file.secure_url;

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

// BLOCK a user (requires token)
router.post('/block/:blockedUserId', verifyToken, async (req, res) => {
  try {
    const { blockedUserId } = req.params;

    if (blockedUserId === req.userId) {
      return res.status(400).json({ error: 'You cannot block yourself.' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.blockedUsers.includes(blockedUserId)) {
      return res.status(400).json({ error: 'This user is already blocked.' });
    }

    user.blockedUsers.push(blockedUserId);
    await user.save();

    return res.json({
      message: 'User blocked successfully.',
      blockedUsers: user.blockedUsers,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to block user.' });
  }
});

// UNBLOCK a user (requires token)
router.post('/unblock/:blockedUserId', verifyToken, async (req, res) => {
  try {
    const { blockedUserId } = req.params;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    user.blockedUsers = user.blockedUsers.filter((id) => id.toString() !== blockedUserId);
    await user.save();

    return res.json({
      message: 'User unblocked successfully.',
      blockedUsers: user.blockedUsers,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to unblock user.' });
  }
});

export default router;
