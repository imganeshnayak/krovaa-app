import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'krovaa/chat-attachments',
    resource_type: 'auto',
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

function normalizeMessageForClient(message) {
  const messageObject = typeof message?.toObject === 'function' ? message.toObject() : message;

  return {
    id: String(messageObject._id ?? messageObject.id ?? ''),
    conversation: String(messageObject.conversation ?? ''),
    sender: messageObject.sender
      ? {
          id: String(messageObject.sender._id ?? messageObject.sender.id ?? messageObject.sender),
          fullName: messageObject.sender.fullName,
          avatar: messageObject.sender.avatar,
          email: messageObject.sender.email,
          username: messageObject.sender.username,
          userCode: messageObject.sender.userCode,
        }
      : undefined,
    text: messageObject.text ?? '',
    attachments: messageObject.attachments ?? [],
    createdAt: messageObject.createdAt,
    updatedAt: messageObject.updatedAt,
    clientMessageId: messageObject.clientMessageId,
  };
}

// Create or fetch a conversation between participants
router.post('/conversations', verifyToken, async (req, res) => {
  try {
    const { participants } = req.body;
    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ error: 'Participants array is required.' });
    }

    // Ensure the current user is included
    const ids = Array.from(new Set([...participants.map(String), String(req.userId)]));

    // Try to find existing conversation with same set of participants
    const convo = await Conversation.findOne({ participants: { $all: ids, $size: ids.length } });
    if (convo) {
      return res.json({ conversation: convo });
    }

    const created = await Conversation.create({ participants: ids });
    return res.status(201).json({ conversation: created });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to create conversation.' });
  }
});

// Create or fetch a conversation with a user code
router.post('/conversations/by-code', verifyToken, async (req, res) => {
  try {
    const { userCode } = req.body;

    const normalizedCode = String(userCode || '').trim().toUpperCase();
    if (!normalizedCode || !/^[A-Z0-9]{6}$/.test(normalizedCode)) {
      return res.status(400).json({ error: 'A valid 6-character user code is required.' });
    }

    const targetUser = await User.findOne({ userCode: normalizedCode });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (String(targetUser._id) === String(req.userId)) {
      return res.status(400).json({ error: 'You cannot start a chat with yourself.' });
    }

    const ids = [String(req.userId), String(targetUser._id)];
    const convo = await Conversation.findOne({ participants: { $all: ids, $size: ids.length } });
    if (convo) {
      return res.json({ conversation: convo, user: targetUser });
    }

    const created = await Conversation.create({ participants: ids });
    return res.status(201).json({ conversation: created, user: targetUser });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to open chat by user code.' });
  }
});

// Create or fetch conversation by username
router.post('/conversations/by-username', verifyToken, async (req, res) => {
  try {
    const { username } = req.body;

    const normalizedUsername = String(username || '').trim().toLowerCase();
    if (!normalizedUsername || !/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
      return res.status(400).json({ error: 'A valid username is required (3-20 characters, letters, numbers, or underscores).' });
    }

    const targetUser = await User.findOne({ username: normalizedUsername });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (String(targetUser._id) === String(req.userId)) {
      return res.status(400).json({ error: 'You cannot start a chat with yourself.' });
    }

    const ids = [String(req.userId), String(targetUser._id)];
    const convo = await Conversation.findOne({ participants: { $all: ids, $size: ids.length } });
    if (convo) {
      return res.json({ conversation: convo, user: targetUser });
    }

    const created = await Conversation.create({ participants: ids });
    return res.status(201).json({ conversation: created, user: targetUser });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to open chat by username.' });
  }
});

// List conversations for current user
router.get('/conversations', verifyToken, async (req, res) => {
  try {
    const convos = await Conversation.find({ participants: req.userId })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'fullName avatar email username userCode');

    // Compute unread counts per conversation (messages not read by current user and not sent by them)
    const convosWithUnread = await Promise.all(
      convos.map(async (convo) => {
        const unreadCount = await Message.countDocuments({
          conversation: convo._id,
          sender: { $ne: req.userId },
          readBy: { $ne: req.userId },
        });

        return {
          id: String(convo._id),
          participants: convo.participants.map((p) => ({
            id: String(p._id),
            fullName: p.fullName,
            avatar: p.avatar,
            email: p.email,
            username: p.username,
            userCode: p.userCode,
          })),
          lastMessage: convo.lastMessage,
          lastMessageAt: convo.lastMessageAt,
          createdAt: convo.createdAt,
          updatedAt: convo.updatedAt,
          unreadCount,
        };
      })
    );

    return res.json({ conversations: convosWithUnread });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to fetch conversations.' });
  }
});

