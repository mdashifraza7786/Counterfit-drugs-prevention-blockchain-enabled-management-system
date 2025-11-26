import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import api from '../../utils/api';
import { PlusIcon, QrCodeIcon, CubeIcon, ArchiveBoxIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import JSZip from 'jszip';

const ManufacturerDashboard = () => {
  const [activeTab, setActiveTab] = useState('batches');
  const [batches, setBatches] = useState([]);
  const [units, setUnits] = useState([]);
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [batchForm, setBatchForm] = useState({
    drugName: '',
    expiry: '',
    totalUnits: ''
  });
  
  const [unitForm, setUnitForm] = useState({
    batchId: '',
    quantity: ''
  });
  
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [generatedQRs, setGeneratedQRs] = useState([]);
  
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchBatches();
    fetchBoxes();
  }, []);

  const fetchBatches = async () => {
    try {
      const response = await api.get('/manufacturer/batches');
      setBatches(response.data.batches);
    } catch (err) {
      console.error('Failed to fetch batches', err);
    }
  };

  const fetchBoxes = async () => {
    try {
      const response = await api.get('/manufacturer/boxes');
      setBoxes(response.data.boxes);
    } catch (err) {
      console.error('Failed to fetch boxes', err);
    }
  };

  const fetchUnits = async (batchId) => {
    try {
      const response = await api.get(`/manufacturer/units/${batchId}`);
      setUnits(response.data.units);
    } catch (err) {
      console.error('Failed to fetch units', err);
    }
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/batch/create', batchForm);
      setSuccess('Batch created successfully!');
      setBatchForm({ drugName: '', expiry: '', totalUnits: '' });
      fetchBatches();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create batch');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateUnits = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/unit/generate', unitForm);
      setSuccess(`${response.data.units.length} units generated successfully!`);
      setGeneratedQRs(response.data.qrCodes);
      setUnitForm({ batchId: '', quantity: '' });
      fetchBatches();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate units');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'ACTIVE': 'bg-green-100 text-green-800',
      'FROZEN': 'bg-red-100 text-red-800',
      'CREATED': 'bg-blue-100 text-blue-800',
      'IN_TRANSIT': 'bg-yellow-100 text-yellow-800',
      'PACKING': 'bg-purple-100 text-purple-800',
      'PENDING_TRANSFER': 'bg-indigo-100 text-indigo-800',
      'RECEIVED': 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const downloadQRsAsZip = async () => {
    if (generatedQRs.length === 0) return;

    const zip = new JSZip();
    const folder = zip.folder('QR_Codes');

    for (const qr of generatedQRs) {
      const base64Data = qr.qrCodeDataURL.split(',')[1];
      folder.file(`${qr.unitId}.png`, base64Data, { base64: true });
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `QR_Codes_${new Date().getTime()}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar userRole={user.role} organizationName={user.organizationName} />
      
      <div className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Manufacturer Dashboard</h1>
            <p className="text-gray-600">Manage batches, generate units, and pack for distribution</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          <div className="mb-6 border-b border-gray-200">
            <nav className="flex space-x-8">
              {[
                { id: 'batches', label: 'Batches', icon: CubeIcon },
                { id: 'create-batch', label: 'Create Batch', icon: PlusIcon },
                { id: 'generate-units', label: 'Generate Units', icon: QrCodeIcon },
                { id: 'boxes', label: 'Boxes', icon: ArchiveBoxIcon },
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center space-x-2 pb-4 px-1 border-b-2 font-medium text-sm transition-colors
                      ${activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {activeTab === 'batches' && (
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">All Batches</h2>
              {batches.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No batches created yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Drug Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Units</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {batches.map(batch => (
                        <tr key={batch.batchId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{batch.batchId}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{batch.drugName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{batch.totalUnits}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(batch.expiry).toLocaleDateString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`status-badge ${getStatusColor(batch.status)}`}>
                              {batch.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => {
                                setSelectedBatch(batch);
                                fetchUnits(batch.batchId);
                              }}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              View Units
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'create-batch' && (
            <div className="max-w-2xl">
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Create New Batch</h2>
                <form onSubmit={handleCreateBatch} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Drug Name</label>
                    <input
                      type="text"
                      value={batchForm.drugName}
                      onChange={(e) => setBatchForm({...batchForm, drugName: e.target.value})}
                      required
                      className="input-field"
                      placeholder="e.g., Paracetamol 500mg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                    <input
                      type="date"
                      value={batchForm.expiry}
                      onChange={(e) => setBatchForm({...batchForm, expiry: e.target.value})}
                      required
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Total Units</label>
                    <input
                      type="number"
                      value={batchForm.totalUnits}
                      onChange={(e) => setBatchForm({...batchForm, totalUnits: e.target.value})}
                      required
                      min="1"
                      className="input-field"
                      placeholder="Enter number of units"
                    />
                  </div>

                  <button type="submit" disabled={loading} className="w-full btn-primary">
                    {loading ? 'Creating...' : 'Create Batch'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'generate-units' && (
            <div className="max-w-2xl">
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Generate Units with QR Codes</h2>
                <form onSubmit={handleGenerateUnits} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Batch</label>
                    <select
                      value={unitForm.batchId}
                      onChange={(e) => setUnitForm({...unitForm, batchId: e.target.value})}
                      required
                      className="input-field"
                    >
                      <option value="">-- Select Batch --</option>
                      {batches.map(batch => (
                        <option key={batch.batchId} value={batch.batchId}>
                          {batch.batchId} - {batch.drugName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                    <input
                      type="number"
                      value={unitForm.quantity}
                      onChange={(e) => setUnitForm({...unitForm, quantity: e.target.value})}
                      required
                      min="1"
                      max="100"
                      className="input-field"
                      placeholder="Number of units to generate"
                    />
                  </div>

                  <button type="submit" disabled={loading} className="w-full btn-primary">
                    {loading ? 'Generating...' : 'Generate Units'}
                  </button>
                </form>

                {generatedQRs.length > 0 && (
                  <div className="mt-8">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Generated QR Codes ({generatedQRs.length})</h3>
                      <button
                        onClick={downloadQRsAsZip}
                        className="btn-secondary flex items-center space-x-2"
                      >
                        <ArrowDownTrayIcon className="h-5 w-5" />
                        <span>Download as ZIP</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {generatedQRs.map(qr => (
                        <div key={qr.unitId} className="border border-gray-200 rounded-lg p-4 text-center">
                          <p className="text-xs font-medium text-gray-900 mb-2 truncate">{qr.unitId}</p>
                          <img src={qr.qrCodeDataURL} alt={qr.unitId} className="w-full" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'boxes' && (
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">All Boxes</h2>
                <button
                  onClick={() => navigate('/manufacturer/packing')}
                  className="btn-primary"
                >
                  Start Packing
                </button>
              </div>
              {boxes.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No boxes created yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Box ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units Count</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {boxes.map(box => (
                        <tr key={box.boxId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{box.boxId}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{box.targetId}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{box.unitIds.length}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`status-badge ${getStatusColor(box.status)}`}>
                              {box.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(box.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Units for {selectedBatch.batchId}</h3>
              <button
                onClick={() => setSelectedBatch(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {units.map(unit => (
                  <div key={unit.unitId} className="border border-gray-200 rounded-lg p-4">
                    <p className="font-medium text-sm text-gray-900 mb-1 truncate">{unit.unitId}</p>
                    <span className={`status-badge ${getStatusColor(unit.status)} text-xs`}>
                      {unit.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManufacturerDashboard;
