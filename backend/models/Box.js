import mongoose from 'mongoose';

const boxSchema = new mongoose.Schema({
  boxId: {
    type: String,
    required: true,
    unique: true
  },
  createdBy: {
    type: String,
    required: true
  },
  createdByRole: {
    type: String,
    required: true
  },
  targetId: {
    type: String,
    required: true
  },
  targetRole: {
    type: String,
    enum: ['DISTRIBUTOR', 'PHARMACY'],
    required: true
  },
  unitIds: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['PACKING', 'PENDING_TRANSFER', 'IN_TRANSIT', 'RECEIVED', 'CLOSED'],
    default: 'PACKING'
  },
  masterQR: {
    type: String,
    default: null
  },
  signature: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  receivedAt: {
    type: Date,
    default: null
  }
});

export default mongoose.model('Box', boxSchema);
