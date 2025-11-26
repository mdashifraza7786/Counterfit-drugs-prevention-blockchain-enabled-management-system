import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { protect, authorize } from '../middleware/auth.js';
import Box from '../models/Box.js';
import Unit from '../models/Unit.js';
import User from '../models/User.js';
import { generateBoxQR, parseQRData, calculateUnitHashRoot } from '../utils/qrGenerator.js';

import { verifySignature } from '../utils/crypto.js';
import { addBlock } from '../utils/blockchain.js';

const router = express.Router();

router.post('/box/receive', protect, authorize('DISTRIBUTOR'), async (req, res) => {
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
        status: 'AT_DISTRIBUTOR',
        currentHolder: req.user.userId,
        currentBoxId: null,
        $push: {
          history: {
            action: 'RECEIVED_BY_DISTRIBUTOR',
            actor: req.user.userId,
            actorRole: req.user.role,
            timestamp: new Date(),
            location: req.user.organizationName,
            previousStatus: 'IN_TRANSIT',
            newStatus: 'AT_DISTRIBUTOR'
          }
        }
      }
    );

    await addBlock({
      action: 'BOX_RECEIVED_BY_DISTRIBUTOR',
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

router.post('/box/start-repack', protect, authorize('DISTRIBUTOR'), async (req, res) => {
  try {
    const { targetId } = req.body;

    const pharmacy = await User.findOne({ userId: targetId, role: 'PHARMACY' });
    if (!pharmacy) {
      return res.status(404).json({ success: false, message: 'Pharmacy not found' });
    }

    const boxId = `BOX-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

    const box = await Box.create({
      boxId,
      createdBy: req.user.userId,
      createdByRole: req.user.role,
      targetId: targetId,
      targetRole: 'PHARMACY',
      status: 'PACKING',
      unitIds: []
    });

    res.status(201).json({
      success: true,
      session: box
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/box/start-repacking', protect, authorize('DISTRIBUTOR'), async (req, res) => {
  try {
    const { targetId } = req.body;

    const pharmacy = await User.findOne({ userId: targetId, role: 'PHARMACY' });
    if (!pharmacy) {
      return res.status(404).json({ success: false, message: 'Pharmacy not found' });
    }

    const boxId = `BOX-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

    const box = await Box.create({
      boxId,
      createdBy: req.user.userId,
      createdByRole: req.user.role,
      targetId: targetId,
      targetRole: 'PHARMACY',
      status: 'PACKING',
      unitIds: []
    });

    res.status(201).json({
      success: true,
      session: box
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/box/scan-unit', protect, authorize('DISTRIBUTOR'), async (req, res) => {
  try {
    const { sessionId, unitId } = req.body;

    const box = await Box.findOne({ boxId: sessionId, createdBy: req.user.userId, status: 'PACKING' });
    if (!box) {
      return res.status(404).json({ success: false, message: 'Box not found or already closed' });
    }

    if (box.unitIds.includes(unitId)) {
      return res.status(400).json({ success: false, message: 'Unit already in box (duplicate scan)' });
    }

    const unit = await Unit.findOne({ unitId, currentHolder: req.user.userId });
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit not found or not in your inventory' });
    }

    if (unit.status !== 'AT_DISTRIBUTOR') {
      return res.status(400).json({ success: false, message: `Unit status is ${unit.status}, cannot pack` });
    }

    box.unitIds.push(unitId);
    await box.save();

    unit.currentBoxId = sessionId;
    await unit.save();

    res.status(200).json({
      success: true,
      message: 'Unit added to box',
      scannedUnits: box.unitIds
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/box/scan-unit-repack', protect, authorize('DISTRIBUTOR'), async (req, res) => {
  try {
    const { sessionId, unitId } = req.body;

    const box = await Box.findOne({ boxId: sessionId, createdBy: req.user.userId, status: 'PACKING' });
    if (!box) {
      return res.status(404).json({ success: false, message: 'Box not found or already closed' });
    }

    if (box.unitIds.includes(unitId)) {
      return res.status(400).json({ success: false, message: 'Unit already in box (duplicate scan)' });
    }

    const unit = await Unit.findOne({ unitId, currentHolder: req.user.userId });
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit not found or not in your inventory' });
    }

    if (unit.status !== 'AT_DISTRIBUTOR') {
      return res.status(400).json({ success: false, message: `Unit status is ${unit.status}, cannot pack` });
    }

    box.unitIds.push(unitId);
    await box.save();

    unit.currentBoxId = sessionId;
    await unit.save();

    res.status(200).json({
      success: true,
      message: 'Unit added to box',
      scannedUnits: box.unitIds
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/box/close-repack', protect, authorize('DISTRIBUTOR'), async (req, res) => {
  try {
    const { boxId } = req.body;

    const box = await Box.findOne({ boxId, createdBy: req.user.userId, status: 'PACKING' });
    if (!box) {
      return res.status(404).json({ success: false, message: 'Box not found or already closed' });
    }

    if (box.unitIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Cannot close empty box' });
    }

    const distributor = await User.findOne({ userId: req.user.userId });
    
    // Fetch one unit to get batchId
    const firstUnit = await Unit.findOne({ unitId: box.unitIds[0] });
    if (!firstUnit) {
      return res.status(404).json({ success: false, message: 'Unit in box not found' });
    }
    const batchId = firstUnit.batchId;

    const { qrData, qrCodeDataURL, signature } = await generateBoxQR(
      boxId, 
      box.unitIds, 
      'PHARMACY', 
      box.targetId, 
      batchId, 
      req.user.userId, 
      distributor.privateKey
    );

    box.masterQR = qrData;
    box.signature = signature;
    box.status = 'PENDING_TRANSFER';
    await box.save();

    await Unit.updateMany(
      { unitId: { $in: box.unitIds } },
      { 
        status: 'IN_TRANSIT',
        $push: {
          history: {
            action: 'PACKED_FOR_PHARMACY',
            actor: req.user.userId,
            actorRole: req.user.role,
            timestamp: new Date(),
            location: req.user.organizationName,
            previousStatus: 'AT_DISTRIBUTOR',
            newStatus: 'IN_TRANSIT'
          }
        }
      }
    );

    await addBlock({
      action: 'BOX_REPACKED_FOR_PHARMACY',
      actor: req.user.userId,
      actorRole: req.user.role,
      entityType: 'BOX',
      entityId: boxId,
      details: {
        targetPharmacy: box.targetId,
        unitCount: box.unitIds.length
      }
    });

    res.status(200).json({
      success: true,
      box,
      masterQR: qrCodeDataURL
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/distributor/boxes', protect, authorize('DISTRIBUTOR'), async (req, res) => {
  try {
    const receivedBoxes = await Box.find({ targetId: req.user.userId }).sort({ createdAt: -1 });
    const sentBoxes = await Box.find({ createdBy: req.user.userId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      receivedBoxes,
      sentBoxes
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/distributor/units', protect, authorize('DISTRIBUTOR'), async (req, res) => {
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
