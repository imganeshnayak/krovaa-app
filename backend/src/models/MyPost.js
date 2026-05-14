import mongoose from 'mongoose';

const myPostSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    mediaUrl: {
      type: String,
      required: true,
      trim: true,
    },
    mediaType: {
      type: String,
      enum: ['image', 'video'],
      required: true,
    },
    caption: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

export default mongoose.model('MyPost', myPostSchema);
