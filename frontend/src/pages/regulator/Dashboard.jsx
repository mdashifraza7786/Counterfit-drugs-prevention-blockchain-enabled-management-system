import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import api from '../../utils/api';
import { CubeIcon, ArchiveBoxIcon, ShieldExclamationIcon, LinkIcon } from '@heroicons/react/24/outline';

const RegulatorDashboard = () => {
  const [activeTab, setActiveTab] = useState('units');
  const [units, setUnits] = useState([]);
  const [batches, setBatches] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [verification, setVerification] = useState(null);
  const [freezeForm, setFreezeForm] = useState({ unitId: '', reason: '' });
  const [batchFreezeForm, setBatchFreezeForm] = useState({ batchId: '', reason: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (activeTab === 'units') fetchUnits();
    if (activeTab === 'batches') fetchBatches();
    if (activeTab === 'ledger') fetchLedger();
  }, [activeTab]);

  const fetchUnits = async () => {
    try {
      const response = await api.get('/units/all');
      setUnits(response.data.units);
    } catch (err) {
      console.error('Failed to fetch units', err);
    }
  };

  const fetchBatches = async () => {
    try {
      const response = await api.get('/batches/all');
      setBatches(response.data.batches);
    } catch (err) {
      console.error('Failed to fetch batches', err);
    }
  };

  const fetchLedger = async () => {
    try {
      const response = await api.get('/ledger/all');
      setLedger(response.data.chain);
    } catch (err) {
      console.error('Failed to fetch ledger', err);
    }
  };

  const handleVerifyLedger = async () => {
    try {
      const response = await api.get('/ledger/verify');
      setVerification(response.data.verification);
      setSuccess('Ledger verification complete');
    } catch (err) {
      setError('Failed to verify ledger');
    }
  };

  const handleFreezeUnit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/freeze/unit', freezeForm);
      setSuccess('Unit frozen successfully');
      setFreezeForm({ unitId: '', reason: '' });
      fetchUnits();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to freeze unit');
    }
  };

  const handleFreezeBatch = async (e) => {
    e.preventDefault();
    try {
      await api.post('/freeze/batch', batchFreezeForm);
      setSuccess('Batch frozen successfully');
      setBatchFreezeForm({ batchId: '', reason: '' });
      fetchBatches();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to freeze batch');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'ACTIVE': 'bg-green-100 text-green-800',
      'FROZEN': 'bg-red-100 text-red-800',
      'CREATED': 'bg-blue-100 text-blue-800',
      'SOLD': 'bg-green-100 text-green-800',
      'AT_DISTRIBUTOR': 'bg-purple-100 text-purple-800',
      'AT_PHARMACY': 'bg-indigo-100 text-indigo-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar userRole={user.role} organizationName={user.organizationName} />
      
      <div className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Regulator Dashboard</h1>
            <p className="text-gray-600">Monitor supply chain and enforce compliance</p>
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
                { id: 'units', label: 'All Units', icon: CubeIcon },
                { id: 'batches', label: 'All Batches', icon: ArchiveBoxIcon },
                { id: 'freeze', label: 'Freeze Controls', icon: ShieldExclamationIcon },
                { id: 'ledger', label: 'Blockchain Ledger', icon: LinkIcon },
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

          {activeTab === 'units' && (
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">All Units ({units.length})</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Holder</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {units.slice(0, 50).map(unit => (
                      <tr key={unit.unitId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{unit.unitId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{unit.batchId}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`status-badge ${getStatusColor(unit.status)}`}>
                            {unit.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{unit.currentHolder || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(unit.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'batches' && (
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">All Batches ({batches.length})</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Drug Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Manufacturer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Units</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {batches.map(batch => (
                      <tr key={batch.batchId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{batch.batchId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{batch.drugName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{batch.manufacturerName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{batch.totalUnits}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(batch.expiry).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`status-badge ${getStatusColor(batch.status)}`}>
                            {batch.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'freeze' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Freeze Unit</h2>
                <form onSubmit={handleFreezeUnit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Unit ID</label>
                    <input
                      type="text"
                      value={freezeForm.unitId}
                      onChange={(e) => setFreezeForm({...freezeForm, unitId: e.target.value})}
                      required
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                    <textarea
                      value={freezeForm.reason}
                      onChange={(e) => setFreezeForm({...freezeForm, reason: e.target.value})}
                      required
                      rows="3"
                      className="input-field"
                    />
                  </div>
                  <button type="submit" className="w-full btn-danger">
                    Freeze Unit
                  </button>
                </form>
              </div>

              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Freeze Batch</h2>
                <form onSubmit={handleFreezeBatch} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Batch ID</label>
                    <input
                      type="text"
                      value={batchFreezeForm.batchId}
                      onChange={(e) => setBatchFreezeForm({...batchFreezeForm, batchId: e.target.value})}
                      required
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                    <textarea
                      value={batchFreezeForm.reason}
                      onChange={(e) => setBatchFreezeForm({...batchFreezeForm, reason: e.target.value})}
                      required
                      rows="3"
                      className="input-field"
                    />
                  </div>
                  <button type="submit" className="w-full btn-danger">
                    Freeze Batch
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'ledger' && (
            <div className="card">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Blockchain Ledger ({ledger.length} blocks)</h2>
                <button onClick={handleVerifyLedger} className="btn-primary">
                  Verify Chain Integrity
                </button>
              </div>

              {verification && (
                <div className={`mb-6 p-4 rounded-lg ${verification.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <h3 className={`font-semibold mb-2 ${verification.valid ? 'text-green-900' : 'text-red-900'}`}>
                    {verification.valid ? '✓ Chain Valid' : '✗ Chain Invalid'}
                  </h3>
                  <p className={verification.valid ? 'text-green-700' : 'text-red-700'}>{verification.message}</p>
                  {verification.totalBlocks && <p className="text-sm mt-1">Total Blocks: {verification.totalBlocks}</p>}
                </div>
              )}

              <div className="space-y-4">
                {ledger.slice(0, 20).map(block => (
                  <div key={block.index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-300">
                      <span className="font-bold text-blue-600">Block #{block.index}</span>
                      <span className="text-sm text-gray-500">{new Date(block.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Action:</span> {block.data.action}</p>
                      <p><span className="font-medium">Actor:</span> {block.data.actor} ({block.data.actorRole})</p>
                      <p><span className="font-medium">Entity:</span> {block.data.entityType} - {block.data.entityId}</p>
                      <div className="mt-3 pt-3 border-t border-gray-300">
                        <p className="text-xs text-gray-600 break-all"><span className="font-medium">Hash:</span> {block.hash}</p>
                        <p className="text-xs text-gray-600 break-all"><span className="font-medium">Previous:</span> {block.previousHash}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegulatorDashboard;
