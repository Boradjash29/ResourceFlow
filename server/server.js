import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';
import resourceRoutes from './routes/resources.js';
import bookingRoutes from './routes/bookings.js';
import analyticsRoutes from './routes/analytics.js';
import notificationRoutes from './routes/notifications.js';
import chatRoutes from './routes/chat.js';
import adminRoutes from './routes/admin.js';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { message: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(limiter);
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'ResourceFlow API is running' });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
