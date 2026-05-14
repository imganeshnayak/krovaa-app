import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

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

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    fullName: {
      type: String,
      default: 'User',
    },
    location: {
      type: String,
      default: '',
    },
    city: {
      type: String,
      default: '',
      trim: true,
    },
    pincode: {
      type: String,
      default: '',
      trim: true,
    },
    phoneNumber: {
      type: String,
      default: '',
      trim: true,
    },
    age: {
      type: Number,
      default: null,
      min: 0,
      max: 120,
    },
    gender: {
      type: String,
      default: '',
      trim: true,
    },
    profession: {
      type: String,
      enum: PROFESSION_OPTIONS,
      default: 'none',
    },
    bio: {
      type: String,
      default: '',
    },
    avatar: {
      type: String,
      default: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200',
    },
    skills: {
      type: [String],
      default: [],
    },
    stats: {
      jobsDone: {
        type: Number,
        default: 0,
      },
      reviews: {
        type: Number,
        default: 0,
      },
      earned: {
        type: Number,
        default: 0,
      },
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 10);
  return next();
});

userSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.password);
};

export default mongoose.model('User', userSchema);
