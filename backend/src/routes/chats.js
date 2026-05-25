import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';
import { prisma } from '../config/db.js';

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

function parsePositiveIntId(value) {
  const parsed = parseInt(String(value), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeMessageForClient(message, sender) {
  return {
    id: String(message.id),
    conversation: String(message.conversationId),
    sender: sender
      ? {
          id: String(sender.id),
          fullName: sender.fullName,
          avatar: sender.avatar,
          email: sender.email,
          username: sender.username,
          userCode: sender.userCode,
        }
      : undefined,
    text: message.text ?? '',
    attachments: JSON.parse(message.attachments || '[]'),
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    clientMessageId: message.clientMessageId,
    replyTo: message.replyToId
      ? {
          id: String(message.replyToId),
          text: '',
          sender: null,
          attachments: [],
        }
      : null,
    isForwarded: message.isForwarded || false,
    forwardedFrom: message.forwardedFrom || null,
  };
}

router.post('/conversations', verifyToken, async (req, res) => {
  try {
    const { participants } = req.body;
    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ error: 'Participants array is required.' });
    }

    const participantIds = participants.map(parsePositiveIntId);
    if (participantIds.some((id) => id === null)) {
      return res.status(400).json({ error: 'All participant IDs must be valid numbers.' });
    }

    const idsInt = Array.from(new Set([...participantIds, req.userId]));

    if (idsInt.length < 2) {
      return res.status(400).json({ error: 'At least one other valid participant is required.' });
    }

    const existingConvo = await prisma.conversation.findFirst({
      where: {
        participants: {
          every: {
            userId: { in: idsInt },
          },
        },
      },
      include: {
        participants: true,
      },
    });

    if (existingConvo && existingConvo.participants.length === idsInt.length) {
      return res.json({ conversation: existingConvo });
    }

    const created = await prisma.conversation.create({
      data: {
        participants: {
          create: idsInt.map((userId) => ({ userId })),
        },
      },
      include: {
        participants: true,
      },
    });

    return res.status(201).json({ conversation: created });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to create conversation.' });
  }
});

