import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import Unit from '../models/Unit.js';
import Batch from '../models/Batch.js';
import { verifyChain, getChain } from '../utils/blockchain.js';
import { addBlock } from '../utils/blockchain.js';

const router = express.Router();

router.post('/freeze/unit', protect, authorize('REGULATOR'), async (req, res) => {
  try {
    const { unitId, reason } = req.body;

    const unit = await Unit.findOne({ unitId });
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }

    const previousStatus = unit.status;
    unit.status = 'FROZEN';
    unit.history.push({
      action: 'UNIT_FROZEN',
      actor: req.user.userId,
      actorRole: req.user.role,
      timestamp: new Date(),
      location: 'REGULATORY_AUTHORITY',
      previousStatus,
      newStatus: 'FROZEN'
    });
    await unit.save();

    await addBlock({
      action: 'UNIT_FROZEN',
      actor: req.user.userId,
      actorRole: req.user.role,
      entityType: 'UNIT',
      entityId: unitId,
      details: {
        reason,
        previousStatus
      }
    });

    res.status(200).json({
      success: true,
      message: 'Unit frozen successfully',
      unit
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/freeze/batch', protect, authorize('REGULATOR'), async (req, res) => {
  try {
    const { batchId, reason } = req.body;

    const batch = await Batch.findOne({ batchId });
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    batch.status = 'FROZEN';
    await batch.save();

    await Unit.updateMany(
      { batchId },
      { 
        status: 'FROZEN',
        $push: {
          history: {
            action: 'BATCH_FROZEN',
            actor: req.user.userId,
            actorRole: req.user.role,
            timestamp: new Date(),
            location: 'REGULATORY_AUTHORITY',
            previousStatus: '$status',
            newStatus: 'FROZEN'
          }
        }
      }
    );

    await addBlock({
      action: 'BATCH_FROZEN',
      actor: req.user.userId,
      actorRole: req.user.role,
      entityType: 'BATCH',
      entityId: batchId,
      details: {
        reason
      }
    });

    res.status(200).json({
      success: true,
      message: 'Batch and all units frozen successfully',
      batch
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/ledger/verify', protect, authorize('REGULATOR'), async (req, res) => {
  try {
    const verification = await verifyChain();

    res.status(200).json({
      success: true,
      verification
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/ledger/all', protect, authorize('REGULATOR'), async (req, res) => {
  try {
    const chain = await getChain();

    res.status(200).json({
      success: true,
      totalBlocks: chain.length,
      chain
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/units/all', protect, authorize('REGULATOR'), async (req, res) => {
  try {
    const units = await Unit.find().sort({ createdAt: -1 }).limit(100);

    res.status(200).json({
      success: true,
      count: units.length,
      units
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/batches/all', protect, authorize('REGULATOR'), async (req, res) => {
  try {
    const batches = await Batch.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: batches.length,
      batches
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/unit/:unitId', protect, authorize('REGULATOR'), async (req, res) => {
  try {
    const { unitId } = req.params;
    
    const unit = await Unit.findOne({ unitId });
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }

    const batch = await Batch.findOne({ batchId: unit.batchId });

    res.status(200).json({
      success: true,
      unit,
      batch
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
