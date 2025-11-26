# Quick Start Guide

## First Time Setup

1. **Install Dependencies** (already done)
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Start MongoDB**
   ```bash
   mongod
   ```

3. **Seed Test Users**
   ```bash
   cd backend
   node seed.js
   ```

   This creates test users:
   - **Manufacturer**: `manufacturer1` / `password123`
   - **Distributor 1**: `distributor1` / `password123`
   - **Distributor 2**: `distributor2` / `password123`
   - **Pharmacy 1**: `pharmacy1` / `password123`
   - **Pharmacy 2**: `pharmacy2` / `password123`
   - **Regulator**: `regulator1` / `password123`

4. **Start Backend**
   ```bash
   cd backend
   npm run dev
   ```
   Backend runs on: http://localhost:5000

5. **Start Frontend** (in new terminal)
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend runs on: http://localhost:3000

## Quick Start (Windows)

Simply run:
```bash
start.bat
```

## Testing the Complete Flow

### 1. Manufacturer Creates Batch
1. Login as `manufacturer1` / `password123`
2. Go to "Create Batch" tab
3. Create a batch (e.g., Drug: "Paracetamol 500mg", Expiry: future date, Units: 10)
4. Go to "Generate Units" tab
5. Select the batch and generate 10 units
6. Download/print the QR codes

### 2. Manufacturer Packs Units
1. Click "Start Packing"
2. Select a distributor (e.g., `DIS-001`)
3. Scan each unit QR code with your camera
4. Click "Done Packing"
5. Print the Master QR code for the box

### 3. Distributor Receives Box
1. Logout and login as `distributor1` / `password123`
2. Go to "Receive Box" tab
3. Enter the Box ID from step 2
4. Click "Receive Box"
5. View inventory to see received units

### 4. Distributor Repacks for Pharmacy
1. Click "Start Repacking"
2. Select a pharmacy (e.g., `PHA-001`)
3. Scan units from inventory
4. Click "Done Repacking"
5. Print new Master QR

### 5. Pharmacy Receives and Sells
1. Logout and login as `pharmacy1` / `password123`
2. Go to "Receive Box" tab
3. Enter Box ID and receive
4. Click "Activate Unit"
5. Scan unit QR to mark as sold

### 6. Consumer Verifies
1. Go to http://localhost:3000/public-scan
2. Scan any unit QR code
3. View authenticity status and complete trace history

### 7. Regulator Monitors
1. Login as `regulator1` / `password123`
2. View all units and batches
3. Check "Blockchain Ledger" tab
4. Click "Verify Chain Integrity"
5. Freeze suspicious units if needed

## Troubleshooting

### Camera Not Working
- Grant camera permissions in browser
- Use HTTPS in production (camera requires secure context)
- Try different browser (Chrome/Edge recommended)

### MongoDB Connection Error
- Ensure MongoDB is running: `mongod`
- Check connection string in `backend/.env`

### Port Already in Use
- Change PORT in `backend/.env`
- Change port in `frontend/vite.config.js`

## API Testing with cURL

```bash
curl http://localhost:5000/api/health

curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"manufacturer1","password":"password123"}'
```

## Notes

- QR codes must be scanned with actual camera (not screenshots)
- For testing without camera, you can manually enter unit IDs in the code
- Blockchain verification shows complete immutability of the ledger
- All actions are logged to the blockchain ledger
