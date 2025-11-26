import mongoose from 'mongoose';

const batchSchema = new mongoose.Schema({
  batchId: {
    type: String,
    required: true,
    unique: true
  },
  drugName: {
    type: String,
    required: true
  },
  manufacturerId: {
    type: String,
    required: true
  },
  manufacturerName: {
    type: String,
    required: true
  },
  expiry: {
    type: Date,
    required: true
  },
  totalUnits: {
    type: Number,
    required: true
  },
  manufactureDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'FROZEN'],
    default: 'ACTIVE'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Batch', batchSchema);
