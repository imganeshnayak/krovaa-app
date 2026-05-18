import 'dotenv/config.js';
import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import postsRoutes from './routes/posts.js';
import chatsRoutes from './routes/chats.js';
import http from 'http';
import { Server as IOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import Conversation from './models/Conversation.js';
import Message from './models/Message.js';

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

  // Socket auth middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Authentication error: token required'));
      const secret = process.env.JWT_SECRET;
      if (!secret) return next(new Error('Authentication error: JWT_SECRET not set'));
      const decoded = jwt.verify(token, secret);
      socket.userId = decoded.id;
      return next();
    } catch (err) {
      return next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log('Socket connected:', socket.id, 'user:', userId);

    // Join a personal room for direct events
    socket.join(`user_${userId}`);

    // Join conversation room
    socket.on('join', (conversationId) => {
      socket.join(`conversation_${conversationId}`);
    });

    socket.on('leave', (conversationId) => {
      socket.leave(`conversation_${conversationId}`);
    });

    // Handle sending messages
    socket.on('sendMessage', async (payload, ack) => {
      try {
        const { conversationId, text, attachments = [] } = payload || {};
        if (!conversationId) return ack && ack({ error: 'conversationId is required' });

        const convo = await Conversation.findById(conversationId);
        if (!convo) return ack && ack({ error: 'Conversation not found' });
        if (!convo.participants.map(String).includes(String(userId))) {
          return ack && ack({ error: 'Not a participant' });
        }

        const message = await Message.create({
          conversation: conversationId,
          sender: userId,
          text: text || '',
          attachments,
        });

        convo.lastMessage = message.text || (attachments[0] && '[attachment]') || '';
        convo.lastMessageAt = new Date();
        await convo.save();

        const populated = await message.populate('sender', 'fullName avatar email username userCode');
        const normalizedMessage = normalizeMessageForClient(populated);

        // Emit to conversation room
        io.to(`conversation_${conversationId}`).emit('message', normalizedMessage);

        // Emit conversation update to all participants so chat list refreshes
        convo.participants.forEach((participantId) => {
          io.to(`user_${participantId}`).emit('conversationUpdate', {
            id: String(convo._id),
            lastMessage: convo.lastMessage,
            lastMessageAt: convo.lastMessageAt,
          });
        });

        // Optionally ack back to sender
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
