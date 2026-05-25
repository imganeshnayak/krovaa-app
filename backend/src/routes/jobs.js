import express from 'express';
import Job from '../models/Job.js';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { verifyToken } from '../middleware/auth.js';
import { prisma } from '../config/db.js';

const router = express.Router();

const JOB_MODES = ['remote', 'hybrid', 'onsite', 'freelance', 'internship'];

function getRelativeTime(date) {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function mapJobResponse(job, currentUserId, applicants, user) {
  return {
    id: String(job.id),
    title: job.title,
    company: job.company,
    budget: job.budget,
    location: job.location,
    type: job.type,
    mode: job.mode || '',
    description: job.description,
    posted: getRelativeTime(job.createdAt),
    avatar: user?.avatar || 'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=100',
    posterId: user ? String(user.id) : String(job.userId),
    posterName: user?.fullName || 'TechCorp',
    hasApplied: currentUserId ? applicants.some((a) => a.userId === currentUserId) : false,
    applicantCount: applicants.length,
  };
}

function buildJobFilter(queryParams) {
  const { mode, location, q, category, posterId } = queryParams;
  const filter = {};
  const conditions = [];

  if (category && category !== 'All') {
    conditions.push({ type: category });
  }

  if (mode && mode !== 'ALL_MODES') {
    const normalizedMode = String(mode).trim().toLowerCase();
    if (JOB_MODES.includes(normalizedMode)) {
      conditions.push({ mode: normalizedMode });
    }
  }

  if (location && String(location).trim()) {
    const loc = String(location).trim();
    conditions.push({
      location: {
        contains: loc,
        mode: 'insensitive',
      },
    });
  }

  if (q && String(q).trim()) {
    const search = String(q).trim();
    conditions.push({
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    });
  }

  if (posterId) {
    const pid = parseInt(posterId, 10);
    if (!Number.isNaN(pid)) {
      conditions.push({ userId: pid });
    }
  }

  if (conditions.length === 1) {
    Object.assign(filter, conditions[0]);
  } else if (conditions.length > 1) {
    filter.AND = conditions;
  }

  return filter;
}

router.get('/', async (req, res) => {
  try {
    const filter = buildJobFilter(req.query);

    const jobs = await Job.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatar: true,
            email: true,
            username: true,
          },
        },
        applications: true,
      },
    });

    const authHeader = req.headers.authorization;
    let currentUserId = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
        const parsedId = parseInt(decoded.id, 10);
        currentUserId = Number.isNaN(parsedId) ? null : parsedId;
      } catch (e) {
        // Ignore token errors for listing jobs
      }
    }

    return res.json({
      jobs: jobs.map((job) => mapJobResponse(job, currentUserId, job.applications, job.user)),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to fetch jobs.' });
  }
});

