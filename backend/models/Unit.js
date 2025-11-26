import mongoose from 'mongoose';

const unitSchema = new mongoose.Schema({
  unitId: {
    type: String,
    required: true,
    unique: true
  },
  batchId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['CREATED', 'IN_TRANSIT', 'AT_DISTRIBUTOR', 'AT_PHARMACY', 'SOLD', 'FROZEN', 'DAMAGED'],
    default: 'CREATED'
  },
  qrData: {
    type: String,
    required: true
  },
  signature: {
    type: String,
    required: true
  },
  currentHolder: {
    type: String,
    default: null
  },
  currentBoxId: {
    type: String,
    default: null
  },
  history: [{
    action: String,
    actor: String,
    actorRole: String,
    timestamp: Date,
    location: String,
    previousStatus: String,
    newStatus: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Unit', unitSchema);
