import jwt from 'jsonwebtoken';

export const authMiddleware = (req, res, next) => {
  // Try to get token from cookie first, then fall back to header
  const token = req.cookies.token || req.header('Authorization')?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};
