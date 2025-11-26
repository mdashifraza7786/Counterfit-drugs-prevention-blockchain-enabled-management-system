import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

const QRDisplay = ({ data, size = 300 }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current && data) {
      QRCode.toCanvas(canvasRef.current, data, {
        width: size,
        margin: 1,
        errorCorrectionLevel: 'H'
      });
    }
  }, [data, size]);

  if (!data) {
    return <div className="qr-placeholder">No QR code to display</div>;
  }

  return (
    <div className="qr-display">
      <canvas ref={canvasRef}></canvas>
    </div>
  );
};

export default QRDisplay;
