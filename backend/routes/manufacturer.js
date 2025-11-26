import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { protect, authorize } from '../middleware/auth.js';
import Batch from '../models/Batch.js';
import Unit from '../models/Unit.js';
import Box from '../models/Box.js';
import User from '../models/User.js';
import { generateUnitQR, generateBoxQR } from '../utils/qrGenerator.js';
import { addBlock } from '../utils/blockchain.js';

const router = express.Router();

router.post('/batch/create', protect, authorize('MANUFACTURER'), async (req, res) => {
  try {
    const { drugName, expiry, totalUnits } = req.body;

    const batchId = `BATCH-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

    const batch = await Batch.create({
      batchId,
      drugName,
      manufacturerId: req.user.userId,
      manufacturerName: req.user.organizationName,
      expiry: new Date(expiry),
      totalUnits
    });

    await addBlock({
      action: 'BATCH_CREATED',
      actor: req.user.userId,
      actorRole: req.user.role,
      entityType: 'BATCH',
      entityId: batchId,
      details: {
        drugName,
        totalUnits,
        expiry,
        manufacturerName: req.user.organizationName
      }
    });

    res.status(201).json({
      success: true,
      batch
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/unit/generate', protect, authorize('MANUFACTURER'), async (req, res) => {
  try {
    const { batchId, quantity } = req.body;

    const batch = await Batch.findOne({ batchId, manufacturerId: req.user.userId });
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    const existingUnitsCount = await Unit.countDocuments({ batchId });

    if (existingUnitsCount + parseInt(quantity) > batch.totalUnits) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot generate ${quantity} units. Batch limit is ${batch.totalUnits}, already generated ${existingUnitsCount}. You can only generate ${batch.totalUnits - existingUnitsCount} more units.`
      });
    }

    const manufacturer = await User.findOne({ userId: req.user.userId });
    const privateKey = manufacturer.privateKey;

    const units = [];
    const qrCodes = [];

    for (let i = 0; i < quantity; i++) {
      const unitNumber = existingUnitsCount + i + 1;
      const unitId = `${batchId}-${String(unitNumber).padStart(4, '0')}`;
      
      const { qrData, qrCodeDataURL, signature } = await generateUnitQR(batchId, unitId, privateKey);

      const unit = await Unit.create({
        unitId,
        batchId,
        status: 'CREATED',
        qrData,
        signature,
        currentHolder: req.user.userId,
        history: [{
          action: 'UNIT_CREATED',
          actor: req.user.userId,
          actorRole: req.user.role,
          timestamp: new Date(),
          location: req.user.organizationName,
          previousStatus: null,
          newStatus: 'CREATED'
        }]
      });

      units.push(unit);
      qrCodes.push({
        unitId,
        qrCodeDataURL
      });

      await addBlock({
        action: 'UNIT_CREATED',
        actor: req.user.userId,
        actorRole: req.user.role,
        entityType: 'UNIT',
        entityId: unitId,
        details: {
          batchId,
          drugName: batch.drugName
        }
      });
    }

    res.status(201).json({
      success: true,
      units,
      qrCodes
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/box/start-packing', protect, authorize('MANUFACTURER'), async (req, res) => {
  try {
    const { targetId } = req.body;

    const distributor = await User.findOne({ userId: targetId, role: 'DISTRIBUTOR' });
    if (!distributor) {
      return res.status(404).json({ success: false, message: 'Distributor not found' });
    }

    const boxId = `BOX-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

    const box = await Box.create({
      boxId,
      createdBy: req.user.userId,
      createdByRole: req.user.role,
      targetId: targetId,
      targetRole: 'DISTRIBUTOR',
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

router.post('/box/scan-unit', protect, authorize('MANUFACTURER'), async (req, res) => {
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
      return res.status(404).json({ success: false, message: 'Unit not found or not owned by you' });
    }

    if (unit.status !== 'CREATED') {
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

router.post('/box/close-pack', protect, authorize('MANUFACTURER'), async (req, res) => {
  try {
    const { boxId } = req.body;

    const box = await Box.findOne({ boxId, createdBy: req.user.userId, status: 'PACKING' });
    if (!box) {
      return res.status(404).json({ success: false, message: 'Box not found or already closed' });
    }

    if (box.unitIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Cannot close empty box' });
    }

    const manufacturer = await User.findOne({ userId: req.user.userId });
    
    // Fetch one unit to get batchId
    const firstUnit = await Unit.findOne({ unitId: box.unitIds[0] });
    if (!firstUnit) {
      return res.status(404).json({ success: false, message: 'Unit in box not found' });
    }
    const batchId = firstUnit.batchId;

    const { qrData, qrCodeDataURL, signature } = await generateBoxQR(
      boxId, 
      box.unitIds, 
      'DISTRIBUTOR', 
      box.targetId, 
      batchId, 
      req.user.userId, 
      manufacturer.privateKey
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
            action: 'PACKED_FOR_DISTRIBUTOR',
            actor: req.user.userId,
            actorRole: req.user.role,
            timestamp: new Date(),
            location: req.user.organizationName,
            previousStatus: 'CREATED',
            newStatus: 'IN_TRANSIT'
          }
        }
      }
    );

    await addBlock({
      action: 'BOX_PACKED',
      actor: req.user.userId,
      actorRole: req.user.role,
      entityType: 'BOX',
      entityId: boxId,
      details: {
        targetDistributor: box.targetId,
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

router.get('/manufacturer/boxes', protect, authorize('MANUFACTURER'), async (req, res) => {
  try {
    const boxes = await Box.find({ createdBy: req.user.userId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: boxes.length,
      boxes
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/manufacturer/batches', protect, authorize('MANUFACTURER'), async (req, res) => {
  try {
    const batches = await Batch.find({ manufacturerId: req.user.userId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: batches.length,
      batches
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/manufacturer/units/:batchId', protect, authorize('MANUFACTURER'), async (req, res) => {
  try {
    const { batchId } = req.params;
    
    const batch = await Batch.findOne({ batchId, manufacturerId: req.user.userId });
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    const units = await Unit.find({ batchId }).sort({ unitId: 1 });

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
