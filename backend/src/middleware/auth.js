import jwt from 'jsonwebtoken';

export function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided.' });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }

    const decoded = jwt.verify(token, secret);
    // Ensure userId is an integer because Prisma expects Int IDs
    const parsedId = parseInt(decoded.id, 10);
    if (Number.isNaN(parsedId)) {
      return res.status(401).json({ error: 'Invalid token payload: id is not a number.' });
    }
    req.userId = parsedId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}