router.get('/my', verifyToken, async (req, res) => {
  try {
    const jobs = await Job.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        applications: true,
        user: {
          select: {
            id: true,
            fullName: true,
            avatar: true,
            email: true,
            username: true,
          },
        },
      },
    });

    return res.json({
      jobs: jobs.map((job) => mapJobResponse(job, req.userId, job.applications, job.user)),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to fetch your listings.' });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, budget, location, type, mode, description, company } = req.body;

    if (!title || !budget || !location || !type || !description) {
      return res.status(400).json({ error: 'All fields (title, budget, location, type, description) are required.' });
    }

    const user = await User.findUnique({ where: { id: req.userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const jobCompany = company && String(company).trim() ? String(company).trim() : user.fullName;
    const normalizedMode = mode && String(mode).trim().toLowerCase();
    const finalMode = normalizedMode && JOB_MODES.includes(normalizedMode) ? normalizedMode : '';

    const job = await Job.create({
      data: {
        userId: req.userId,
        title: String(title).trim(),
        company: jobCompany,
        budget: String(budget).trim(),
        location: String(location).trim(),
        type: String(type).trim(),
        mode: finalMode,
        description: String(description).trim(),
      },
    });

    return res.status(201).json({
      message: 'Job posted successfully.',
      job: mapJobResponse(job, req.userId, [], user),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to post job.' });
  }
});

router.put('/:jobId', verifyToken, async (req, res) => {
  try {
    const jobId = parseInt(req.params.jobId);
    const job = await Job.findUnique({ where: { id: jobId } });

    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    if (job.userId !== req.userId) {
      return res.status(403).json({ error: 'You can only edit your own job listings.' });
    }

    const { title, budget, location, type, mode, description, company } = req.body;
    const updates = {};

    if (title !== undefined) updates.title = String(title).trim();
    if (company !== undefined) updates.company = String(company).trim();
    if (budget !== undefined) updates.budget = String(budget).trim();
    if (location !== undefined) updates.location = String(location).trim();
    if (type !== undefined) updates.type = String(type).trim();
    if (description !== undefined) updates.description = String(description).trim();
    if (mode !== undefined) {
      const normalizedMode = String(mode).trim().toLowerCase();
      updates.mode = JOB_MODES.includes(normalizedMode) ? normalizedMode : '';
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update.' });
    }

    const updated = await Job.update({
      where: { id: jobId },
      data: updates,
      include: {
        applications: true,
        user: {
          select: {
            id: true,
            fullName: true,
            avatar: true,
            email: true,
            username: true,
          },
        },
      },
    });

    return res.json({
      message: 'Job updated successfully.',
      job: mapJobResponse(updated, req.userId, updated.applications, updated.user),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to update job.' });
  }
});

router.delete('/:jobId', verifyToken, async (req, res) => {
  try {
    const jobId = parseInt(req.params.jobId);
    const job = await Job.findUnique({ where: { id: jobId } });

    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    if (job.userId !== req.userId) {
      return res.status(403).json({ error: 'You can only delete your own job listings.' });
    }

    await Job.delete({ where: { id: jobId } });

    return res.json({ message: 'Job deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to delete job.' });
  }
});

router.post('/:jobId/apply', verifyToken, async (req, res) => {
  try {
    const job = await Job.findUnique({
      where: { id: parseInt(req.params.jobId) },
    });
    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    if (job.userId === req.userId) {
      return res.status(400).json({ error: 'You cannot apply for your own job.' });
    }

    const existingApplication = await prisma.jobApplication.findUnique({
      where: {
        jobId_userId: {
          jobId: job.id,
          userId: req.userId,
        },
      },
    });

    if (existingApplication) {
      return res.status(400).json({ error: 'You have already applied for this job.' });
    }

    await prisma.jobApplication.create({
      data: {
        jobId: job.id,
        userId: req.userId,
      },
    });

    const participantIds = [req.userId, job.userId];
    let convo = await prisma.conversation.findFirst({
      where: {
        participants: {
          every: {
            userId: { in: participantIds },
          },
        },
      },
      include: {
        participants: true,
      },
    });

    if (!convo || convo.participants.length !== 2) {
      convo = await prisma.conversation.create({
        data: {
          participants: {
            create: participantIds.map((userId) => ({ userId })),
          },
        },
        include: {
          participants: true,
        },
      });
    }

    const applicationMessage = `Hi! I have just applied for your job posting: "${job.title}". Let's discuss details!`;
    const message = await Message.create({
      data: {
        conversationId: convo.id,
        senderId: req.userId,
        text: applicationMessage,
      },
    });

    await Conversation.update({
      where: { id: convo.id },
      data: {
        lastMessage: message.text,
        lastMessageAt: new Date(),
      },
    });

    return res.json({
      message: 'Application submitted successfully! A chat conversation has been started with the poster.',
      jobId: String(job.id),
      conversationId: String(convo.id),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to apply for job.' });
  }
});

router.get('/:jobId/applicants', verifyToken, async (req, res) => {
  try {
    const jobId = parseInt(req.params.jobId);
    const { status, sortBy } = req.query;

    const job = await Job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    // Only job owner can view applicants
    if (job.userId !== req.userId) {
      return res.status(403).json({ error: 'You are not authorized to view applicants for this job.' });
    }

    // Build where clause for filtering by status
    const whereClause = { jobId };
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    // Determine sort order
    let orderBy = { createdAt: 'desc' };
    if (sortBy === 'recent') orderBy = { createdAt: 'desc' };
    if (sortBy === 'oldest') orderBy = { createdAt: 'asc' };
    if (sortBy === 'shortlisted') orderBy = { shortlistedAt: 'desc' };

    const applicants = await prisma.jobApplication.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true,
            profession: true,
            bio: true,
            email: true,
            reviews: true,
          },
        },
      },
      orderBy,
    });

    // Mark as viewed if not already viewed
    const applicantIds = applicants.map(a => a.id);
    if (applicantIds.length > 0) {
      await prisma.jobApplication.updateMany({
        where: {
          id: { in: applicantIds },
          viewedAt: null,
        },
        data: { viewedAt: new Date(), status: 'viewed' },
      });
    }

    const mappedApplicants = applicants.map((app) => {
      // Calculate average rating
      const avgRating = app.user.reviews && app.user.reviews.length > 0
        ? (app.user.reviews.reduce((sum, r) => sum + r.rating, 0) / app.user.reviews.length).toFixed(1)
        : 0;

      return {
        id: String(app.user.id),
        username: app.user.username,
        name: app.user.fullName,
        avatar: app.user.avatar,
        profession: app.user.profession,
        bio: app.user.bio,
        email: app.user.email,
        rating: parseFloat(avgRating),
        reviewCount: app.user.reviews ? app.user.reviews.length : 0,
        status: app.status,
        appliedAt: app.createdAt,
        viewedAt: app.viewedAt,
        shortlistedAt: app.shortlistedAt,
        applicationId: String(app.id),
      };
    });

    return res.json({
      applicants: mappedApplicants,
      jobId: String(jobId),
      totalCount: mappedApplicants.length,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to fetch applicants.' });
  }
});

router.get('/:jobId/applicants/stats', verifyToken, async (req, res) => {
  try {
    const jobId = parseInt(req.params.jobId);

    const job = await Job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    // Only job owner can view stats
    if (job.userId !== req.userId) {
      return res.status(403).json({ error: 'You are not authorized to view stats for this job.' });
    }

    const [total, viewed, shortlisted, accepted, rejected] = await Promise.all([
      prisma.jobApplication.count({ where: { jobId } }),
      prisma.jobApplication.count({ where: { jobId, status: 'viewed' } }),
      prisma.jobApplication.count({ where: { jobId, status: 'shortlisted' } }),
      prisma.jobApplication.count({ where: { jobId, status: 'accepted' } }),
      prisma.jobApplication.count({ where: { jobId, status: 'rejected' } }),
    ]);

    return res.json({
      stats: {
        total,
        viewed,
        shortlisted,
        accepted,
        rejected,
        pending: total - viewed,
        conversionRate: total > 0 ? ((shortlisted / total) * 100).toFixed(1) : 0,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to fetch stats.' });
  }
});

router.post('/:jobId/applicants/:applicationId/status', verifyToken, async (req, res) => {
  try {
    const jobId = parseInt(req.params.jobId);
    const applicationId = parseInt(req.params.applicationId);
    const { status } = req.body;

    const validStatuses = ['pending', 'viewed', 'shortlisted', 'rejected', 'accepted'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status provided.' });
    }

    const job = await Job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    // Only job owner can update status
    if (job.userId !== req.userId) {
      return res.status(403).json({ error: 'You are not authorized to update applicant status.' });
    }

    const application = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application || application.jobId !== jobId) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    // Update based on status
    const updateData = { status };
    if (status === 'shortlisted') {
      updateData.shortlistedAt = new Date();
    }
    if (status === 'viewed' && !application.viewedAt) {
      updateData.viewedAt = new Date();
    }

    const updated = await prisma.jobApplication.update({
      where: { id: applicationId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true,
            profession: true,
          },
        },
      },
    });

    return res.json({
      message: `Applicant ${status} successfully.`,
      application: {
        id: String(updated.user.id),
        name: updated.user.fullName,
        status: updated.status,
        applicationId: String(updated.id),
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to update applicant status.' });
  }
});

export default router;
