import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import { generateKeyPair } from './utils/crypto.js';

dotenv.config();

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');

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
      console.log(`Created user: ${userData.username} (${userData.role})`);
    }

    console.log('\nSeed completed successfully!');
    console.log('\nTest Credentials:');
    console.log('==================');
    users.forEach(u => {
      console.log(`${u.role}: ${u.username} / password123`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

seedUsers();