// Mark all messages in a conversation as read by the current user
router.post('/conversations/:conversationId/read', verifyToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const convo = await Conversation.findById(conversationId);
    if (!convo) return res.status(404).json({ error: 'Conversation not found.' });
    if (!convo.participants.map(String).includes(String(req.userId))) {
      return res.status(403).json({ error: 'Not a participant in this conversation.' });
    }

    await Message.updateMany(
      { conversation: conversationId, sender: { $ne: req.userId }, readBy: { $ne: req.userId } },
      { $addToSet: { readBy: req.userId } }
    );

    // Return success and current unread count
    const remaining = await Message.countDocuments({ conversation: conversationId, sender: { $ne: req.userId }, readBy: { $ne: req.userId } });

    // Emit an event to conversation room to inform others this user read the conversation
    const io = req.app.get('io');
    if (io) io.to(`conversation_${conversationId}`).emit('conversationRead', { conversationId, userId: req.userId });

    return res.json({ success: true, unreadCount: remaining });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to mark conversation read.' });
  }
});

// Delete a message (only sender can delete)
router.delete('/conversations/:conversationId/messages/:messageId', verifyToken, async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const convo = await Conversation.findById(conversationId);
    if (!convo) return res.status(404).json({ error: 'Conversation not found.' });
    if (!convo.participants.map(String).includes(String(req.userId))) {
      return res.status(403).json({ error: 'Not a participant in this conversation.' });
    }

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: 'Message not found.' });
    if (String(message.sender) !== String(req.userId)) {
      return res.status(403).json({ error: 'Only the sender can delete this message.' });
    }

    await Message.findByIdAndDelete(messageId);

    // Update conversation last message
    const lastMsg = await Message.findOne({ conversation: conversationId }).sort({ createdAt: -1 }).populate('sender', 'fullName avatar email username userCode');
    convo.lastMessage = lastMsg ? (lastMsg.text || (lastMsg.attachments[0] && '[attachment]') || '') : '';
    convo.lastMessageAt = lastMsg ? lastMsg.createdAt : convo.lastMessageAt;
    await convo.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`conversation_${conversationId}`).emit('messageDeleted', { id: messageId });
      convo.participants.forEach((participantId) => {
        io.to(`user_${participantId}`).emit('conversationUpdate', {
          id: String(convo._id),
          lastMessage: convo.lastMessage,
          lastMessageAt: convo.lastMessageAt,
        });
      });
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to delete message.' });
  }
});

// Forward a message to another conversation
router.post('/conversations/:conversationId/messages/:messageId/forward', verifyToken, async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const { targetConversationId } = req.body;
    if (!targetConversationId) return res.status(400).json({ error: 'targetConversationId is required.' });

    const sourceMsg = await Message.findById(messageId).populate('sender', 'fullName avatar email username userCode');
    if (!sourceMsg) return res.status(404).json({ error: 'Source message not found.' });

    const targetConvo = await Conversation.findById(targetConversationId);
    if (!targetConvo) return res.status(404).json({ error: 'Target conversation not found.' });
    if (!targetConvo.participants.map(String).includes(String(req.userId))) {
      return res.status(403).json({ error: 'Not a participant in the target conversation.' });
    }

    const forwarded = await Message.create({
      conversation: targetConversationId,
      sender: req.userId,
      text: sourceMsg.text || '',
      attachments: sourceMsg.attachments || [],
    });

    targetConvo.lastMessage = forwarded.text || (forwarded.attachments[0] && '[attachment]') || '';
    targetConvo.lastMessageAt = new Date();
    await targetConvo.save();

    const populated = await forwarded.populate('sender', 'fullName avatar email username userCode');
    const normalized = normalizeMessageForClient(populated);

    const io = req.app.get('io');
    if (io) {
      io.to(`conversation_${targetConversationId}`).emit('message', normalized);
      targetConvo.participants.forEach((participantId) => {
        io.to(`user_${participantId}`).emit('conversationUpdate', {
          id: String(targetConvo._id),
          lastMessage: targetConvo.lastMessage,
          lastMessageAt: targetConvo.lastMessageAt,
        });
      });
    }

    return res.status(201).json({ message: normalized });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to forward message.' });
  }
});

