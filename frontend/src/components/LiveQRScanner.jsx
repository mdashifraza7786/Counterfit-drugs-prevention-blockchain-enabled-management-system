import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { playBeep } from '../utils/audioUtils';
import { PhotoIcon, PencilIcon } from '@heroicons/react/24/outline';

const LiveQRScanner = ({ onScan, onError, isActive = true }) => {
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const scannedCodesRef = useRef(new Set());

  useEffect(() => {
    let html5QrCode = null;

    const startScanner = async () => {
      try {
        html5QrCode = new Html5Qrcode('qr-reader');
        html5QrCodeRef.current = html5QrCode;
        
        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText) => {
            if (!scannedCodesRef.current.has(decodedText)) {
              scannedCodesRef.current.add(decodedText);
              playBeep();
              onScan(decodedText);
              
              setTimeout(() => {
                scannedCodesRef.current.delete(decodedText);
              }, 2000);
            }
          },
          (errorMessage) => {
          }
        );
        
        setIsScanning(true);
        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to start camera');
        if (onError) onError(err);
      }
    };

    if (isActive) {
      startScanner();
    }

    return () => {
      if (html5QrCode && isScanning) {
        html5QrCode.stop().catch(console.error);
      }
    };
  }, [isActive]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadError(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const img = new Image();
        img.onload = async () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            const html5QrCodeUpload = new Html5Qrcode('qr-reader-upload');
            const imageData = canvas.toDataURL('image/png');
            
            const decodedText = await html5QrCodeUpload.scanFile(file, false);
            
            console.log('Decoded from file:', decodedText);
            
            if (decodedText && decodedText.length > 20) {
              playBeep();
              onScan(decodedText);
              setUploadError(null);
            } else {
              setUploadError('Partial QR data detected. Please use live camera or enter Unit ID manually.');
            }
            
            html5QrCodeUpload.clear();
          } catch (err) {
            console.error('Canvas scan error:', err);
            setUploadError('Could not read QR code from image. Try using the live camera or manual input.');
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('File read error:', err);
      setUploadError('Failed to read image file.');
    }

    event.target.value = '';
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;

    const unitId = manualInput.trim();
    const batchId = unitId.substring(0, unitId.lastIndexOf('-'));

    const qrData = JSON.stringify({
      type: 'UNIT',
      batchId: batchId,
      unitId: unitId,
      timestamp: Date.now()
    });

    playBeep();
    onScan(qrData);
    setManualInput('');
    setShowManualInput(false);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="qr-scanner-container">
      <div id="qr-reader" style={{ width: '100%' }}></div>
      <div id="qr-reader-upload" style={{ width: '0px', height: '0px', overflow: 'hidden' }}></div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mt-4">
          <p className="font-medium">{error}</p>
          <p className="text-sm">Please ensure camera permissions are granted.</p>
        </div>
      )}
      
      {uploadError && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg mt-4">
          <p className="text-sm">{uploadError}</p>
        </div>
      )}
      
      {isScanning && (
        <div className="mt-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
            <div className="flex items-center justify-center">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse mr-2"></div>
              <p className="text-sm text-blue-800 font-medium">Camera active - Point at QR code</p>
            </div>
          </div>
          
          {!showManualInput ? (
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600 mb-2">Alternative options:</p>
              <div className="flex gap-2 justify-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={handleUploadClick}
                  className="inline-flex items-center space-x-2 bg-white hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg border border-gray-300 transition-colors text-sm"
                >
                  <PhotoIcon className="h-4 w-4" />
                  <span>Upload Photo</span>
                </button>
                <button
                  onClick={() => setShowManualInput(true)}
                  className="inline-flex items-center space-x-2 bg-white hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg border border-gray-300 transition-colors text-sm"
                >
                  <PencilIcon className="h-4 w-4" />
                  <span>Enter Unit ID</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-300 rounded-lg p-4">
              <form onSubmit={handleManualSubmit} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Enter Unit ID manually
                  </label>
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="e.g., BATCH-1234567890-0001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                  >
                    Add Unit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowManualInput(false);
                      setManualInput('');
                    }}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LiveQRScanner;
