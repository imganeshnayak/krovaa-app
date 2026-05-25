import { prisma } from '../config/db.js';

export const Transaction = prisma.transaction;
export default Transaction;
