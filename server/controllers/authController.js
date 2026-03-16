import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';

export const register = async (req, res) => {
  const { name, email, password } = req.body;
  const role = 'employee'; // Hardcoded for security as discussed

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password_hash: passwordHash,
        role
      }
    });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '24h' }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '24h' }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.status(200).json({
      message: 'Login successful',
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true }
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user' });
  }
};

export const logout = (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ message: 'Logged out successfully' });
};
