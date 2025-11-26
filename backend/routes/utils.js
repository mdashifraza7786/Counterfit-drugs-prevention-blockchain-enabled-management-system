import express from 'express';
import User from '../models/User.js';

const router = express.Router();

router.get('/users', async (req, res) => {
  try {
    const { role } = req.query;
    
    const query = role ? { role } : {};
    const users = await User.find(query).select('userId username role organizationName');

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findOne({ userId }).select('userId username role organizationName publicKey');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/users/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findOne({ userId }).select('userId username role organizationName publicKey');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


import { generateKeyPair } from '../utils/crypto.js';

router.post('/seed', async (req, res) => {
  try {
    await User.deleteMany({});
    console.log('Cleared existing users');

    const keyPair = generateKeyPair();

    const users = [
      {
        userId: 'MAN-001',
        username: 'manufacturer1',
        password: 'password123',
        role: 'MANUFACTURER',
        organizationName: 'PharmaCorp Manufacturing',
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey
      },
      {
        userId: 'DIS-001',
        username: 'distributor1',
        password: 'password123',
        role: 'DISTRIBUTOR',
        organizationName: 'MediDistribute Inc'
      },
      {
        userId: 'DIS-002',
        username: 'distributor2',
        password: 'password123',
        role: 'DISTRIBUTOR',
        organizationName: 'HealthSupply Co'
      },
      {
        userId: 'PHA-001',
        username: 'pharmacy1',
        password: 'password123',
        role: 'PHARMACY',
        organizationName: 'City Pharmacy'
      },
      {
        userId: 'PHA-002',
        username: 'pharmacy2',
        password: 'password123',
        role: 'PHARMACY',
        organizationName: 'HealthPlus Pharmacy'
      },
      {
        userId: 'REG-001',
        username: 'regulator1',
        password: 'password123',
        role: 'REGULATOR',
        organizationName: 'Drug Regulatory Authority'
      }
    ];

    for (const userData of users) {
      await User.create(userData);
    }

    res.status(200).json({ 
      success: true, 
      message: 'Database seeded successfully',
      users: users.map(u => ({ username: u.username, role: u.role, password: 'password123' }))
    });
  } catch (error) {
    console.error('Seed failed:', error);
    res.status(500).json({ success: false, message: 'Seeding failed: ' + error.message });
  }
});

export default router;
