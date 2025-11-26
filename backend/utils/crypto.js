import crypto from 'crypto';

const ALGORITHM = 'sha256';

export const generateKeyPair = () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'secp256k1',
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  return { publicKey, privateKey };
};

export const createSignature = (data, privateKey) => {
  const sign = crypto.createSign(ALGORITHM);
  sign.update(JSON.stringify(data));
  sign.end();
  return sign.sign(privateKey, 'hex');
};

export const verifySignature = (data, signature, publicKey) => {
  try {
    const verify = crypto.createVerify(ALGORITHM);
    verify.update(JSON.stringify(data));
    verify.end();
    return verify.verify(publicKey, signature, 'hex');
  } catch (error) {
    return false;
  }
};

export const hashData = (data) => {
  return crypto.createHash(ALGORITHM).update(JSON.stringify(data)).digest('hex');
};

export const generateHash = (index, timestamp, data, previousHash) => {
  const blockData = `${index}${timestamp}${JSON.stringify(data)}${previousHash}`;
  return crypto.createHash(ALGORITHM).update(blockData).digest('hex');
};
