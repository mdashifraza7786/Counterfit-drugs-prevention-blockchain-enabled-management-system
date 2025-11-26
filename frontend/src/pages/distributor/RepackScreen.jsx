import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import LiveQRScanner from '../../components/LiveQRScanner';
import QRDisplay from '../../components/QRDisplay';
import api from '../../utils/api';
import { CubeIcon, QrCodeIcon, CheckCircleIcon, ShieldCheckIcon, ArrowDownTrayIcon } from '@heroicons/react/24/solid';

const RepackScreen = () => {
  const [repackSession, setRepackSession] = useState(null);
  const [scannedUnits, setScannedUnits] = useState([]);
  const [pharmacyId, setPharmacyId] = useState('');
  const [verifiedPharmacy, setVerifiedPharmacy] = useState(null);
  const [masterQR, setMasterQR] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [verifying, setVerifying] = useState(false);
  const navigate = useNavigate();

  const handleVerifyPharmacy = async () => {
    if (!pharmacyId.trim()) {
      setError('Please enter pharmacy ID');
      return;
    }

    setVerifying(true);
    setError('');

    try {
      const response = await api.get(`/users/user/${pharmacyId}`);
      
      if (response.data.user.role !== 'PHARMACY') {
        setError('Invalid ID: User is not a pharmacy');
        setVerifiedPharmacy(null);
        return;
      }

      setVerifiedPharmacy(response.data.user);
      setSuccess(`Pharmacy verified: ${response.data.user.organizationName}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Pharmacy not found');
      setVerifiedPharmacy(null);
    } finally {
      setVerifying(false);
    }
  };

  const handleStartRepacking = async () => {
    if (!verifiedPharmacy) {
      setError('Please verify pharmacy first');
      return;
    }

    try {
      const response = await api.post('/box/start-repacking', {
        targetId: verifiedPharmacy.userId
      });
      setRepackSession(response.data.session);
      setError('');
      setSuccess('Repacking session started! Scan units to add to box.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start repacking');
    }
  };

  const handleQRScan = async (qrData) => {
    if (!repackSession) return;

    try {
      const parsed = JSON.parse(qrData);
      
      if (parsed.type !== 'UNIT') {
        setError('Invalid QR code. Please scan a unit QR code.');
        return;
      }

      const response = await api.post('/box/scan-unit-repack', {
        sessionId: repackSession.sessionId,
        unitId: parsed.unitId
      });

      setScannedUnits(response.data.scannedUnits);
      setSuccess(`Unit ${parsed.unitId} added! Total: ${response.data.scannedUnits.length}`);
      setError('');
      
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to scan unit');
    }
  };

  const handleCloseRepacking = async () => {
    if (!repackSession) return;

    try {
      const response = await api.post('/box/close-repacking', {
        sessionId: repackSession.sessionId
      });

      setMasterQR({
        qrData: response.data.box.masterQR, // The pipe-separated string
        qrCodeDataURL: response.data.masterQR, // The image data URL
        boxId: response.data.box.boxId
      });
      setSuccess(`Box ${response.data.box.boxId} created with ${scannedUnits.length} units!`);
      setRepackSession(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to close repacking');
    }
  };

  const handleReset = () => {
    setRepackSession(null);
    setScannedUnits([]);
    setMasterQR(null);
    setPharmacyId('');
    setVerifiedPharmacy(null);
    setError('');
    setSuccess('');
  };

  return (
    <Layout title="Repacking Station">
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

      {!repackSession && !masterQR && (
        <div className="max-w-2xl">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Start New Repacking Session</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pharmacy ID
                </label>
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={pharmacyId}
                    onChange={(e) => {
                      setPharmacyId(e.target.value);
                      setVerifiedPharmacy(null);
                    }}
                    placeholder="Enter pharmacy unique ID (e.g., PHA-001)"
                    className="input-field flex-1"
                    disabled={verifiedPharmacy}
                  />
                  {!verifiedPharmacy ? (
                    <button
                      onClick={handleVerifyPharmacy}
                      disabled={verifying}
                      className="btn-primary whitespace-nowrap"
                    >
                      {verifying ? 'Verifying...' : 'Verify'}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setPharmacyId('');
                        setVerifiedPharmacy(null);
                      }}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Change
                    </button>
                  )}
                </div>
              </div>

              {verifiedPharmacy && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <ShieldCheckIcon className="h-5 w-5 text-green-600 mr-2" />
                    <span className="font-semibold text-green-900">Verified Pharmacy</span>
                  </div>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Organization:</span> {verifiedPharmacy.organizationName}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">ID:</span> {verifiedPharmacy.userId}
                  </p>
                </div>
              )}

              <button
                onClick={handleStartRepacking}
                disabled={!verifiedPharmacy}
                className="w-full btn-primary"
              >
                Start Repacking
              </button>
            </div>
          </div>
        </div>
      )}

      {repackSession && !masterQR && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <QrCodeIcon className="h-6 w-6 mr-2 text-blue-600" />
              Scan Units
            </h2>
            <LiveQRScanner onScan={handleQRScan} />
            <div className="mt-4 text-center">
              <button onClick={handleCloseRepacking} disabled={scannedUnits.length === 0} className="btn-secondary">
                Done Repacking ({scannedUnits.length} units)
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
                Target: {verifiedPharmacy?.organizationName}
              </p>
              <p className="text-xs text-gray-600">Session ID: {repackSession.sessionId}</p>
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
              <p className="text-sm text-gray-600">Pharmacy: {verifiedPharmacy?.organizationName}</p>

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
                Repack Another Box
              </button>
              <button onClick={() => navigate('/distributor')} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors">
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default RepackScreen;
