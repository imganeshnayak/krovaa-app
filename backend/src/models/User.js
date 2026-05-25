import { prisma } from '../config/db.js';
import bcrypt from 'bcryptjs';

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

export const User = prisma.user;
export default User;
