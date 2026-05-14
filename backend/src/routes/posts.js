import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import MyPost from '../models/MyPost.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

function mapPostResponse(post) {
  return {
    id: post._id.toString(),
    userId: post.user.toString(),
    mediaUrl: post.mediaUrl,
    mediaType: post.mediaType,
    caption: post.caption,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

const uploadDirectory = path.join(process.cwd(), 'uploads', 'posts');
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
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');

    if (!isImage && !isVideo) {
      cb(new Error('Only image or video uploads are allowed.'));
      return;
    }

    cb(null, true);
  },
});

router.get('/me', verifyToken, async (req, res) => {
  try {
    const posts = await MyPost.find({ user: req.userId }).sort({ createdAt: -1 });

    return res.json({
      posts: posts.map(mapPostResponse),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to fetch posts.' });
  }
});

router.get('/user/:userId', async (req, res) => {
  try {
    const posts = await MyPost.find({ user: req.params.userId }).sort({ createdAt: -1 });

    return res.json({
      posts: posts.map(mapPostResponse),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to fetch posts.' });
  }
});

router.post('/', verifyToken, upload.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Media file is required.' });
    }

    const mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
    const mediaUrl = `${req.protocol}://${req.get('host')}/uploads/posts/${req.file.filename}`;
    const caption = req.body.caption ? String(req.body.caption).trim() : '';

    const post = await MyPost.create({
      user: req.userId,
      mediaUrl,
      mediaType,
      caption,
    });

    return res.status(201).json({
      message: 'Post uploaded successfully.',
      post: mapPostResponse(post),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to upload post.' });
  }
});

router.put('/:postId', verifyToken, async (req, res) => {
  try {
    const caption = req.body.caption !== undefined ? String(req.body.caption).trim() : undefined;

    if (caption === undefined) {
      return res.status(400).json({ error: 'Caption is required.' });
    }

    const post = await MyPost.findOneAndUpdate(
      {
        _id: req.params.postId,
        user: req.userId,
      },
      { caption },
      { new: true }
    );

    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    return res.json({
      message: 'Post updated successfully.',
      post: mapPostResponse(post),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to update post.' });
  }
});

router.delete('/:postId', verifyToken, async (req, res) => {
  try {
    const post = await MyPost.findOneAndDelete({
      _id: req.params.postId,
      user: req.userId,
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    return res.json({ message: 'Post deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to delete post.' });
  }
});

export default router;