router.post('/conversations/by-code', verifyToken, async (req, res) => {
  try {
    const { userCode } = req.body;

    const normalizedCode = String(userCode || '').trim().toUpperCase();
    if (!normalizedCode || !/^[A-Z0-9]{6}$/.test(normalizedCode)) {
      return res.status(400).json({ error: 'A valid 6-character user code is required.' });
    }

    const targetUser = await User.findUnique({ where: { userCode: normalizedCode } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (targetUser.id === req.userId) {
      return res.status(400).json({ error: 'You cannot start a chat with yourself.' });
    }

    const ids = [req.userId, targetUser.id];
    const convo = await prisma.conversation.findFirst({
      where: {
        participants: {
          every: {
            userId: { in: ids },
          },
        },
      },
      include: {
        participants: true,
      },
    });

    if (convo && convo.participants.length === 2) {
      return res.json({ conversation: convo, user: targetUser });
    }

    const created = await prisma.conversation.create({
      data: {
        participants: {
          create: ids.map((userId) => ({ userId })),
        },
      },
      include: {
        participants: true,
      },
    });

    return res.status(201).json({ conversation: created, user: targetUser });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to open chat by user code.' });
  }
});

router.post('/conversations/by-username', verifyToken, async (req, res) => {
  try {
    const { username } = req.body;

    const normalizedUsername = String(username || '').trim().toLowerCase();
    if (!normalizedUsername || !/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
      return res.status(400).json({ error: 'A valid username is required (3-20 characters, letters, numbers, or underscores).' });
    }

    const targetUser = await User.findUnique({ where: { username: normalizedUsername } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (targetUser.id === req.userId) {
      return res.status(400).json({ error: 'You cannot start a chat with yourself.' });
    }

    const ids = [req.userId, targetUser.id];
    const convo = await prisma.conversation.findFirst({
      where: {
        participants: {
          every: {
            userId: { in: ids },
          },
        },
      },
      include: {
        participants: true,
      },
    });

    if (convo && convo.participants.length === 2) {
      return res.json({ conversation: convo, user: targetUser });
    }

    const created = await prisma.conversation.create({
      data: {
        participants: {
          create: ids.map((userId) => ({ userId })),
        },
      },
      include: {
        participants: true,
      },
    });

    return res.status(201).json({ conversation: created, user: targetUser });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to open chat by username.' });
  }
});

router.get('/conversations', verifyToken, async (req, res) => {
  try {
    const convos = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: req.userId,
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                avatar: true,
                email: true,
                username: true,
                userCode: true,
              },
            },
          },
        },
      },
    });

    const convosWithUnread = await Promise.all(
      convos.map(async (convo) => {
        const unreadCount = await Message.count({
          where: {
            conversationId: convo.id,
            senderId: { not: req.userId },
          },
        });

        return {
          id: String(convo.id),
          participants: convo.participants.map((p) => ({
            id: String(p.user.id),
            fullName: p.user.fullName,
            avatar: p.user.avatar,
            email: p.user.email,
            username: p.user.username,
            userCode: p.user.userCode,
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

router.post('/conversations/:conversationId/read', verifyToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const convo = await Conversation.findUnique({
      where: { id: parseInt(conversationId) },
      include: { participants: true },
    });

    if (!convo) return res.status(404).json({ error: 'Conversation not found.' });
    if (!convo.participants.some((p) => p.userId === req.userId)) {
      return res.status(403).json({ error: 'Not a participant in this conversation.' });
    }

    await Message.updateMany({
      where: {
        conversationId: convo.id,
        senderId: { not: req.userId },
      },
      data: {},
    });

    const messages = await Message.findMany({
      where: {
        conversationId: convo.id,
        senderId: { not: req.userId },
      },
      select: { id: true, readBy: true },
    });

    const updatedMessages = messages.map((msg) => {
      const readBy = JSON.parse(msg.readBy || '[]');
      if (!readBy.includes(req.userId)) {
        readBy.push(req.userId);
      }
      return { id: msg.id, readBy: JSON.stringify(readBy) };
    });

    for (const msg of updatedMessages) {
      await Message.update({
        where: { id: msg.id },
        data: { readBy: msg.readBy },
      });
    }

    const remaining = await Message.count({
      where: {
        conversationId: convo.id,
        senderId: { not: req.userId },
      },
    });

    const io = req.app.get('io');
    if (io) io.to(`conversation_${conversationId}`).emit('conversationRead', { conversationId, userId: req.userId });

    return res.json({ success: true, unreadCount: 0 });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to mark conversation read.' });
  }
});

router.delete('/conversations/:conversationId/messages/:messageId', verifyToken, async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const convo = await Conversation.findUnique({
      where: { id: parseInt(conversationId) },
      include: { participants: true },
    });

    if (!convo) return res.status(404).json({ error: 'Conversation not found.' });
    if (!convo.participants.some((p) => p.userId === req.userId)) {
      return res.status(403).json({ error: 'Not a participant in this conversation.' });
    }

    const message = await Message.findUnique({ where: { id: parseInt(messageId) } });
    if (!message) return res.status(404).json({ error: 'Message not found.' });
    if (message.senderId !== req.userId) {
      return res.status(403).json({ error: 'Only the sender can delete this message.' });
    }

    await Message.delete({ where: { id: message.id } });

    const lastMsg = await Message.findFirst({
      where: { conversationId: convo.id },
      orderBy: { createdAt: 'desc' },
      include: { sender: true },
    });

    await Conversation.update({
      where: { id: convo.id },
      data: {
        lastMessage: lastMsg ? (lastMsg.text || (JSON.parse(lastMsg.attachments || '[]')[0] && '[attachment]') || '') : '',
        lastMessageAt: lastMsg ? lastMsg.createdAt : convo.lastMessageAt,
      },
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`conversation_${conversationId}`).emit('messageDeleted', { id: messageId });
      convo.participants.forEach((participant) => {
        io.to(`user_${participant.userId}`).emit('conversationUpdate', {
          id: String(convo.id),
          lastMessage: lastMsg ? lastMsg.text : '',
          lastMessageAt: lastMsg ? lastMsg.createdAt : convo.lastMessageAt,
        });
      });
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to delete message.' });
  }
});

router.post('/conversations/:conversationId/messages/:messageId/forward', verifyToken, async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const { targetConversationId } = req.body;
    if (!targetConversationId) return res.status(400).json({ error: 'targetConversationId is required.' });

    const sourceMsg = await Message.findUnique({
      where: { id: parseInt(messageId) },
      include: { sender: true },
    });
    if (!sourceMsg) return res.status(404).json({ error: 'Source message not found.' });

    const targetConvo = await Conversation.findUnique({
      where: { id: parseInt(targetConversationId) },
      include: { participants: true },
    });
    if (!targetConvo) return res.status(404).json({ error: 'Target conversation not found.' });
    if (!targetConvo.participants.some((p) => p.userId === req.userId)) {
      return res.status(403).json({ error: 'Not a participant in the target conversation.' });
    }

    const forwarded = await Message.create({
      data: {
        conversationId: targetConvo.id,
        senderId: req.userId,
        text: sourceMsg.text || '',
        attachments: sourceMsg.attachments,
        forwardedFrom: String(sourceMsg.senderId),
        isForwarded: true,
      },
    });

    await Conversation.update({
      where: { id: targetConvo.id },
      data: {
        lastMessage: forwarded.text || (JSON.parse(forwarded.attachments || '[]')[0] && '[attachment]') || '',
        lastMessageAt: new Date(),
      },
    });

    const normalized = normalizeMessageForClient(forwarded, sourceMsg.sender);

    const io = req.app.get('io');
    if (io) {
      io.to(`conversation_${targetConversationId}`).emit('message', normalized);
      targetConvo.participants.forEach((participant) => {
        io.to(`user_${participant.userId}`).emit('conversationUpdate', {
          id: String(targetConvo.id),
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

router.get('/search', verifyToken, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) {
      return res.json({ conversations: [], messages: [] });
    }

    const convos = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: req.userId,
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                avatar: true,
                email: true,
                username: true,
                userCode: true,
              },
            },
          },
        },
      },
    });

    const conversationIds = convos.map((c) => c.id);

    const messages = await Message.findMany({
      where: {
        conversationId: { in: conversationIds },
        text: { contains: q, mode: 'insensitive' },
      },
      orderBy: { createdAt: 'desc' },
      include: { sender: true },
    });

    const normalizedMessages = messages.map((msg) => {
      const normMsg = normalizeMessageForClient(msg, msg.sender);
      const fullConvo = convos.find((c) => c.id === msg.conversationId);
      if (fullConvo) {
        normMsg.conversationDetail = {
          id: String(fullConvo.id),
          participants: fullConvo.participants.map((p) => ({
            id: String(p.user.id),
            fullName: p.user.fullName,
            avatar: p.user.avatar,
            email: p.user.email,
            username: p.user.username,
            userCode: p.user.userCode,
          })),
          lastMessage: fullConvo.lastMessage,
          lastMessageAt: fullConvo.lastMessageAt,
        };
      }
      return normMsg;
    });

    const matchingConvos = convos.filter((convo) => {
      return convo.participants.some((participant) => {
        if (participant.user.id === req.userId) return false;
        const nameMatch = participant.user.fullName && participant.user.fullName.toLowerCase().includes(q.toLowerCase());
        const usernameMatch = participant.user.username && participant.user.username.toLowerCase().includes(q.toLowerCase());
        return nameMatch || usernameMatch;
      });
    });

    return res.json({
      conversations: matchingConvos.map((convo) => ({
        id: String(convo.id),
        participants: convo.participants.map((p) => ({
          id: String(p.user.id),
          fullName: p.user.fullName,
          avatar: p.user.avatar,
          email: p.user.email,
          username: p.user.username,
          userCode: p.user.userCode,
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

router.post(
  '/conversations/:conversationId/attachment',
  verifyToken,
  upload.single('file'),
  async (req, res) => {
    try {
      const { conversationId } = req.params;

      const convo = await Conversation.findUnique({
        where: { id: parseInt(conversationId) },
        include: { participants: true },
      });
      if (!convo) return res.status(404).json({ error: 'Conversation not found.' });
      if (!convo.participants.some((p) => p.userId === req.userId)) {
        return res.status(403).json({ error: 'Not a participant in this conversation.' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file provided.' });
      }

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

router.get('/conversations/:conversationId/messages', verifyToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const skip = Math.max(Number(req.query.skip) || 0, 0);

    const convo = await Conversation.findUnique({
      where: { id: parseInt(conversationId) },
      include: { participants: true },
    });
    if (!convo) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    if (!convo.participants.some((p) => p.userId === req.userId)) {
      return res.status(403).json({ error: 'Not a participant in this conversation.' });
    }

    const messages = await Message.findMany({
      where: { conversationId: convo.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            avatar: true,
            email: true,
            username: true,
            userCode: true,
          },
        },
      },
    });

    const normalizedMessages = messages
      .reverse()
      .map((msg) => normalizeMessageForClient(msg, msg.sender));

    return res.json({ messages: normalizedMessages });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to fetch messages.' });
  }
});

router.post(
  '/conversations/:conversationId/messages',
  verifyToken,
  upload.array('attachments', 6),
  async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { text } = req.body;

      const convo = await Conversation.findUnique({
        where: { id: parseInt(conversationId) },
        include: { participants: true },
      });
      if (!convo) return res.status(404).json({ error: 'Conversation not found.' });
      if (!convo.participants.some((p) => p.userId === req.userId)) {
        return res.status(403).json({ error: 'Not a participant in this conversation.' });
      }

      const attachments = (req.files || []).map((file) => {
        const url = `${req.protocol}://${req.get('host')}/uploads/chat/${file.filename}`;
        const mime = file.mimetype || '';
        const type = mime.startsWith('video/') ? 'video' : mime.startsWith('image/') ? 'image' : 'file';
        return { url, type };
      });

      const message = await Message.create({
        data: {
          conversationId: convo.id,
          senderId: req.userId,
          text: text || '',
          attachments: JSON.stringify(attachments),
        },
        include: { sender: true },
      });

      await Conversation.update({
        where: { id: convo.id },
        data: {
          lastMessage: message.text || (attachments[0] && '[attachment]') || '',
          lastMessageAt: new Date(),
        },
      });

      const normalizedMessage = normalizeMessageForClient(message, message.sender);

      return res.status(201).json({ message: normalizedMessage });
    } catch (error) {
      return res.status(500).json({ error: error.message || 'Unable to send message.' });
    }
  }
);

export default router;
