import 'dotenv/config.js';
import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import postsRoutes from './routes/posts.js';
import chatsRoutes from './routes/chats.js';
import jobsRoutes from './routes/jobs.js';
import http from 'http';
import { Server as IOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import Conversation from './models/Conversation.js';
import Message from './models/Message.js';
import { prisma } from './config/db.js';

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

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/chats', chatsRoutes);
app.use('/api/jobs', jobsRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

async function startServer() {
  await connectDB();

  const server = http.createServer(app);

  const io = new IOServer(server, {
    cors: {
      origin: '*',
    },
  });

  app.set('io', io);

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Authentication error: token required'));
      const secret = process.env.JWT_SECRET;
      if (!secret) return next(new Error('Authentication error: JWT_SECRET not set'));
      const decoded = jwt.verify(token, secret);
      const parsedId = parseInt(decoded.id, 10);
      if (Number.isNaN(parsedId)) {
        return next(new Error('Authentication error: invalid token payload'));
      }
      socket.userId = parsedId;
      return next();
    } catch (err) {
      return next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log('Socket connected:', socket.id, 'user:', userId);

    socket.join(`user_${userId}`);

    socket.on('join', (conversationId) => {
      socket.join(`conversation_${conversationId}`);
    });

    socket.on('leave', (conversationId) => {
      socket.leave(`conversation_${conversationId}`);
    });

    socket.on('sendMessage', async (payload, ack) => {
      try {
        const { conversationId, text, attachments = [], clientMessageId, replyTo } = payload || {};
        if (!conversationId) return ack && ack({ error: 'conversationId is required' });

        const convo = await Conversation.findUnique({
          where: { id: parseInt(conversationId) },
          include: { participants: true },
        });
        if (!convo) return ack && ack({ error: 'Conversation not found' });
        if (!convo.participants.some((p) => p.userId === userId)) {
          return ack && ack({ error: 'Not a participant' });
        }

        const messageData = {
          conversationId: convo.id,
          senderId: userId,
          text: text || '',
          attachments: JSON.stringify(attachments),
          clientMessageId,
        };

        if (replyTo) {
          messageData.replyToId = parseInt(replyTo);
        }

        const message = await Message.create({
          data: messageData,
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
        normalizedMessage.clientMessageId = clientMessageId;

        io.to(`conversation_${conversationId}`).emit('message', normalizedMessage);

        convo.participants.forEach((participant) => {
          io.to(`user_${participant.userId}`).emit('conversationUpdate', {
            id: String(convo.id),
            lastMessage: message.text || (attachments[0] && '[attachment]') || '',
            lastMessageAt: message.createdAt,
          });
        });

        ack && ack({ message: normalizedMessage });
      } catch (error) {
        console.error('sendMessage error', error);
        ack && ack({ error: error.message || 'sendMessage failed' });
      }
    });

    socket.on('typing', ({ conversationId, isTyping }) => {
      if (!conversationId) return;
      socket.to(`conversation_${conversationId}`).emit('typing', { userId, isTyping });
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected', socket.id, reason);
    });
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`Backend server listening on port ${port} with Socket.IO`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
