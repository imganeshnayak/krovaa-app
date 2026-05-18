import express from 'express';
import Job from '../models/Job.js';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Get relative time (e.g. "2h ago")
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

// Map database Job to client response
function mapJobResponse(job, currentUserId) {
  const poster = job.user || {};
  return {
    id: job._id.toString(),
    title: job.title,
    company: job.company,
    budget: job.budget,
    location: job.location,
    type: job.type,
    description: job.description,
    posted: getRelativeTime(job.createdAt),
    avatar: poster.avatar || 'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=100',
    posterId: poster._id ? poster._id.toString() : String(job.user),
    posterName: poster.fullName || 'TechCorp',
    hasApplied: currentUserId ? job.applicants.map(String).includes(String(currentUserId)) : false,
    applicantCount: job.applicants.length,
  };
}

// Fetch all jobs with filtering and search
router.get('/', async (req, res) => {
  try {
    const { category, q } = req.query;
    const query = {};

    // Filter by category
    if (category && category !== 'All') {
      query.type = category;
    }

    // Filter by search query (title, company, or description)
    if (q) {
      const searchRegex = new RegExp(String(q).trim(), 'i');
      query.$or = [
        { title: searchRegex },
        { company: searchRegex },
        { description: searchRegex },
      ];
    }

    const jobs = await Job.find(query)
      .sort({ createdAt: -1 })
      .populate('user', 'fullName avatar email username');

    const authHeader = req.headers.authorization;
    let currentUserId = null;

    // Optional user validation if token exists to mark "hasApplied"
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
        currentUserId = decoded.id;
      } catch (e) {
        // Ignore token errors for listing jobs
      }
    }

    return res.json({
      jobs: jobs.map((job) => mapJobResponse(job, currentUserId)),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to fetch jobs.' });
  }
});

// Post a new job
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, budget, location, type, description, company } = req.body;

    if (!title || !budget || !location || !type || !description) {
      return res.status(400).json({ error: 'All fields (title, budget, location, type, description) are required.' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const jobCompany = company && String(company).trim() ? String(company).trim() : user.fullName;

    const job = await Job.create({
      user: req.userId,
      title: String(title).trim(),
      company: jobCompany,
      budget: String(budget).trim(),
      location: String(location).trim(),
      type: String(type).trim(),
      description: String(description).trim(),
      applicants: [],
    });

    const populated = await job.populate('user', 'fullName avatar email username');

    return res.status(201).json({
      message: 'Job posted successfully.',
      job: mapJobResponse(populated, req.userId),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to post job.' });
  }
});

// Apply for a job and automatically start a chat conversation
router.post('/:jobId/apply', verifyToken, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    if (String(job.user) === String(req.userId)) {
      return res.status(400).json({ error: 'You cannot apply for your own job.' });
    }

    // Check if already applied
    if (job.applicants.map(String).includes(String(req.userId))) {
      return res.status(400).json({ error: 'You have already applied for this job.' });
    }

    // Add to applicants
    job.applicants.push(req.userId);
    await job.save();

    // Create or find conversation between applicant and job poster
    const participantIds = [String(req.userId), String(job.user)];
    let convo = await Conversation.findOne({
      participants: { $all: participantIds, $size: 2 },
    });

    if (!convo) {
      convo = await Conversation.create({ participants: participantIds });
    }

    // Send automatic application message in chat
    const applicationMessage = `Hi! I have just applied for your job posting: "${job.title}". Let's discuss details!`;
    const message = await Message.create({
      conversation: convo._id,
      sender: req.userId,
      text: applicationMessage,
    });

    convo.lastMessage = message.text;
    convo.lastMessageAt = new Date();
    await convo.save();

    return res.json({
      message: 'Application submitted successfully! A chat conversation has been started with the poster.',
      jobId: job._id.toString(),
      conversationId: convo._id.toString(),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to apply for job.' });
  }
});

export default router;
