import Ledger from '../models/Ledger.js';
import { generateHash, createSignature, generateKeyPair } from './crypto.js';

let GENESIS_KEY_PAIR = null;

const getGenesisKeyPair = () => {
  if (!GENESIS_KEY_PAIR) {
    GENESIS_KEY_PAIR = generateKeyPair();
  }
  return GENESIS_KEY_PAIR;
};

export const createGenesisBlock = async () => {
  const existingGenesis = await Ledger.findOne({ index: 0 });
  if (existingGenesis) {
    return existingGenesis;
  }

  const genesisData = {
    action: 'GENESIS',
    actor: 'SYSTEM',
    actorRole: 'SYSTEM',
    entityType: 'BLOCKCHAIN',
    entityId: 'GENESIS',
    details: {
      message: 'Medicine Supply Chain Blockchain Initialized'
    }
  };

  const timestamp = new Date();
  const previousHash = '0';
  const hash = generateHash(0, timestamp, genesisData, previousHash);
  
  const keyPair = getGenesisKeyPair();
  const signature = createSignature({ index: 0, timestamp, data: genesisData, hash }, keyPair.privateKey);

  const genesisBlock = new Ledger({
    index: 0,
    timestamp,
    data: genesisData,
    previousHash,
    hash,
    signature
  });

  await genesisBlock.save();
  return genesisBlock;
};

export const addBlock = async (data, privateKey = null) => {
  const lastBlock = await Ledger.findOne().sort({ index: -1 });
  
  if (!lastBlock) {
    await createGenesisBlock();
    return addBlock(data, privateKey);
  }

  const newIndex = lastBlock.index + 1;
  const timestamp = new Date();
  const previousHash = lastBlock.hash;
  const hash = generateHash(newIndex, timestamp, data, previousHash);
  
  const keyToUse = privateKey || getGenesisKeyPair().privateKey;
  const signature = createSignature({ index: newIndex, timestamp, data, hash }, keyToUse);

  const newBlock = new Ledger({
    index: newIndex,
    timestamp,
    data,
    previousHash,
    hash,
    signature
  });

  await newBlock.save();
  return newBlock;
};

export const verifyChain = async () => {
  const blocks = await Ledger.find().sort({ index: 1 });
  
  if (blocks.length === 0) {
    return { valid: false, message: 'No blocks in chain' };
  }

  for (let i = 1; i < blocks.length; i++) {
    const currentBlock = blocks[i];
    const previousBlock = blocks[i - 1];

    if (currentBlock.previousHash !== previousBlock.hash) {
      return {
        valid: false,
        message: `Invalid chain at block ${i}: previousHash mismatch`,
        blockIndex: i
      };
    }

    const recalculatedHash = generateHash(
      currentBlock.index,
      currentBlock.timestamp,
      currentBlock.data,
      currentBlock.previousHash
    );

    if (currentBlock.hash !== recalculatedHash) {
      return {
        valid: false,
        message: `Invalid chain at block ${i}: hash mismatch`,
        blockIndex: i
      };
    }
  }

  return {
    valid: true,
    message: 'Blockchain is valid',
    totalBlocks: blocks.length
  };
};

export const getChain = async () => {
  return await Ledger.find().sort({ index: 1 });
};
