import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { generateKeyPair } from '../utils/crypto.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { username, password, role, organizationName } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    let publicKey, privateKey;
    if (role === 'MANUFACTURER') {
      const keyPair = generateKeyPair();
      publicKey = keyPair.publicKey;
      privateKey = keyPair.privateKey;
    }

    const userId = `${role.substring(0, 3).toUpperCase()}-${Date.now()}`;

    const user = await User.create({
      userId,
      username,
      password,
      role,
      organizationName,
      publicKey,
      privateKey
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        userId: user.userId,
        username: user.username,
        role: user.role,
        organizationName: user.organizationName
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Please provide username and password' });
    }

    const user = await User.findOne({ username }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        userId: user.userId,
        username: user.username,
        role: user.role,
        organizationName: user.organizationName
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password -privateKey');

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Not authorized' });
  }
});

export default router;
