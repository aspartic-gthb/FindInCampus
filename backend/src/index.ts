import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import itemRoutes from './routes/items';
import claimRoutes from './routes/claims';
import connectDB from './config/db';

dotenv.config();

connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/claims', claimRoutes);

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', source: 'SERVER_DB' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
