import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import api from '../../utils/api';
import LiveQRScanner from '../../components/LiveQRScanner';
import { InboxIcon, TruckIcon, CubeIcon } from '@heroicons/react/24/outline';

const DistributorDashboard = () => {
  const [activeTab, setActiveTab] = useState('received');
  const [receivedBoxes, setReceivedBoxes] = useState([]);
  const [sentBoxes, setSentBoxes] = useState([]);
  const [units, setUnits] = useState([]);
  const [boxIdInput, setBoxIdInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchBoxes();
    fetchUnits();
  }, []);

  const fetchBoxes = async () => {
    try {
      const response = await api.get('/distributor/boxes');
      setReceivedBoxes(response.data.receivedBoxes);
      setSentBoxes(response.data.sentBoxes);
    } catch (err) {
      console.error('Failed to fetch boxes', err);
    }
  };

  const fetchUnits = async () => {
    try {
      const response = await api.get('/distributor/units');
      setUnits(response.data.units);
    } catch (err) {
      console.error('Failed to fetch units', err);
    }
  };

  const handleReceiveBox = async () => {
    if (!boxIdInput) {
      setError('Please enter box ID');
      return;
    }

    try {
      await api.post('/box/receive', { boxId: boxIdInput });
      setSuccess('Box received successfully!');
      setBoxIdInput('');
      fetchBoxes();
      fetchUnits();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to receive box');
    }
  };

  const parseMasterQR = (qrString) => {
    try {
      if (qrString.startsWith('{')) {
        return JSON.parse(qrString);
      }
      const parts = qrString.split('|');
      if (parts.length >= 9) {
        return {
          boxId: parts[0],
          targetRole: parts[1],
          targetId: parts[2],
          batchId: parts[3],
          totalUnits: parseInt(parts[4]),
          unitHashRoot: parts[5],
          packedBy: parts[6],
          packedAt: parts[7],
          signature: parts[8]
        };
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  const handleQRScan = async (qrString) => {
    const qrData = parseMasterQR(qrString);
    if (!qrData) {
      setError('Invalid QR format');
      return;
    }

    try {
      await api.post('/box/receive', { qrData });
      setSuccess(`Box ${qrData.boxId} received successfully!`);
      fetchBoxes();
      fetchUnits();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to receive box');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'PACKING': 'bg-purple-100 text-purple-800',
      'PENDING_TRANSFER': 'bg-indigo-100 text-indigo-800',
      'IN_TRANSIT': 'bg-yellow-100 text-yellow-800',
      'RECEIVED': 'bg-green-100 text-green-800',
      'AT_DISTRIBUTOR': 'bg-blue-100 text-blue-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar userRole={user.role} organizationName={user.organizationName} />
      
      <div className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Distributor Dashboard</h1>
            <p className="text-gray-600">Manage incoming and outgoing shipments</p>
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
                { id: 'received', label: 'Received Boxes', icon: InboxIcon },
                { id: 'sent', label: 'Sent Boxes', icon: TruckIcon },
                { id: 'units', label: 'Inventory', icon: CubeIcon },
                { id: 'receive', label: 'Receive Box', icon: InboxIcon },
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

          {activeTab === 'received' && (
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Received Boxes</h2>
              {receivedBoxes.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No boxes received yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Box ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Units</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {receivedBoxes.map(box => (
                        <tr key={box.boxId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{box.boxId}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{box.createdBy}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{box.unitIds.length}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`status-badge ${getStatusColor(box.status)}`}>
                              {box.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {box.receivedAt ? new Date(box.receivedAt).toLocaleString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'sent' && (
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Sent Boxes</h2>
                <button onClick={() => navigate('/distributor/repack')} className="btn-primary">
                  Start Repacking
                </button>
              </div>
              {sentBoxes.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No boxes sent yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Box ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Units</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sentBoxes.map(box => (
                        <tr key={box.boxId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{box.boxId}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{box.targetId}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{box.unitIds.length}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`status-badge ${getStatusColor(box.status)}`}>
                              {box.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(box.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'units' && (
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Inventory ({units.length} units)</h2>
              {units.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No units in inventory.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {units.map(unit => (
                    <div key={unit.unitId} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <p className="font-medium text-sm text-gray-900 mb-2 truncate">{unit.unitId}</p>
                      <p className="text-xs text-gray-500 mb-2">Batch: {unit.batchId}</p>
                      <span className={`status-badge ${getStatusColor(unit.status)} text-xs`}>
                        {unit.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'receive' && (
            <div className="max-w-2xl">
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Receive Box</h2>
                
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Scan Master QR</h3>
                  <LiveQRScanner onScan={handleQRScan} />
                </div>

                <div className="relative flex py-5 items-center">
                  <div className="flex-grow border-t border-gray-300"></div>
                  <span className="flex-shrink-0 mx-4 text-gray-400">OR</span>
                  <div className="flex-grow border-t border-gray-300"></div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Manual Box ID Entry (Legacy)</label>
                    <input
                      type="text"
                      value={boxIdInput}
                      onChange={(e) => setBoxIdInput(e.target.value)}
                      placeholder="Enter box ID"
                      className="input-field"
                    />
                  </div>
                  <button onClick={handleReceiveBox} className="w-full btn-primary">
                    Receive Box (Manual)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DistributorDashboard;
