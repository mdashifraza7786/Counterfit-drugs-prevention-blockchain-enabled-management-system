# Medicine Supply Chain Traceability System

A complete blockchain-inspired medicine supply chain traceability system with mock blockchain implementation using cryptographic techniques for demonstration purposes.

## Features

- **Mock Blockchain Ledger**: Append-only, hash-linked ledger with SHA256 hashing and ECDSA signatures
- **Role-Based Access Control**: Manufacturer, Distributor, Pharmacy, Regulator, and Consumer roles
- **Live QR Scanning**: Real-time camera-based QR code scanning with beep feedback
- **Complete Supply Chain Tracking**: Track medicine units from manufacturing to consumer
- **Cryptographic Verification**: Digital signatures for authenticity verification
- **Immutability Verification**: Blockchain integrity verification for regulators

## Tech Stack

### Backend
- Node.js + Express
- MongoDB
- JWT Authentication
- Node Crypto (SHA256 + ECDSA)
- QRCode generation

### Frontend
- React.js + Vite
- React Router
- Axios
- html5-qrcode (live camera scanning)
- qrcode (QR generation)

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (running locally or remote instance)
- Modern web browser with camera support

## Installation

### 1. Clone the repository
```bash
cd d:/projects/counterfit-drug-prevention
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` file with your configuration:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/medicine-supply-chain
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
NODE_ENV=development
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

### 4. Start MongoDB
Make sure MongoDB is running on your system:
```bash
mongod
```

### 5. Start Backend Server
```bash
cd backend
npm run dev
```
Backend will run on `http://localhost:5000`

### 6. Start Frontend Development Server
```bash
cd frontend
npm run dev
```
Frontend will run on `http://localhost:3000`

## Creating Test Users

Use the registration endpoint to create users for each role:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "manufacturer1",
    "password": "password123",
    "role": "MANUFACTURER",
    "organizationName": "PharmaCorp Manufacturing"
  }'
```

Create users for each role:
- MANUFACTURER
- DISTRIBUTOR
- PHARMACY
- REGULATOR

## Usage Flow

### 1. Manufacturer
1. Login with manufacturer credentials
2. Create a new batch (drug name, expiry, total units)
3. Generate units with QR codes
4. Start packing session
5. Select target distributor
6. Scan unit QR codes with live camera
7. Close packing to generate master box QR

### 2. Distributor
1. Login with distributor credentials
2. Receive box by entering box ID
3. View inventory
4. Start repacking for pharmacy
5. Scan units to add to new box
6. Close repacking to generate new master QR

### 3. Pharmacy
1. Login with pharmacy credentials
2. Receive box from distributor
3. View inventory
4. Activate units on sale by scanning QR codes

### 4. Consumer (Public)
1. Navigate to `/public-scan`
2. Scan medicine unit QR code
3. View authenticity status and complete trace history

### 5. Regulator
1. Login with regulator credentials
2. View all units and batches
3. Freeze suspicious units or batches
4. Verify blockchain ledger integrity
5. View complete blockchain history

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Manufacturer
- `POST /api/batch/create` - Create batch
- `POST /api/unit/generate` - Generate units
- `POST /api/box/start-packing` - Start packing
- `POST /api/box/scan-unit` - Add unit to box
- `POST /api/box/close-pack` - Close packing
- `GET /api/manufacturer/boxes` - Get all boxes
- `GET /api/manufacturer/batches` - Get all batches
- `GET /api/manufacturer/units/:batchId` - Get units by batch

### Distributor
- `POST /api/box/receive` - Receive box
- `POST /api/box/start-repack` - Start repacking
- `POST /api/box/scan-unit` - Add unit to repack box
- `POST /api/box/close-repack` - Close repacking
- `GET /api/distributor/boxes` - Get all boxes
- `GET /api/distributor/units` - Get inventory

### Pharmacy
- `POST /api/box/receive` - Receive box
- `POST /api/unit/activate` - Activate unit (mark as sold)
- `GET /api/pharmacy/boxes` - Get all boxes
- `GET /api/pharmacy/units` - Get inventory

### Consumer
- `GET /api/verify/unit/:unitId` - Verify unit authenticity
- `POST /api/verify/qr` - Verify QR signature

### Regulator
- `POST /api/freeze/unit` - Freeze unit
- `POST /api/freeze/batch` - Freeze batch
- `GET /api/ledger/verify` - Verify blockchain integrity
- `GET /api/ledger/all` - Get complete ledger
- `GET /api/units/all` - Get all units
- `GET /api/batches/all` - Get all batches

### Utilities
- `GET /api/users?role=ROLE` - Get users by role
- `GET /api/health` - Health check

## Mock Blockchain Implementation

This system implements a **mock blockchain** for demonstration purposes:

1. **Genesis Block**: Automatically created on server start
2. **Hash Linking**: Each block contains hash of previous block
3. **SHA256 Hashing**: Cryptographic hashing for block integrity
4. **ECDSA Signatures**: Digital signatures for authenticity
5. **Append-Only**: No updates or deletes allowed
6. **Chain Verification**: Regulators can verify entire chain integrity

### Block Structure
```javascript
{
  index: Number,
  timestamp: Date,
  data: {
    action: String,
    actor: String,
    actorRole: String,
    entityType: String,
    entityId: String,
    details: Object
  },
  previousHash: String,
  hash: String,
  signature: String
}
```

## QR Code Structure

### Unit QR Code
```json
{
  "type": "UNIT",
  "batchId": "BATCH-1234567890-ABCD1234",
  "unitId": "BATCH-1234567890-ABCD1234-0001",
  "timestamp": 1234567890,
  "signature": "hex_signature"
}
```

### Box QR Code
```json
{
  "type": "BOX",
  "boxId": "BOX-1234567890-ABCD1234",
  "unitCount": 50,
  "timestamp": 1234567890,
  "signature": "hex_signature"
}
```

## Camera Permissions

The live QR scanning feature requires camera access. Users must grant camera permissions when prompted by the browser.

## Security Notes

This is a **demonstration system** and should NOT be used in production without:
- Proper key management (use HSM or key vault)
- HTTPS/TLS encryption
- Rate limiting
- Input validation and sanitization
- Production-grade authentication
- Database encryption
- Audit logging
- Compliance with regulations (HIPAA, GDPR, etc.)

## License

MIT

## Support

For issues or questions, please create an issue in the repository.
