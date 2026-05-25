import express from 'express';
import Job from '../models/Job.js';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { verifyToken } from '../middleware/auth.js';
import { prisma } from '../config/db.js';

const router = express.Router();

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
    description: job.description,
    posted: getRelativeTime(job.createdAt),
    avatar: user?.avatar || 'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=100',
    posterId: user ? String(user.id) : String(job.userId),
    posterName: user?.fullName || 'TechCorp',
    hasApplied: currentUserId ? applicants.some((a) => a.userId === currentUserId) : false,
    applicantCount: applicants.length,
  };
}

router.get('/', async (req, res) => {
  try {
    const { category, q } = req.query;
    const query = {};

    if (category && category !== 'All') {
      query.type = category;
    }

    if (q) {
      const searchRegex = new RegExp(String(q).trim(), 'i');
      query.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { company: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const jobs = await Job.findMany({
      where: query,
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

router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, budget, location, type, description, company } = req.body;

    if (!title || !budget || !location || !type || !description) {
      return res.status(400).json({ error: 'All fields (title, budget, location, type, description) are required.' });
    }

    const user = await User.findUnique({ where: { id: req.userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const jobCompany = company && String(company).trim() ? String(company).trim() : user.fullName;

    const job = await Job.create({
      data: {
        userId: req.userId,
        title: String(title).trim(),
        company: jobCompany,
        budget: String(budget).trim(),
        location: String(location).trim(),
        type: String(type).trim(),
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

export default router;
