"use client";

import React, { useEffect, useRef, useState } from 'react';
import { 
  X, Camera, Scan, Package, DollarSign, 
  Tag, Plus, Check, AlertCircle, Image as ImageIcon,
  RotateCw, Flashlight, FlipHorizontal, Upload, Keyboard,
  Search, FileUp, QrCode, Barcode, Edit2, Trash2,
  ArrowLeft, ArrowRight, CheckCircle, RefreshCw
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface ScannerProps {
  onClose: () => void;
  onProductAdded?: () => void;
}

type InputMode = 'camera' | 'gallery' | 'manual';

export default function BarcodeScanner({ onClose, onProductAdded }: ScannerProps) {
  // Step management
  const [currentStep, setCurrentStep] = useState<'image' | 'barcode' | 'details'>('image');
  
  // Image capture states
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inputMode, setInputMode] = useState<InputMode>('camera');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  // Barcode states
  const [manualBarcode, setManualBarcode] = useState('');
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [showBarcodeCamera, setShowBarcodeCamera] = useState(false);
  
  // Product details states
  const [quickAddData, setQuickAddData] = useState({
    name: '',
    price: '',
    category: '',
    stock: '',
    barcode: '',
    description: ''
  });
  const [addingProduct, setAddingProduct] = useState(false);

  // Camera effects
  useEffect(() => {
    if (currentStep === 'image' && inputMode === 'camera' && !capturedImage) {
      startCamera();
    }
    return () => {
      if (currentStep === 'image') {
        stopCamera();
      }
    };
  }, [currentStep, inputMode, facingMode]);

  const startCamera = async () => {
    stopCamera();
    try {
      const constraints = {
        video: { 
          facingMode: { exact: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      setError(null);
    } catch (err) {
      setError('Camera access denied. Please enable camera permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const toggleFlash = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const track = (videoRef.current.srcObject as MediaStream).getVideoTracks()[0];
      if (track && 'applyConstraints' in track) {
        const capabilities = track.getCapabilities();
        if (capabilities.torch) {
          track.applyConstraints({ advanced: [{ torch: !flashEnabled }] as any });
          setFlashEnabled(!flashEnabled);
        }
      }
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const captureImage = async () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        
        const blob = await new Promise<Blob>((resolve) => {
          canvasRef.current?.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.8);
        });
        const file = new File([blob], 'product.jpg', { type: 'image/jpeg' });
        setImageFile(file);
        
        const imageData = canvasRef.current.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageData);
        setImagePreview(imageData);
        stopCamera();
        setTimeout(() => setCurrentStep('barcode'), 500);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target?.result as string;
        setCapturedImage(imageData);
        setImagePreview(imageData);
        setCurrentStep('barcode');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleManualBarcodeSubmit = () => {
    if (manualBarcode.trim()) {
      setScannedBarcode(manualBarcode);
      setQuickAddData(prev => ({ ...prev, barcode: manualBarcode }));
      setCurrentStep('details');
    } else {
      toast.error('Please enter a barcode');
    }
  };

  const simulateScan = () => {
    const mockBarcode = '890123456789' + Math.floor(Math.random() * 1000);
    setScannedBarcode(mockBarcode);
    setQuickAddData(prev => ({ ...prev, barcode: mockBarcode }));
    setShowBarcodeCamera(false);
    stopCamera();
    setCurrentStep('details');
  };

  const handleAddProduct = async () => {
    if (!quickAddData.name || !quickAddData.price) {
      toast.error('Please fill in name and price');
      return;
    }

    setAddingProduct(true);
    try {
      const formData = new FormData();
      formData.append('name', quickAddData.name);
      formData.append('price', quickAddData.price);
      formData.append('barcode', quickAddData.barcode || scannedBarcode);
      formData.append('category', quickAddData.category || 'General');
      formData.append('stock', quickAddData.stock || '0');
      formData.append('description', quickAddData.description || '');
      formData.append('type', 'Stock');
      formData.append('is_active', 'true');
      
      if (imageFile) {
        formData.append('image', imageFile);
      }
      
      console.log('Sending to:', '/mobile/staff/products');
      console.log('Product data:', {
        name: quickAddData.name,
        price: quickAddData.price,
        barcode: quickAddData.barcode || scannedBarcode,
        category: quickAddData.category,
        stock: quickAddData.stock
      });
      
      // Use the correct API endpoint with /mobile prefix
      const res = await api.post('/mobile/staff/products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (res.data.success) {
        toast.success('Product added successfully!');
        onProductAdded?.();
        onClose();
      } else {
        toast.error(res.data.message || 'Failed to add product');
      }
    } catch (error: any) {
      console.error('Add product error:', error);
      toast.error(error.response?.data?.message || 'Failed to add product');
    } finally {
      setAddingProduct(false);
    }
  };

  const resetToImage = () => {
    setCapturedImage(null);
    setImagePreview(null);
    setImageFile(null);
    setScannedBarcode('');
    setManualBarcode('');
    setQuickAddData({ name: '', price: '', category: '', stock: '', barcode: '', description: '' });
    setCurrentStep('image');
    if (inputMode === 'camera') {
      startCamera();
    }
  };

  const goBackToImage = () => {
    setCurrentStep('image');
    if (inputMode === 'camera') {
      startCamera();
    }
  };

  const goBackToBarcode = () => {
    setCurrentStep('barcode');
  };

  const renderImageStep = () => (
    <div className="flex-1 flex flex-col">
      <div className="bg-white p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1">
            <X size={24} className="text-gray-500" />
          </button>
          <div className="flex-1 text-center">
            <h2 className="text-lg font-bold text-gray-900">Step 1 of 3</h2>
            <p className="text-sm text-gray-500">Add Product Image</p>
          </div>
          <div className="w-8"></div>
        </div>
      </div>

      <div className="bg-gray-50 p-4">
        <div className="flex gap-2 bg-white rounded-2xl p-1 shadow-sm">
          <button
            onClick={() => { setInputMode('camera'); setCapturedImage(null); startCamera(); }}
            className={`flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${
              inputMode === 'camera' ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-600'
            }`}
          >
            <Camera size={18} />
            Camera
          </button>
          <button
            onClick={() => { setInputMode('gallery'); setCapturedImage(null); stopCamera(); }}
            className={`flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${
              inputMode === 'gallery' ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-600'
            }`}
          >
            <ImageIcon size={18} />
            Gallery
          </button>
        </div>
      </div>

      {inputMode === 'camera' && !capturedImage && (
        <div className="flex-1 relative bg-black">
          <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative">
              <div className="w-72 h-72 border-2 border-white rounded-xl shadow-lg">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-blue-500 rounded-tl-xl"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-blue-500 rounded-tr-xl"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-blue-500 rounded-bl-xl"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-blue-500 rounded-br-xl"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {imagePreview && (
        <div className="flex-1 bg-gray-100 flex items-center justify-center p-6">
          <div className="relative">
            <img src={imagePreview} alt="Preview" className="max-w-full max-h-96 rounded-2xl shadow-lg" />
            <button
              onClick={() => { setImagePreview(null); setCapturedImage(null); setImageFile(null); if (inputMode === 'camera') startCamera(); }}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {inputMode === 'gallery' && !capturedImage && (
        <div className="flex-1 bg-gray-100 flex flex-col items-center justify-center p-8">
          <div className="text-center">
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <ImageIcon size={48} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Upload Product Image</h3>
            <p className="text-gray-500 mb-6">Select an image from your gallery</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 mx-auto"
            >
              <Upload size={20} />
              Choose Image
            </button>
          </div>
        </div>
      )}

      {inputMode === 'camera' && !capturedImage && (
        <div className="bg-black/80 backdrop-blur-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <button onClick={toggleFlash} className={`p-3 rounded-full ${flashEnabled ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-white'}`}>
              <Flashlight size={20} />
            </button>
            <button onClick={captureImage} className="bg-white p-4 rounded-full shadow-lg active:scale-95">
              <Camera size={28} className="text-black" />
            </button>
            <button onClick={toggleCamera} className="p-3 rounded-full bg-gray-700 text-white">
              <FlipHorizontal size={20} />
            </button>
          </div>
          <p className="text-center text-white/60 text-xs">Position product in center and tap to capture</p>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
    </div>
  );

  const renderBarcodeStep = () => (
    <div className="flex-1 flex flex-col">
      <div className="bg-white p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button onClick={goBackToImage} className="p-1">
            <ArrowLeft size={24} className="text-gray-500" />
          </button>
          <div className="flex-1 text-center">
            <h2 className="text-lg font-bold text-gray-900">Step 2 of 3</h2>
            <p className="text-sm text-gray-500">Add Barcode / QR Code</p>
          </div>
          <div className="w-8"></div>
        </div>
      </div>

      <div className="flex-1 bg-gray-100 p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl p-6 space-y-6">
          <div className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Camera size={20} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Scan with Camera</h3>
                <p className="text-xs text-gray-500">Use camera to scan barcode</p>
              </div>
            </div>
            <button
              onClick={() => { setShowBarcodeCamera(true); startCamera(); }}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium flex items-center justify-center gap-2"
            >
              <Scan size={18} />
              Open Scanner
            </button>
          </div>

          <div className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Keyboard size={20} className="text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Enter Manually</h3>
                <p className="text-xs text-gray-500">Type the barcode number</p>
              </div>
            </div>
            <input
              type="text"
              placeholder="Enter barcode number"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 mb-3"
            />
            <button
              onClick={handleManualBarcodeSubmit}
              disabled={!manualBarcode.trim()}
              className="w-full py-3 bg-purple-600 text-white rounded-xl font-medium disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDetailsStep = () => (
    <div className="flex-1 bg-white overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-100 p-4">
        <div className="flex items-center gap-3">
          <button onClick={goBackToBarcode} className="p-1">
            <ArrowLeft size={24} className="text-gray-500" />
          </button>
          <div className="flex-1 text-center">
            <h2 className="text-lg font-bold text-gray-900">Step 3 of 3</h2>
            <p className="text-sm text-gray-500">Complete Product Details</p>
          </div>
          <div className="w-8"></div>
        </div>
      </div>
      
      <div className="p-4 space-y-5">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 space-y-3">
          {imagePreview && (
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 bg-white rounded-xl overflow-hidden shadow-sm">
                <img src={imagePreview} alt="Product" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Product Image</p>
                <button onClick={goBackToImage} className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                  <Edit2 size={12} /> Change
                </button>
              </div>
            </div>
          )}
          
          {scannedBarcode && (
            <div className="flex items-center gap-3 pt-2 border-t border-blue-100">
              <QrCode size={24} className="text-blue-600" />
              <div className="flex-1">
                <p className="text-xs text-gray-500">Barcode / QR Code</p>
                <p className="font-mono font-bold text-gray-900 text-sm">{scannedBarcode}</p>
              </div>
              <button onClick={goBackToBarcode} className="text-xs text-blue-600">
                <Edit2 size={14} />
              </button>
            </div>
          )}
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Product Name *</label>
            <div className="relative">
              <Tag size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Enter product name"
                value={quickAddData.name}
                onChange={(e) => setQuickAddData({ ...quickAddData, name: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Price *</label>
              <div className="relative">
                <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={quickAddData.price}
                  onChange={(e) => setQuickAddData({ ...quickAddData, price: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Stock</label>
              <input
                type="number"
                placeholder="Quantity"
                value={quickAddData.stock}
                onChange={(e) => setQuickAddData({ ...quickAddData, stock: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
            <input
              type="text"
              placeholder="e.g., Electronics, Clothing"
              value={quickAddData.category}
              onChange={(e) => setQuickAddData({ ...quickAddData, category: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Description (Optional)</label>
            <textarea
              placeholder="Product description"
              value={quickAddData.description}
              onChange={(e) => setQuickAddData({ ...quickAddData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 resize-none"
            />
          </div>
        </div>
      </div>
      
      <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 flex gap-3">
        <button
          onClick={resetToImage}
          className="flex-1 py-3 bg-gray-100 rounded-xl text-gray-700 font-medium flex items-center justify-center gap-2"
        >
          <Trash2 size={18} />
          Start Over
        </button>
        <button
          onClick={handleAddProduct}
          disabled={addingProduct || !quickAddData.name || !quickAddData.price}
          className="flex-1 py-3 bg-green-600 rounded-xl text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {addingProduct ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <CheckCircle size={18} />
              Add Product
            </>
          )}
        </button>
      </div>
    </div>
  );

  if (showBarcodeCamera) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="flex-1 relative">
          <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 border-2 border-green-500 rounded-lg">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <Scan size={32} className="text-green-500 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
        <div className="bg-black/80 p-4">
          <div className="flex justify-center gap-6">
            <button
              onClick={() => { setShowBarcodeCamera(false); stopCamera(); }}
              className="px-6 py-3 bg-gray-700 rounded-xl text-white"
            >
              Cancel
            </button>
            <button
              onClick={simulateScan}
              className="px-6 py-3 bg-green-600 rounded-xl text-white"
            >
              Simulate Scan
            </button>
          </div>
          <p className="text-center text-white/60 text-xs mt-3">Position barcode within the frame</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col">
      <div className="flex-1 bg-white rounded-t-3xl overflow-hidden flex flex-col max-h-[90vh] mt-auto">
        {currentStep === 'image' && renderImageStep()}
        {currentStep === 'barcode' && renderBarcodeStep()}
        {currentStep === 'details' && renderDetailsStep()}
      </div>
    </div>
  );
}
