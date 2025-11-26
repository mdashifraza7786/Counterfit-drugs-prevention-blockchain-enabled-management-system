import { useState } from 'react';
import LiveQRScanner from '../../components/LiveQRScanner';
import api from '../../utils/api';
import { ShieldCheckIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';

const PublicScan = () => {
  const [verificationResult, setVerificationResult] = useState(null);
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(true);

  const handleQRScan = async (qrData) => {
    try {
      const parsed = JSON.parse(qrData);
      
      if (parsed.type !== 'UNIT') {
        setError('Invalid QR code. Please scan a medicine unit QR code.');
        return;
      }

      const response = await api.get(`/verify/unit/${parsed.unitId}`);
      setVerificationResult(response.data);
      setIsScanning(false);
      setError('');
    } catch (err) {
      if (err.response?.data) {
        setVerificationResult(err.response.data);
        setIsScanning(false);
      } else {
        setError('Failed to verify unit. Please try again.');
      }
    }
  };

  const handleScanAgain = () => {
    setVerificationResult(null);
    setIsScanning(true);
    setError('');
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'GENUINE': return <CheckCircleIcon className="h-16 w-16 text-green-600" />;
      case 'FAKE': return <XCircleIcon className="h-16 w-16 text-red-600" />;
      case 'FROZEN': return <ExclamationTriangleIcon className="h-16 w-16 text-blue-600" />;
      case 'ALREADY_SOLD': return <ExclamationTriangleIcon className="h-16 w-16 text-yellow-600" />;
      default: return <ShieldCheckIcon className="h-16 w-16 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'GENUINE': return 'bg-green-50 border-green-200';
      case 'FAKE': return 'bg-red-50 border-red-200';
      case 'FROZEN': return 'bg-blue-50 border-blue-200';
      case 'ALREADY_SOLD': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <ShieldCheckIcon className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Medicine Verification</h1>
          <p className="text-lg text-gray-600">Scan QR code to verify authenticity</p>
        </div>

        {error && (
          <div className="max-w-2xl mx-auto mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {isScanning ? (
          <div className="max-w-2xl mx-auto">
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">Point camera at QR code</h2>
              <LiveQRScanner onScan={handleQRScan} />
            </div>
          </div>
        ) : verificationResult && (
          <div className="max-w-4xl mx-auto">
            <div className={`card border-2 ${getStatusColor(verificationResult.status)} mb-6`}>
              <div className="text-center mb-6">
                {getStatusIcon(verificationResult.status)}
                <h2 className="text-3xl font-bold text-gray-900 mt-4 mb-2">
                  {verificationResult.status?.replace('_', ' ')}
                </h2>
                <p className="text-lg text-gray-700">{verificationResult.message}</p>
              </div>
            </div>

            {verificationResult.unit && (
              <div className="card mb-6">
                <h3 className="text-2xl font-semibold text-gray-900 mb-6">Medicine Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Drug Name</label>
                    <p className="text-lg font-semibold text-gray-900">{verificationResult.unit.drugName}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Manufacturer</label>
                    <p className="text-lg font-semibold text-gray-900">{verificationResult.unit.manufacturer}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Batch ID</label>
                    <p className="text-sm font-mono text-gray-900">{verificationResult.unit.batchId}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Unit ID</label>
                    <p className="text-sm font-mono text-gray-900">{verificationResult.unit.unitId}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Manufacture Date</label>
                    <p className="text-lg font-semibold text-gray-900">
                      {new Date(verificationResult.unit.manufactureDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Expiry Date</label>
                    <p className={`text-lg font-semibold ${verificationResult.unit.isExpired ? 'text-red-600' : 'text-gray-900'}`}>
                      {new Date(verificationResult.unit.expiry).toLocaleDateString()}
                      {verificationResult.unit.isExpired && ' (EXPIRED)'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {verificationResult.trace && verificationResult.trace.length > 0 && (
              <div className="card mb-6">
                <h3 className="text-2xl font-semibold text-gray-900 mb-6">Supply Chain Trace</h3>
                <div className="relative">
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-blue-200"></div>
                  <div className="space-y-6">
                    {verificationResult.trace.map((event, index) => (
                      <div key={index} className="relative flex items-start">
                        <div className="absolute left-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold z-10">
                          {index + 1}
                        </div>
                        <div className="ml-20 bg-gray-50 rounded-lg p-4 flex-1">
                          <p className="font-semibold text-gray-900 mb-1">{event.action.replace('_', ' ')}</p>
                          <p className="text-sm text-gray-600 mb-1">{event.location}</p>
                          <p className="text-xs text-gray-500">{new Date(event.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="text-center">
              <button onClick={handleScanAgain} className="btn-primary px-8 py-3">
                Scan Another Medicine
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicScan;
