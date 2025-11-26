import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import LiveQRScanner from '../../components/LiveQRScanner';
import api from '../../utils/api';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

const ActivationScreen = () => {
  const [scannedUnit, setScannedUnit] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isScanning, setIsScanning] = useState(true);
  const navigate = useNavigate();

  const handleQRScan = async (qrData) => {
    try {
      const parsed = JSON.parse(qrData);
      
      if (parsed.type !== 'UNIT') {
        setError('Invalid QR code. Please scan a unit QR code.');
        return;
      }

      setScannedUnit(parsed);
      setIsScanning(false);
      setError('');
    } catch (err) {
      setError('Invalid QR code format');
    }
  };

  const handleActivate = async () => {
    if (!scannedUnit) return;

    try {
      await api.post('/unit/activate', {
        unitId: scannedUnit.unitId
      });
      
      setSuccess(`Unit ${scannedUnit.unitId} activated successfully!`);
      setScannedUnit(null);
      setIsScanning(true);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to activate unit');
    }
  };

  const handleCancel = () => {
    setScannedUnit(null);
    setIsScanning(true);
    setError('');
  };

  return (
    <Layout title="Unit Activation">
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

      {isScanning ? (
        <div className="max-w-2xl mx-auto">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">Scan Unit QR Code</h2>
            <LiveQRScanner onScan={handleQRScan} />
            <div className="mt-6 text-center">
              <button 
                onClick={() => navigate('/pharmacy')}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Cancel and Return
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">Confirm Activation</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600">Unit ID</label>
                  <p className="text-lg font-semibold text-gray-900">{scannedUnit?.unitId}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Batch ID</label>
                  <p className="text-lg font-semibold text-gray-900">{scannedUnit?.batchId}</p>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <button onClick={handleActivate} className="flex-1 btn-primary">
                Activate Unit (Mark as Sold)
              </button>
              <button onClick={handleCancel} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ActivationScreen;
