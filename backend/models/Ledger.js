import mongoose from 'mongoose';

const ledgerSchema = new mongoose.Schema({
  index: {
    type: Number,
    required: true,
    unique: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  data: {
    action: String,
    actor: String,
    actorRole: String,
    entityType: String,
    entityId: String,
    details: mongoose.Schema.Types.Mixed
  },
  previousHash: {
    type: String,
    required: true
  },
  hash: {
    type: String,
    required: true,
    unique: true
  },
  signature: {
    type: String,
    required: true
  }
}, {
  timestamps: false
});

ledgerSchema.index({ index: 1 });
ledgerSchema.index({ hash: 1 });

export default mongoose.model('Ledger', ledgerSchema);
