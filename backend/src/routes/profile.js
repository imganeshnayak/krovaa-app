import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import User from '../models/User.js';
import Transaction from '../models/Wallet.js';
import { verifyToken } from '../middleware/auth.js';
import { prisma } from '../config/db.js';

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

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

const VERIFICATION_FEE = Number(process.env.VERIFICATION_FEE || 299);

function parseJsonArray(value, fallback = []) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function normalizeSocialLinks(value) {
  const links = parseJsonArray(value)
    .map((link) => ({
      platform: String(link?.platform || '').trim().toLowerCase(),
      url: String(link?.url || '').trim(),
    }))
    .filter((link) => link.platform && link.url);

  return JSON.stringify(links);
}

function normalizeUserGoal(value) {
  const normalized = String(value || '').trim().toUpperCase();
  return ['OFFER_SERVICE', 'HIRE_PROFESSIONALS'].includes(normalized) ? normalized : '';
}

async function getVerificationSummary(userId) {
  const request = await prisma.verificationRequest.findUnique({
    where: { userId },
  });

  return {
    verificationStatus: request?.status || 'none',
    verificationFee: request?.fee ?? VERIFICATION_FEE,
    verificationRequestedAt: request?.requestedAt ?? null,
  };
}

async function recalculateUserRating(reviewedId) {
  const aggregate = await prisma.userRating.aggregate({
    where: { reviewedId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  const averageRating = aggregate._avg.rating ? Number(aggregate._avg.rating.toFixed(1)) : 0;
  const totalRatings = aggregate._count.rating;

  await prisma.user.update({
    where: { id: reviewedId },
    data: { reviews: totalRatings },
  });

  return {
    averageRating,
    totalRatings,
  };
}

function parsePositiveAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }
  return amount;
}

function mapUserResponse(user) {
  return {
    id: String(user.id),
    email: user.email,
    username: user.username,
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
    skills: JSON.parse(user.skills || '[]'),
    coverPhotoUrl: user.coverPhotoUrl || '',
    userGoal: user.userGoal || '',
    stats: {
      jobsDone: user.jobsDone,
      reviews: user.reviews,
      earned: user.earned,
    },
    blockedUsers: user.blockedUsers ? user.blockedUsers.map((b) => String(b.blockedId)) : [],
  };
}

router.get('/code/:userCode', async (req, res) => {
  try {
    const userCode = String(req.params.userCode || '').trim().toUpperCase();

    if (!userCode) {
      return res.status(400).json({ error: 'User code is required.' });
    }

    const user = await User.findUnique({ where: { userCode }, include: { blockedUsers: true } });
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

router.get('/username/:username', async (req, res) => {
  try {
    const username = String(req.params.username || '').trim().toLowerCase();

    if (!username) {
      return res.status(400).json({ error: 'Username is required.' });
    }

    const user = await User.findUnique({ where: { username }, include: { blockedUsers: true } });
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

router.get('/wallet', verifyToken, async (req, res) => {
  try {
    const user = await User.findUnique({ where: { id: req.userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const earned = user.earned || 0;
    const balance = user.walletBalance || 0;

    const pendingResult = await Transaction.aggregate({
      where: { userId: req.userId, status: 'pending' },
      _sum: { amount: true },
    });
    const pending = pendingResult._sum?.amount || 0;

    const transactions = await Transaction.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const formattedTransactions = transactions.map((tx) => ({
      id: String(tx.id),
      type: tx.type,
      label: tx.label,
      amount: tx.amount,
      description: tx.description || '',
      date: tx.createdAt.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      status: tx.status,
    }));

    return res.json({
      balance,
      pending,
      earned,
      transactions: formattedTransactions,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to fetch wallet data.' });
  }
});

router.post('/wallet/transaction', verifyToken, async (req, res) => {
  try {
    const { type, label, amount, description, status, relatedId, relatedModel } = req.body;
    const normalizedAmount = parsePositiveAmount(amount);

    if (!type || !['incoming', 'outgoing'].includes(type)) {
      return res.status(400).json({ error: 'Transaction type must be "incoming" or "outgoing".' });
    }

    if (!label) {
      return res.status(400).json({ error: 'Transaction label is required.' });
    }

    if (normalizedAmount === null) {
      return res.status(400).json({ error: 'Transaction amount must be greater than 0.' });
    }

    const user = await User.findUnique({ where: { id: req.userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (type === 'outgoing') {
      if (user.walletBalance < normalizedAmount) {
        return res.status(400).json({ error: 'Insufficient wallet balance.' });
      }
      await User.update({
        where: { id: req.userId },
        data: { walletBalance: user.walletBalance - normalizedAmount },
      });
    }

    const transaction = await Transaction.create({
      data: {
        userId: req.userId,
        type,
        label,
        amount: normalizedAmount,
        description: description || '',
        status: status || 'completed',
        relatedId: relatedId || null,
        relatedModel: relatedModel || null,
      },
    });

    if (type === 'incoming' && status !== 'pending') {
      await User.update({
        where: { id: req.userId },
        data: {
          walletBalance: user.walletBalance + normalizedAmount,
          earned: user.earned + normalizedAmount,
        },
      });
    }

    return res.status(201).json({
      message: 'Transaction created successfully.',
      transaction: {
        id: String(transaction.id),
        type: transaction.type,
        label: transaction.label,
        amount: transaction.amount,
        status: transaction.status,
        createdAt: transaction.createdAt,
      },
      balance: type === 'incoming' && status !== 'pending' ? user.walletBalance + normalizedAmount : user.walletBalance,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to create transaction.' });
  }
});

router.post('/wallet/send', verifyToken, async (req, res) => {
  try {
    const { recipientUserCode, amount, description } = req.body;
    const normalizedAmount = parsePositiveAmount(amount);

    if (!recipientUserCode) {
      return res.status(400).json({ error: 'Recipient user code is required.' });
    }

    if (normalizedAmount === null) {
      return res.status(400).json({ error: 'Amount must be greater than 0.' });
    }

    const sender = await User.findUnique({ where: { id: req.userId } });
    if (!sender) {
      return res.status(404).json({ error: 'Sender not found.' });
    }

    const recipient = await User.findUnique({
      where: { userCode: String(recipientUserCode).trim().toUpperCase() },
    });
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found.' });
    }

    if (recipient.id === sender.id) {
      return res.status(400).json({ error: 'You cannot send money to yourself.' });
    }

    if (sender.walletBalance < normalizedAmount) {
      return res.status(400).json({ error: 'Insufficient wallet balance.' });
    }

    await User.update({
      where: { id: sender.id },
      data: { walletBalance: sender.walletBalance - normalizedAmount },
    });

    await User.update({
      where: { id: recipient.id },
      data: { walletBalance: recipient.walletBalance + normalizedAmount },
    });

    const senderTx = await Transaction.create({
      data: {
        userId: sender.id,
        type: 'outgoing',
        label: `Sent to ${recipient.fullName}`,
        amount: normalizedAmount,
        description: description || '',
        status: 'completed',
        relatedId: String(recipient.id),
        relatedModel: 'User',
      },
    });

    await Transaction.create({
      data: {
        userId: recipient.id,
        type: 'incoming',
        label: `Received from ${sender.fullName}`,
        amount: normalizedAmount,
        description: description || '',
        status: 'completed',
        relatedId: String(sender.id),
        relatedModel: 'User',
      },
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${recipient.id}`).emit('walletUpdate', {
        type: 'incoming',
        amount: normalizedAmount,
        from: sender.fullName,
        balance: recipient.walletBalance + normalizedAmount,
      });
    }

    return res.json({
      message: `₹${normalizedAmount} sent to ${recipient.fullName} successfully.`,
      transaction: {
        id: String(senderTx.id),
        type: 'outgoing',
        label: senderTx.label,
        amount: normalizedAmount,
        status: 'completed',
        createdAt: senderTx.createdAt,
      },
      balance: sender.walletBalance - normalizedAmount,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to send money.' });
  }
});

router.post('/wallet/topup', verifyToken, async (req, res) => {
  try {
    const { amount, description } = req.body;
    const normalizedAmount = parsePositiveAmount(amount);

    if (normalizedAmount === null) {
      return res.status(400).json({ error: 'Amount must be greater than 0.' });
    }

    const user = await User.findUnique({ where: { id: req.userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    await User.update({
      where: { id: req.userId },
      data: { walletBalance: user.walletBalance + normalizedAmount },
    });

    const transaction = await Transaction.create({
      data: {
        userId: req.userId,
        type: 'incoming',
        label: 'Wallet Top Up',
        amount: normalizedAmount,
        description: description || 'Wallet topped up',
        status: 'completed',
      },
    });

    return res.json({
      message: `₹${normalizedAmount} added to wallet successfully.`,
      transaction: {
        id: String(transaction.id),
        type: 'incoming',
        label: transaction.label,
        amount: normalizedAmount,
        status: 'completed',
        createdAt: transaction.createdAt,
      },
      balance: user.walletBalance + normalizedAmount,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to top up wallet.' });
  }
});

router.get('/wallet/transactions', verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const type = req.query.type;
    const status = req.query.status;

    const query = { userId: req.userId };
    if (type) query.type = type;
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      Transaction.findMany({
        where: query,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      Transaction.count({ where: query }),
    ]);

    const formattedTransactions = transactions.map((tx) => ({
      id: String(tx.id),
      type: tx.type,
      label: tx.label,
      amount: tx.amount,
      description: tx.description || '',
      date: tx.createdAt.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      status: tx.status,
    }));

    return res.json({
      transactions: formattedTransactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + transactions.length < total,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to fetch transactions.' });
  }
});

router.get('/wallet/transaction/:transactionId', verifyToken, async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await Transaction.findFirst({
      where: {
        id: parseInt(transactionId),
        userId: req.userId,
      },
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    return res.json({
      id: String(transaction.id),
      type: transaction.type,
      label: transaction.label,
      amount: transaction.amount,
      description: transaction.description || '',
      date: transaction.createdAt.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      status: transaction.status,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to fetch transaction.' });
  }
});

router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findUnique({ where: { id: parseInt(userId) }, include: { blockedUsers: true } });
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

router.get('/', verifyToken, async (req, res) => {
  try {
    const user = await User.findUnique({ where: { id: req.userId }, include: { blockedUsers: true } });
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
      coverPhotoUrl,
      userGoal,
      socialLinks,
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
        ? JSON.stringify(skills.map((skill) => String(skill).trim()).filter(Boolean))
        : JSON.stringify(
            String(skills)
              .split(',')
              .map((skill) => skill.trim())
              .filter(Boolean)
          );

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
      ...(coverPhotoUrl !== undefined && { coverPhotoUrl: String(coverPhotoUrl).trim() }),
      ...(userGoal !== undefined && { userGoal: normalizeUserGoal(userGoal) }),
      ...(normalizedSkills !== undefined && { skills: normalizedSkills }),
      ...(socialLinks !== undefined && { socialLinks: normalizeSocialLinks(socialLinks) }),
    };

    await User.update({
      where: { id: req.userId },
      data: updates,
    });

    const refreshed = await User.findUnique({ where: { id: req.userId }, include: { blockedUsers: true } });

    if (!refreshed) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({
      message: 'Profile updated successfully.',
      user: mapUserResponse(refreshed),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to update profile.' });
  }
});

router.delete('/photo', verifyToken, async (req, res) => {
  try {
    const user = await User.update({
      where: { id: req.userId },
      data: {
        avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200',
      },
    });

    return res.json({
      message: 'Profile photo removed successfully.',
      user: mapUserResponse(user),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to remove profile photo.' });
  }
});

router.post('/cover-photo', verifyToken, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Cover photo file is required.' });
    }

    const coverPhotoUrl = req.file.path || req.file.secure_url;

    const user = await User.update({
      where: { id: req.userId },
      data: { coverPhotoUrl },
    });

    return res.status(201).json({
      message: 'Cover photo uploaded successfully.',
      user: mapUserResponse(user),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to upload cover photo.' });
  }
});

router.delete('/cover-photo', verifyToken, async (req, res) => {
  try {
    const user = await User.update({
      where: { id: req.userId },
      data: { coverPhotoUrl: '' },
    });

    return res.json({
      message: 'Cover photo removed successfully.',
      user: mapUserResponse(user),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to remove cover photo.' });
  }
});

router.post('/photo', verifyToken, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Photo file is required.' });
    }

    const avatar = req.file.path || req.file.secure_url;

    const user = await User.update({
      where: { id: req.userId },
      data: { avatar },
    });

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

router.get('/verification/status', verifyToken, async (req, res) => {
  try {
    const summary = await getVerificationSummary(req.userId);
    return res.json(summary);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to fetch verification status.' });
  }
});

router.get('/verification/fee', async (_req, res) => {
  return res.json({ fee: VERIFICATION_FEE });
});

router.post('/verification/request', verifyToken, async (req, res) => {
  try {
    const existing = await prisma.verificationRequest.findUnique({
      where: { userId: req.userId },
    });

    if (existing && existing.status === 'pending') {
      return res.status(200).json({
        message: 'Verification request already pending.',
        status: existing.status,
        fee: existing.fee,
      });
    }

    const request = await prisma.verificationRequest.upsert({
      where: { userId: req.userId },
      create: { userId: req.userId, fee: VERIFICATION_FEE, status: 'pending' },
      update: { status: 'pending', fee: VERIFICATION_FEE, requestedAt: new Date(), reviewedAt: null },
    });

    return res.status(201).json({
      message: 'Verification request submitted.',
      status: request.status,
      fee: request.fee,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to submit verification request.' });
  }
});

// Block a user
router.post('/block/:blockedUserId', verifyToken, async (req, res) => {
  try {
    const blockedUserId = parseInt(req.params.blockedUserId);
    if (!Number.isInteger(blockedUserId)) {
      return res.status(400).json({ error: 'Invalid user id.' });
    }

    if (blockedUserId === req.userId) {
      return res.status(400).json({ error: 'You cannot block yourself.' });
    }

    // ensure target exists
    const target = await User.findUnique({ where: { id: blockedUserId } });
    if (!target) return res.status(404).json({ error: 'User to block not found.' });

    try {
      await prisma.blockedUser.create({ data: { blockerId: req.userId, blockedId: blockedUserId } });
    } catch (err) {
      // ignore unique constraint error
    }

    const refreshed = await User.findUnique({ where: { id: req.userId }, include: { blockedUsers: true } });
    return res.json({ message: 'User blocked.', blockedUsers: refreshed ? refreshed.blockedUsers.map((b) => String(b.blockedId)) : [] });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to block user.' });
  }
});

// Unblock a user
router.post('/unblock/:blockedUserId', verifyToken, async (req, res) => {
  try {
    const blockedUserId = parseInt(req.params.blockedUserId);
    if (!Number.isInteger(blockedUserId)) {
      return res.status(400).json({ error: 'Invalid user id.' });
    }

    await prisma.blockedUser.deleteMany({ where: { blockerId: req.userId, blockedId: blockedUserId } });

    const refreshed = await User.findUnique({ where: { id: req.userId }, include: { blockedUsers: true } });
    return res.json({ message: 'User unblocked.', blockedUsers: refreshed ? refreshed.blockedUsers.map((b) => String(b.blockedId)) : [] });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to unblock user.' });
  }
});

router.get('/rating-eligibility/:reviewedUserId', verifyToken, async (req, res) => {
  try {
    const reviewedUserId = parseInt(req.params.reviewedUserId);
    if (!Number.isInteger(reviewedUserId)) {
      return res.status(400).json({ error: 'Invalid user id.' });
    }

    if (reviewedUserId === req.userId) {
      return res.json({ canRate: false, reason: 'You cannot rate yourself.' });
    }

    const alreadyRated = await prisma.userRating.findUnique({
      where: {
        reviewerId_reviewedId: {
          reviewerId: req.userId,
          reviewedId: reviewedUserId,
        },
      },
    });

    return res.json({
      canRate: !alreadyRated,
      reason: alreadyRated ? 'You have already rated this profile.' : '',
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to check rating eligibility.' });
  }
});

router.post('/ratings', verifyToken, async (req, res) => {
  try {
    const { reviewedId, rating, comment } = req.body;
    const reviewedIdInt = parseInt(reviewedId);
    const ratingInt = parseInt(rating);

    if (!Number.isInteger(reviewedIdInt)) {
      return res.status(400).json({ error: 'Invalid reviewed user id.' });
    }

    if (reviewedIdInt === req.userId) {
      return res.status(400).json({ error: 'You cannot rate yourself.' });
    }

    if (!Number.isInteger(ratingInt) || ratingInt < 1 || ratingInt > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5.' });
    }

    const reviewedUser = await User.findUnique({ where: { id: reviewedIdInt } });
    if (!reviewedUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    await prisma.userRating.upsert({
      where: {
        reviewerId_reviewedId: {
          reviewerId: req.userId,
          reviewedId: reviewedIdInt,
        },
      },
      create: {
        reviewerId: req.userId,
        reviewedId: reviewedIdInt,
        rating: ratingInt,
        comment: String(comment || '').trim(),
      },
      update: {
        rating: ratingInt,
        comment: String(comment || '').trim(),
      },
    });

    const summary = await recalculateUserRating(reviewedIdInt);

    return res.status(201).json({
      message: 'Rating submitted successfully.',
      rating: {
        reviewedId: reviewedIdInt,
        rating: ratingInt,
        comment: String(comment || '').trim(),
      },
      summary,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to submit rating.' });
  }
});

router.get('/ratings/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (!Number.isInteger(userId)) {
      return res.status(400).json({ error: 'Invalid user id.' });
    }

    const ratings = await prisma.userRating.findMany({
      where: { reviewedId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: {
          select: {
            id: true,
            fullName: true,
            avatar: true,
            username: true,
          },
        },
      },
    });

    const summary = await prisma.userRating.aggregate({
      where: { reviewedId: userId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return res.json({
      ratings: ratings.map((rating) => ({
        id: String(rating.id),
        rating: rating.rating,
        comment: rating.comment,
        createdAt: rating.createdAt,
        reviewer: rating.reviewer,
      })),
      summary: {
        averageRating: summary._avg.rating ? Number(summary._avg.rating.toFixed(1)) : 0,
        totalRatings: summary._count.rating,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to fetch ratings.' });
  }
});

router.put('/stats', verifyToken, async (req, res) => {
  try {
    const { jobsDone, reviews, earned } = req.body;

    const updates = {};
    if (jobsDone !== undefined) updates.jobsDone = jobsDone;
    if (reviews !== undefined) updates.reviews = reviews;
    if (earned !== undefined) updates.earned = earned;

    const user = await User.update({
      where: { id: req.userId },
      data: updates,
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({
      message: 'Stats updated successfully.',
      stats: {
        jobsDone: user.jobsDone,
        reviews: user.reviews,
        earned: user.earned,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to update stats.' });
  }
});

router.post('/block/:blockedUserId', verifyToken, async (req, res) => {
  try {
    const { blockedUserId } = req.params;
    const blockedUserIdInt = parseInt(blockedUserId);

    if (blockedUserIdInt === req.userId) {
      return res.status(400).json({ error: 'You cannot block yourself.' });
    }

    const user = await User.findUnique({ where: { id: req.userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const existingBlock = await prisma.blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: req.userId,
          blockedId: blockedUserIdInt,
        },
      },
    });

    if (existingBlock) {
      return res.status(400).json({ error: 'This user is already blocked.' });
    }

    await prisma.blockedUser.create({
      data: {
        blockerId: req.userId,
        blockedId: blockedUserIdInt,
      },
    });

    const blockedUsers = await prisma.blockedUser.findMany({
      where: { blockerId: req.userId },
      select: { blockedId: true },
    });

    return res.json({
      message: 'User blocked successfully.',
      blockedUsers: blockedUsers.map((b) => String(b.blockedId)),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to block user.' });
  }
});

router.post('/unblock/:blockedUserId', verifyToken, async (req, res) => {
  try {
    const { blockedUserId } = req.params;
    const blockedUserIdInt = parseInt(blockedUserId);

    const user = await User.findUnique({ where: { id: req.userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    await prisma.blockedUser.deleteMany({
      where: {
        blockerId: req.userId,
        blockedId: blockedUserIdInt,
      },
    });

    const blockedUsers = await prisma.blockedUser.findMany({
      where: { blockerId: req.userId },
      select: { blockedId: true },
    });

    return res.json({
      message: 'User unblocked successfully.',
      blockedUsers: blockedUsers.map((b) => String(b.blockedId)),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to unblock user.' });
  }
});

export default router;
