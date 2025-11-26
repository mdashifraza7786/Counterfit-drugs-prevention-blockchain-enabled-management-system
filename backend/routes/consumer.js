import express from 'express';
import Unit from '../models/Unit.js';
import Batch from '../models/Batch.js';
import User from '../models/User.js';
import { parseQRData } from '../utils/qrGenerator.js';
import { verifySignature } from '../utils/crypto.js';

const router = express.Router();

router.get('/verify/unit/:unitId', async (req, res) => {
  try {
    const { unitId } = req.params;

    const unit = await Unit.findOne({ unitId });
    if (!unit) {
      return res.status(404).json({
        success: false,
        status: 'FAKE',
        message: 'Unit not found in system. This may be counterfeit.'
      });
    }

    const batch = await Batch.findOne({ batchId: unit.batchId });
    if (!batch) {
      return res.status(404).json({
        success: false,
        status: 'FAKE',
        message: 'Batch not found. This may be counterfeit.'
      });
    }

    let status = 'GENUINE';
    let message = 'This medicine is authentic and verified.';

    if (unit.status === 'FROZEN' || batch.status === 'FROZEN') {
      status = 'FROZEN';
      message = 'This unit or batch has been frozen by regulators. Do not use.';
    } else if (unit.status === 'SOLD') {
      status = 'ALREADY_SOLD';
      message = 'This unit has already been sold. If you are purchasing this as new, it may be counterfeit.';
    } else if (unit.status === 'DAMAGED') {
      status = 'DAMAGED';
      message = 'This unit has been marked as damaged.';
    }

    const isExpired = new Date(batch.expiry) < new Date();

    res.status(200).json({
      success: true,
      status,
      message,
      unit: {
        unitId: unit.unitId,
        batchId: unit.batchId,
        drugName: batch.drugName,
        manufacturer: batch.manufacturerName,
        manufactureDate: batch.manufactureDate,
        expiry: batch.expiry,
        isExpired,
        currentStatus: unit.status,
        currentHolder: unit.currentHolder
      },
      history: unit.history,
      trace: unit.history.map(h => ({
        action: h.action,
        location: h.location,
        timestamp: h.timestamp,
        status: h.newStatus
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/verify/qr', async (req, res) => {
  try {
    const { qrData } = req.body;

    const parsed = parseQRData(qrData);
    if (!parsed) {
      return res.status(400).json({
        success: false,
        status: 'INVALID',
        message: 'Invalid QR code format'
      });
    }

    if (parsed.type === 'UNIT') {
      const unit = await Unit.findOne({ unitId: parsed.unitId });
      if (!unit) {
        return res.status(404).json({
          success: false,
          status: 'FAKE',
          message: 'Unit not found in system'
        });
      }

      const batch = await Batch.findOne({ batchId: unit.batchId });
      const manufacturer = await User.findOne({ userId: batch.manufacturerId });

      const isValid = verifySignature(
        { type: parsed.type, batchId: parsed.batchId, unitId: parsed.unitId, timestamp: parsed.timestamp },
        parsed.signature,
        manufacturer.publicKey
      );

      if (!isValid) {
        return res.status(400).json({
          success: false,
          status: 'FAKE',
          message: 'Signature verification failed. This may be counterfeit.'
        });
      }

      return res.status(200).json({
        success: true,
        status: 'VERIFIED',
        message: 'QR code is authentic',
        unitId: parsed.unitId,
        batchId: parsed.batchId
      });
    }

    res.status(400).json({
      success: false,
      message: 'Unknown QR type'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
