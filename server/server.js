import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import resourceRoutes from './routes/resources.js';
import bookingRoutes from './routes/bookings.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/bookings', bookingRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'ResourceFlow API is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
