import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import manufacturerRoutes from './routes/manufacturer.js';
import distributorRoutes from './routes/distributor.js';
import pharmacyRoutes from './routes/pharmacy.js';
import consumerRoutes from './routes/consumer.js';
import regulatorRoutes from './routes/regulator.js';
import utilsRoutes from './routes/utils.js';
import { createGenesisBlock } from './utils/blockchain.js';

dotenv.config();

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected successfully');
    await createGenesisBlock();
    console.log('Genesis block initialized');
  })
  .catch(err => console.error('MongoDB connection error:', err));

app.use('/api/auth', authRoutes);
app.use('/api', manufacturerRoutes);
app.use('/api', distributorRoutes);
app.use('/api', pharmacyRoutes);
app.use('/api', consumerRoutes);
app.use('/api', regulatorRoutes);
app.use('/api', utilsRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Medicine Supply Chain API is running',
    timestamp: new Date()
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
