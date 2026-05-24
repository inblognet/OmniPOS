"use client";

import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, Scan } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      setError('Camera access denied. Please enable camera permissions.');
    }
  };

  const stopScanner = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  // Simulate barcode detection (in production, use a library like @zxing/library)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    // This is a simplified version - in production, use actual barcode detection
    if (e.key === 'Enter') {
      onScan('123456789012');
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-black/80 p-4 flex justify-between items-center">
        <h2 className="text-white font-bold">Scan Barcode</h2>
        <button onClick={onClose} className="text-white">
          <X size={24} />
        </button>
      </div>
      
      {/* Camera View */}
      <div className="flex-1 relative">
        {error ? (
          <div className="flex items-center justify-center h-full text-white text-center p-4">
            <div>
              <Camera size={48} className="mx-auto mb-4 opacity-50" />
              <p>{error}</p>
              <button
                onClick={startScanner}
                className="mt-4 px-6 py-2 bg-blue-600 rounded-xl"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 border-2 border-white rounded-lg shadow-lg">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <Scan size={48} className="text-white opacity-50" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Instructions */}
      <div className="bg-black/80 p-4">
        <p className="text-white text-center text-sm">
          Position barcode within the frame to scan
        </p>
      </div>
    </div>
  );
}
