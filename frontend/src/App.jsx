import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import ManufacturerDashboard from './pages/manufacturer/Dashboard';
import PackingScreen from './pages/manufacturer/PackingScreen';
import DistributorDashboard from './pages/distributor/Dashboard';
import RepackScreen from './pages/distributor/RepackScreen';
import PharmacyDashboard from './pages/pharmacy/Dashboard';
import ActivationScreen from './pages/pharmacy/ActivationScreen';
import PublicScan from './pages/consumer/PublicScan';
import RegulatorDashboard from './pages/regulator/Dashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/public-scan" element={<PublicScan />} />
        
        <Route
          path="/manufacturer"
          element={
            <PrivateRoute allowedRoles={['MANUFACTURER']}>
              <ManufacturerDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/manufacturer/packing"
          element={
            <PrivateRoute allowedRoles={['MANUFACTURER']}>
              <PackingScreen />
            </PrivateRoute>
          }
        />
        
        <Route
          path="/distributor"
          element={
            <PrivateRoute allowedRoles={['DISTRIBUTOR']}>
              <DistributorDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/distributor/repack"
          element={
            <PrivateRoute allowedRoles={['DISTRIBUTOR']}>
              <RepackScreen />
            </PrivateRoute>
          }
        />
        
        <Route
          path="/pharmacy"
          element={
            <PrivateRoute allowedRoles={['PHARMACY']}>
              <PharmacyDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/pharmacy/activate"
          element={
            <PrivateRoute allowedRoles={['PHARMACY']}>
              <ActivationScreen />
            </PrivateRoute>
          }
        />
        
        <Route
          path="/regulator"
          element={
            <PrivateRoute allowedRoles={['REGULATOR']}>
              <RegulatorDashboard />
            </PrivateRoute>
          }
        />
        
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route 
          path="/unauthorized" 
          element={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="card max-w-md text-center">
                <h1 className="text-3xl font-bold text-red-600 mb-4">Unauthorized Access</h1>
                <p className="text-gray-600 mb-6">You don't have permission to access this page.</p>
                <a href="/login" className="btn-primary inline-block">
                  Go to Login
                </a>
              </div>
            </div>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
