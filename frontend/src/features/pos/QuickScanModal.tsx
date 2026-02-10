import React, { useState, useEffect, useRef } from 'react';
import { X, QrCode, Search, CheckCircle, AlertTriangle, Package, Clock, ChevronRight } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Product } from '../../db/db';
import { useAppDispatch } from '../../app/hooks';
import { addToCart } from '../../store/cartSlice';

interface QuickScanModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Helper type for the local session history
interface ScannedItem {
    id: number;
    name: string;
    qty: number;
    timestamp: number;
}

const QuickScanModal: React.FC<QuickScanModalProps> = ({ isOpen, onClose }) => {
    const dispatch = useAppDispatch();
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // --- State ---
    const [inputVal, setInputVal] = useState('');
    const [mode, setMode] = useState<'SCAN' | 'MANUAL'>('SCAN');
    const [lastScanned, setLastScanned] = useState<{ name: string; status: 'success' | 'error' } | null>(null);

    // New: Session History & Search Suggestions
    const [sessionHistory, setSessionHistory] = useState<ScannedItem[]>([]);
    const [suggestions, setSuggestions] = useState<Product[]>([]);
    const [highlightedIndex, setHighlightedIndex] = useState(0);

    // --- DB Data ---
    const products = useLiveQuery(() => db.products.filter(p => p.isActive !== false).toArray()) || [];

    // --- Focus & Reset ---
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
            setInputVal('');
            setMode('SCAN');
            setLastScanned(null);
            setSessionHistory([]); // Clear history on new open
            setSuggestions([]);
        }
    }, [isOpen]);

    // Scroll to bottom of history when updated
    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [sessionHistory]);

    // --- Helpers ---
    const addToSession = (productName: string) => {
        setSessionHistory(prev => {
            const existing = prev.find(i => i.name === productName);
            if (existing) {
                // Move to bottom and increment qty
                return [...prev.filter(i => i.name !== productName), { ...existing, qty: existing.qty + 1, timestamp: Date.now() }];
            }
            return [...prev, { id: Date.now(), name: productName, qty: 1, timestamp: Date.now() }];
        });
    };

    const processProductAdd = (product: Product) => {
        // Stock Check
        if (product.type === 'Stock' && product.stock <= 0 && !product.allowNegativeStock) {
            setLastScanned({ name: `${product.name} (Out of Stock)`, status: 'error' });
            return;
        }

        dispatch(addToCart({
            id: product.id!,
            name: product.displayName || product.name,
            price: product.price,
            stock: product.stock,
            barcode: product.barcode,
            category: product.category,
            isTaxIncluded: product.isTaxIncluded,
            quantity: 1,
            discount: 0,
            note: ''
        }));

        setLastScanned({ name: product.name, status: 'success' });
        addToSession(product.name);
        setInputVal('');
        setSuggestions([]);
    };

    // --- Logic ---
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputVal(val);

        // Name Search Logic (Only in Manual Mode)
        if (mode === 'MANUAL' && val.trim().length > 1) {
            const matches = products.filter(p =>
                p.name.toLowerCase().includes(val.toLowerCase()) ||
                p.sku?.toLowerCase().includes(val.toLowerCase())
            ).slice(0, 5); // Limit to 5 suggestions
            setSuggestions(matches);
            setHighlightedIndex(0);
        } else {
            setSuggestions([]);
        }
    };

    const handleProcessInput = () => {
        const query = inputVal.trim();
        if (!query) return;

        // 1. Try Exact Barcode Match (Fastest)
        const barcodeMatch = products.find(p => p.barcode === query);
        if (barcodeMatch) {
            processProductAdd(barcodeMatch);
            return;
        }

        // 2. Try Exact SKU Match
        const skuMatch = products.find(p => p.sku?.toLowerCase() === query.toLowerCase());
        if (skuMatch) {
            processProductAdd(skuMatch);
            return;
        }

        // 3. If Manual Mode and we have a highlighted suggestion
        if (mode === 'MANUAL' && suggestions.length > 0) {
            processProductAdd(suggestions[highlightedIndex]);
            return;
        }

        setLastScanned({ name: `Unknown: "${query}"`, status: 'error' });
        setInputVal('');
    };

    // --- Keyboard Handler ---
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Home' || e.key === 'Escape') {
            e.preventDefault();
            onClose();
        }

        // Navigation for Suggestions
        else if (suggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightedIndex(prev => Math.max(prev - 1, 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                processProductAdd(suggestions[highlightedIndex]);
            }
        }

        // Standard Processing
        else if (e.key === 'Enter') {
            e.preventDefault();
            handleProcessInput();
        } else if (e.key === 'Backspace') {
            if (mode === 'SCAN' && inputVal === '') {
                setMode('MANUAL');
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black/60 backdrop-blur-sm transition-opacity">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className={`p-4 flex justify-between items-center border-b ${mode === 'SCAN' ? 'bg-blue-600' : 'bg-orange-500'} text-white transition-colors duration-300`}>
                    <div className="flex items-center gap-3">
                        {mode === 'SCAN' ? <QrCode size={28} /> : <Search size={28} />}
                        <div>
                            <h2 className="text-xl font-bold uppercase tracking-wider">{mode === 'SCAN' ? 'Quick Scan' : 'Product Search'}</h2>
                            <p className="text-xs opacity-80 font-mono">
                                {mode === 'SCAN' ? 'Ready for Barcode Reader...' : 'Type Product Name or SKU'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-xs bg-white/20 px-2 py-1 rounded text-right font-medium">
                            ESC to Close
                        </div>
                        <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition"><X size={24} /></button>
                    </div>
                </div>

                {/* Input Area */}
                <div className="p-6 pb-2 relative z-20">
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type="text"
                            autoFocus
                            value={inputVal}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            onBlur={() => setTimeout(() => inputRef.current?.focus(), 10)}
                            placeholder={mode === 'SCAN' ? "Scan barcode..." : "Type name..."}
                            className={`w-full text-3xl font-mono font-bold p-4 border-2 rounded-xl outline-none transition-all shadow-inner ${
                                mode === 'SCAN'
                                ? 'border-blue-200 focus:border-blue-600 placeholder-blue-100 text-blue-900'
                                : 'border-orange-200 focus:border-orange-500 placeholder-orange-100 text-orange-900'
                            }`}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                            {mode === 'SCAN' ? <QrCode size={32} className="opacity-20"/> : <Package size={32} className="opacity-20"/>}
                        </div>

                        {/* Search Suggestions Dropdown */}
                        {suggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden z-30">
                                {suggestions.map((product, idx) => (
                                    <div
                                        key={product.id}
                                        onClick={() => processProductAdd(product)}
                                        className={`p-3 px-4 flex justify-between items-center cursor-pointer border-b last:border-0 ${idx === highlightedIndex ? 'bg-blue-50 text-blue-800' : 'hover:bg-gray-50'}`}
                                    >
                                        <div className="font-bold">{product.name}</div>
                                        <div className="text-sm opacity-60 font-mono">${product.price.toFixed(2)}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Status Message */}
                    <div className="mt-2 h-8 flex items-center justify-center">
                        {lastScanned ? (
                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold animate-in fade-in zoom-in-95 ${lastScanned.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {lastScanned.status === 'success' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                                {lastScanned.name}
                            </div>
                        ) : (
                            <span className="text-gray-300 text-xs">Waiting for input...</span>
                        )}
                    </div>
                </div>

                {/* Session History List */}
                <div className="flex-1 bg-gray-50 border-t border-gray-100 flex flex-col overflow-hidden">
                    <div className="px-6 py-2 bg-gray-100 border-b border-gray-200 flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><Clock size={12}/> Session Scans</span>
                        <span className="text-xs font-bold text-blue-600">{sessionHistory.reduce((acc, curr) => acc + curr.qty, 0)} Items</span>
                    </div>

                    <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                        {sessionHistory.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-50">
                                <Package size={48} className="mb-2" />
                                <p className="text-sm font-medium">No items scanned yet</p>
                            </div>
                        ) : (
                            sessionHistory.map((item) => (
                                <div key={item.timestamp} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex justify-between items-center animate-in slide-in-from-left-5">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">
                                            {item.qty}
                                        </div>
                                        <span className="font-bold text-gray-700">{item.name}</span>
                                    </div>
                                    <ChevronRight size={16} className="text-gray-300" />
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default QuickScanModal;