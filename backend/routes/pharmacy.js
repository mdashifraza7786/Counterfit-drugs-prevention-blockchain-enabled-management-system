import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import Box from '../models/Box.js';
import Unit from '../models/Unit.js';
import Batch from '../models/Batch.js';
import { addBlock } from '../utils/blockchain.js';

import User from '../models/User.js';
import { verifySignature } from '../utils/crypto.js';
import { calculateUnitHashRoot } from '../utils/qrGenerator.js';

const router = express.Router();

router.post('/box/receive', protect, authorize('PHARMACY'), async (req, res) => {
  try {
    const { qrData } = req.body;

    if (!qrData || !qrData.boxId || !qrData.signature) {
      return res.status(400).json({ success: false, message: 'Invalid QR data' });
    }

    // 1. Verify targetId matches logged-in user
    if (qrData.targetId !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Box is not addressed to you' });
    }

    // 2. Verify signature
    const packer = await User.findOne({ userId: qrData.packedBy });
    if (!packer) {
      return res.status(404).json({ success: false, message: 'Packer not found' });
    }

    const payload = {
      boxId: qrData.boxId,
      targetRole: qrData.targetRole,
      targetId: qrData.targetId,
      batchId: qrData.batchId,
      totalUnits: qrData.totalUnits,
      unitHashRoot: qrData.unitHashRoot,
      packedBy: qrData.packedBy,
      packedAt: qrData.packedAt
    };

    const isValid = verifySignature(payload, qrData.signature, packer.publicKey);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid QR Signature. Box may be tampered.' });
    }

    // 3. Verify unitHashRoot matches DB
    const box = await Box.findOne({ boxId: qrData.boxId, targetId: req.user.userId, status: 'PENDING_TRANSFER' });
    if (!box) {
      return res.status(404).json({ success: false, message: 'Box not found or not addressed to you' });
    }

    const dbUnitHashRoot = calculateUnitHashRoot(box.unitIds);
    if (dbUnitHashRoot !== qrData.unitHashRoot) {
      return res.status(400).json({ success: false, message: 'Unit mismatch. Box content does not match system records.' });
    }

    box.status = 'RECEIVED';
    box.receivedAt = new Date();
    await box.save();

    await Unit.updateMany(
      { unitId: { $in: box.unitIds } },
      { 
        status: 'AT_PHARMACY',
        currentHolder: req.user.userId,
        currentBoxId: null,
        $push: {
          history: {
            action: 'RECEIVED_BY_PHARMACY',
            actor: req.user.userId,
            actorRole: req.user.role,
            timestamp: new Date(),
            location: req.user.organizationName,
            previousStatus: 'IN_TRANSIT',
            newStatus: 'AT_PHARMACY'
          }
        }
      }
    );

    await addBlock({
      action: 'BOX_RECEIVED_BY_PHARMACY',
      actor: req.user.userId,
      actorRole: req.user.role,
      entityType: 'BOX',
      entityId: qrData.boxId,
      details: {
        unitCount: box.unitIds.length
      }
    });

    res.status(200).json({
      success: true,
      box
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/unit/activate', protect, authorize('PHARMACY'), async (req, res) => {
  try {
    const { unitId } = req.body;

    const unit = await Unit.findOne({ unitId, currentHolder: req.user.userId });
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit not found or not in your inventory' });
    }

    if (unit.status === 'SOLD') {
      return res.status(400).json({ success: false, message: 'Unit already sold' });
    }

    if (unit.status === 'FROZEN') {
      return res.status(400).json({ success: false, message: 'Unit is frozen and cannot be sold' });
    }

    if (unit.status !== 'AT_PHARMACY') {
      return res.status(400).json({ success: false, message: `Unit status is ${unit.status}, cannot activate` });
    }

    const previousStatus = unit.status;
    unit.status = 'SOLD';
    unit.history.push({
      action: 'UNIT_SOLD',
      actor: req.user.userId,
      actorRole: req.user.role,
      timestamp: new Date(),
      location: req.user.organizationName,
      previousStatus,
      newStatus: 'SOLD'
    });
    await unit.save();

    await addBlock({
      action: 'UNIT_SOLD',
      actor: req.user.userId,
      actorRole: req.user.role,
      entityType: 'UNIT',
      entityId: unitId,
      details: {
        batchId: unit.batchId,
        pharmacyName: req.user.organizationName
      }
    });

    res.status(200).json({
      success: true,
      unit
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/pharmacy/boxes', protect, authorize('PHARMACY'), async (req, res) => {
  try {
    const boxes = await Box.find({ targetId: req.user.userId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: boxes.length,
      boxes
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/pharmacy/units', protect, authorize('PHARMACY'), async (req, res) => {
  try {
    const units = await Unit.find({ currentHolder: req.user.userId }).sort({ unitId: 1 });

    res.status(200).json({
      success: true,
      count: units.length,
      units
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