// Search messages and conversations for the current user
router.get('/search', verifyToken, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) {
      return res.json({ conversations: [], messages: [] });
    }

    const queryRegex = new RegExp(q, 'i');

    // 1. Find all conversations for current user
    const convos = await Conversation.find({ participants: req.userId })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'fullName avatar email username userCode');

    const conversationIds = convos.map((c) => c._id);

    // 2. Find messages matching query in these conversations
    const messages = await Message.find({
      conversation: { $in: conversationIds },
      text: { $regex: queryRegex },
    })
      .sort({ createdAt: -1 })
      .populate('sender', 'fullName avatar email username userCode');

    // Normalize messages and attach conversation details
    const normalizedMessages = messages.map((msg) => {
      const normMsg = normalizeMessageForClient(msg);
      const fullConvo = convos.find((c) => String(c._id) === String(msg.conversation));
      if (fullConvo) {
        normMsg.conversationDetail = {
          id: String(fullConvo._id),
          participants: fullConvo.participants.map((p) => ({
            id: String(p._id),
            fullName: p.fullName,
            avatar: p.avatar,
            email: p.email,
            username: p.username,
            userCode: p.userCode,
          })),
          lastMessage: fullConvo.lastMessage,
          lastMessageAt: fullConvo.lastMessageAt,
        };
      }
      return normMsg;
    });

    // 3. Filter conversations whose participant name/username matches the query
    const matchingConvos = convos.filter((convo) => {
      return convo.participants.some((participant) => {
        if (String(participant._id) === String(req.userId)) return false;
        const nameMatch = participant.fullName && queryRegex.test(participant.fullName);
        const usernameMatch = participant.username && queryRegex.test(participant.username);
        return nameMatch || usernameMatch;
      });
    });

    return res.json({
      conversations: matchingConvos.map((convo) => ({
        id: String(convo._id),
        participants: convo.participants.map((p) => ({
          id: String(p._id),
          fullName: p.fullName,
          avatar: p.avatar,
          email: p.email,
          username: p.username,
          userCode: p.userCode,
        })),
        lastMessage: convo.lastMessage,
        lastMessageAt: convo.lastMessageAt,
      })),
      messages: normalizedMessages,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to search.' });
  }
});

// Upload attachment for a conversation
router.post(
  '/conversations/:conversationId/attachment',
  verifyToken,
  upload.single('file'),
  async (req, res) => {
    try {
      const { conversationId } = req.params;

      const convo = await Conversation.findById(conversationId);
      if (!convo) return res.status(404).json({ error: 'Conversation not found.' });
      if (!convo.participants.map(String).includes(String(req.userId))) {
        return res.status(403).json({ error: 'Not a participant in this conversation.' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file provided.' });
      }

      // Use Cloudinary URL
      const url = req.file.path || req.file.secure_url;
      const mime = req.file.mimetype || '';
      const type = mime.startsWith('video/') ? 'video' : mime.startsWith('image/') ? 'image' : 'file';

      const attachment = { url, type };

      return res.status(200).json({ attachment });
    } catch (error) {
      console.error('Attachment upload error:', error);
      return res.status(500).json({ error: error.message || 'Unable to upload attachment.' });
    }
  }
);

// Get messages for a conversation (with optional pagination)
router.get('/conversations/:conversationId/messages', verifyToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const skip = Math.max(Number(req.query.skip) || 0, 0);

    const convo = await Conversation.findById(conversationId);
    if (!convo) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    // Ensure participant
    if (!convo.participants.map(String).includes(String(req.userId))) {
      return res.status(403).json({ error: 'Not a participant in this conversation.' });
    }

    const messages = await Message.find({ conversation: conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'fullName avatar email username userCode');

    return res.json({ messages: messages.reverse() });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to fetch messages.' });
  }
});

// Send message (supports attachments)
router.post(
  '/conversations/:conversationId/messages',
  verifyToken,
  upload.array('attachments', 6),
  async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { text } = req.body;

      const convo = await Conversation.findById(conversationId);
      if (!convo) return res.status(404).json({ error: 'Conversation not found.' });
      if (!convo.participants.map(String).includes(String(req.userId))) {
        return res.status(403).json({ error: 'Not a participant in this conversation.' });
      }

      const attachments = (req.files || []).map((file) => {
        const url = `${req.protocol}://${req.get('host')}/uploads/chat/${file.filename}`;
        const mime = file.mimetype || '';
        const type = mime.startsWith('video/') ? 'video' : mime.startsWith('image/') ? 'image' : 'file';
        return { url, type };
      });

      const message = await Message.create({
        conversation: conversationId,
        sender: req.userId,
        text: text || '',
        attachments,
      });

      convo.lastMessage = message.text || (attachments[0] && '[attachment]') || '';
      convo.lastMessageAt = new Date();
      await convo.save();

      const populated = await message.populate('sender', 'fullName avatar email username userCode');
      const normalizedMessage = normalizeMessageForClient(populated);

      return res.status(201).json({ message: normalizedMessage });
    } catch (error) {
      return res.status(500).json({ error: error.message || 'Unable to send message.' });
    }
  }
);

export default router;
