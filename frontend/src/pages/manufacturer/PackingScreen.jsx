import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import LiveQRScanner from '../../components/LiveQRScanner';
import QRDisplay from '../../components/QRDisplay';
import api from '../../utils/api';
import { CubeIcon, QrCodeIcon, CheckCircleIcon, ShieldCheckIcon, ArrowDownTrayIcon } from '@heroicons/react/24/solid';

const PackingScreen = () => {
  const [packingSession, setPackingSession] = useState(null);
  const [scannedUnits, setScannedUnits] = useState([]);
  const [batches, setBatches] = useState([]);
  const [distributorId, setDistributorId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [verifiedDistributor, setVerifiedDistributor] = useState(null);
  const [masterQR, setMasterQR] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [verifying, setVerifying] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const response = await api.get('/manufacturer/batches');
      setBatches(response.data.batches);
    } catch (err) {
      console.error('Failed to fetch batches', err);
    }
  };

  const handleVerifyDistributor = async () => {
    if (!distributorId.trim()) {
      setError('Please enter distributor ID');
      return;
    }

    if (!batchId.trim()) {
      setError('Please enter batch ID');
      return;
    }

    setVerifying(true);
    setError('');

    try {
      const response = await api.get(`/users/user/${distributorId}`);
      
      if (response.data.user.role !== 'DISTRIBUTOR') {
        setError('Invalid ID: User is not a distributor');
        setVerifiedDistributor(null);
        return;
      }

      setVerifiedDistributor(response.data.user);
      setSuccess(`Distributor verified: ${response.data.user.organizationName}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Distributor not found');
      setVerifiedDistributor(null);
    } finally {
      setVerifying(false);
    }
  };

  const handleStartPacking = async () => {
    if (!verifiedDistributor) {
      setError('Please verify distributor first');
      return;
    }

    try {
      const response = await api.post('/box/start-packing', {
        targetId: verifiedDistributor.userId
      });
      setPackingSession(response.data.session);
      setError('');
      setSuccess(`Packing session started for batch ${batchId}! Add units from this batch only.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start packing');
    }
  };

  const handleQRScan = async (qrData) => {
    if (!packingSession) return;

    try {
      console.log('Scanned QR Data:', qrData);
      const parsed = JSON.parse(qrData);
      console.log('Parsed QR Data:', parsed);
      
      if (!parsed.type && parsed.unitId) {
        console.log('QR code missing type field, but has unitId. Treating as UNIT type.');
        parsed.type = 'UNIT';
      }
      
      if (parsed.type !== 'UNIT') {
        setError(`Invalid QR code type: "${parsed.type}". Expected "UNIT" type. This appears to be a ${parsed.type || 'unknown'} QR code.`);
        return;
      }

      if (!parsed.unitId) {
        setError('QR code is missing unitId field. Cannot process this QR code.');
        return;
      }

      if (!parsed.unitId.startsWith(batchId)) {
        setError(`Unit ${parsed.unitId} does not belong to batch ${batchId}. Only units from this batch can be added.`);
        return;
      }

      const response = await api.post('/box/scan-unit', {
        sessionId: packingSession.boxId,
        unitId: parsed.unitId
      });

      setScannedUnits(response.data.scannedUnits);
      setSuccess(`Unit ${parsed.unitId} added! Total: ${response.data.scannedUnits.length}`);
      setError('');
      
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('QR Scan Error:', err);
      if (err instanceof SyntaxError) {
        setError(`Invalid QR code format. The QR code does not contain valid JSON data. Raw data: ${qrData.substring(0, 100)}...`);
      } else {
        setError(err.response?.data?.message || 'Failed to scan unit');
      }
    }
  };

  const handleClosePacking = async () => {
    if (!packingSession) return;

    try {
      const response = await api.post('/box/close-pack', {
        boxId: packingSession.boxId
      });

      setMasterQR({
        qrData: response.data.box.masterQR, // The pipe-separated string
        qrCodeDataURL: response.data.masterQR, // The image data URL
        boxId: response.data.box.boxId
      });
      setSuccess(`Box ${response.data.box.boxId} created with ${scannedUnits.length} units!`);
      setPackingSession(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to close packing');
    }
  };

  const handleReset = () => {
    setPackingSession(null);
    setScannedUnits([]);
    setMasterQR(null);
    setDistributorId('');
    setBatchId('');
    setVerifiedDistributor(null);
    setError('');
    setSuccess('');
  };

  return (
    <Layout title="Packing Station">
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
          <CheckCircleIcon className="h-5 w-5 mr-2" />
          {success}
        </div>
      )}

      {!packingSession && !masterQR && (
        <div className="max-w-2xl">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Start New Packing Session</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Batch
                </label>
                <select
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  className="input-field"
                  disabled={verifiedDistributor}
                >
                  <option value="">-- Select Batch --</option>
                  {batches.map(batch => (
                    <option key={batch.batchId} value={batch.batchId}>
                      {batch.batchId} - {batch.drugName} (Exp: {new Date(batch.expiry).toLocaleDateString()})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Only units from this batch will be allowed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Distributor ID
                </label>
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={distributorId}
                    onChange={(e) => {
                      setDistributorId(e.target.value);
                      setVerifiedDistributor(null);
                    }}
                    placeholder="Enter distributor unique ID (e.g., DIS-001)"
                    className="input-field flex-1"
                    disabled={verifiedDistributor}
                  />
                  {!verifiedDistributor ? (
                    <button
                      onClick={handleVerifyDistributor}
                      disabled={verifying}
                      className="btn-primary whitespace-nowrap"
                    >
                      {verifying ? 'Verifying...' : 'Verify'}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setDistributorId('');
                        setBatchId('');
                        setVerifiedDistributor(null);
                      }}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Change
                    </button>
                  )}
                </div>
              </div>

              {verifiedDistributor && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <ShieldCheckIcon className="h-5 w-5 text-green-600 mr-2" />
                    <span className="font-semibold text-green-900">Verified Distributor</span>
                  </div>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Organization:</span> {verifiedDistributor.organizationName}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">ID:</span> {verifiedDistributor.userId}
                  </p>
                </div>
              )}

              <button
                onClick={handleStartPacking}
                disabled={!verifiedDistributor}
                className="w-full btn-primary"
              >
                Start Packing
              </button>
            </div>
          </div>
        </div>
      )}

      {packingSession && !masterQR && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <QrCodeIcon className="h-6 w-6 mr-2 text-blue-600" />
              Scan Units
            </h2>
            <LiveQRScanner onScan={handleQRScan} />
            <div className="mt-4 text-center">
              <button onClick={handleClosePacking} disabled={scannedUnits.length === 0} className="btn-secondary">
                Done Packing ({scannedUnits.length} units)
              </button>
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <CubeIcon className="h-6 w-6 mr-2 text-green-600" />
              Scanned Units ({scannedUnits.length})
            </h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-gray-700">
                Target: {verifiedDistributor?.organizationName}
              </p>
              <p className="text-xs text-gray-600">Session ID: {packingSession.boxId}</p>
            </div>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {scannedUnits.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No units scanned yet</p>
              ) : (
                scannedUnits.map((unitId, index) => (
                  <div key={unitId} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center">
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded mr-3">
                      {index + 1}
                    </span>
                    <span className="text-sm font-mono text-gray-900">{unitId}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {masterQR && (
        <div className="max-w-2xl">
          <div className="card text-center">
            <div className="mb-6">
              <CheckCircleIcon className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Box Created Successfully!</h2>
              <p className="text-gray-600">Print or save this Master QR code for the box</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6 flex flex-col items-center">
              <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
                <QRDisplay data={masterQR.qrData} />
              </div>
              
              <p className="mt-2 text-lg font-bold text-gray-900">Box ID: {masterQR.boxId}</p>
              <p className="text-sm text-gray-600">Units: {scannedUnits.length}</p>
              <p className="text-sm text-gray-600">Distributor: {verifiedDistributor?.organizationName}</p>

              <a 
                href={masterQR.qrCodeDataURL} 
                download={`${masterQR.boxId}.png`}
                className="mt-6 inline-flex items-center btn-secondary"
              >
                <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                Download QR Code
              </a>
            </div>

            <div className="flex space-x-4">
              <button onClick={handleReset} className="flex-1 btn-primary">
                Pack Another Box
              </button>
              <button onClick={() => navigate('/manufacturer')} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors">
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default PackingScreen;
