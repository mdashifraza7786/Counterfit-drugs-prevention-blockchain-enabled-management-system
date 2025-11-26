import QRCode from 'qrcode';
import crypto from 'crypto';
import { createSignature } from './crypto.js';

export const generateUnitQR = async (batchId, unitId, privateKey) => {
  const qrPayload = {
    type: 'UNIT',
    batchId,
    unitId,
    timestamp: Date.now()
  };

  const signature = createSignature(qrPayload, privateKey);
  
  const qrData = JSON.stringify({
    ...qrPayload,
    signature
  });

  const qrCodeDataURL = await QRCode.toDataURL(qrData, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    width: 300,
    margin: 1
  });

  return {
    qrData,
    qrCodeDataURL,
    signature
  };
};

export const calculateUnitHashRoot = (unitIds) => {
  const sortedUnits = [...unitIds].sort();
  const concatenated = sortedUnits.join('');
  return crypto.createHash('sha256').update(concatenated).digest('hex');
};

export const generateBoxQR = async (boxId, unitIds, targetRole, targetId, batchId, packedBy, privateKey) => {
  const unitHashRoot = calculateUnitHashRoot(unitIds);
  const packedAt = new Date().toISOString();

  const qrPayload = {
    boxId,
    targetRole,
    targetId,
    batchId,
    totalUnits: unitIds.length,
    unitHashRoot,
    packedBy,
    packedAt
  };

  const signature = createSignature(qrPayload, privateKey);
  
  // Format: boxId|targetRole|targetId|batchId|totalUnits|unitHashRoot|packedBy|packedAt|signature
  const qrData = `${boxId}|${targetRole}|${targetId}|${batchId}|${unitIds.length}|${unitHashRoot}|${packedBy}|${packedAt}|${signature}`;

  const qrCodeDataURL = await QRCode.toDataURL(qrData, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    width: 400,
    margin: 1
  });

  return {
    qrData,
    qrCodeDataURL,
    signature,
    payload: qrPayload
  };
};

export const parseQRData = (qrString) => {
  try {
    // Try parsing as JSON first (for legacy or Unit QRs)
    if (qrString.startsWith('{')) {
      return JSON.parse(qrString);
    }

    // Parse as pipe-separated Master QR
    const parts = qrString.split('|');
    if (parts.length >= 9) {
      return {
        type: 'BOX',
        boxId: parts[0],
        targetRole: parts[1],
        targetId: parts[2],
        batchId: parts[3],
        totalUnits: parseInt(parts[4]),
        unitHashRoot: parts[5],
        packedBy: parts[6],
        packedAt: parts[7],
        signature: parts[8]
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
};
