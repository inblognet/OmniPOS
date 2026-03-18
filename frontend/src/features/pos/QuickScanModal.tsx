import React, { useState, useEffect, useRef } from 'react';
import { X, QrCode, Search, CheckCircle, AlertTriangle, Package, Clock, ChevronRight, Layers, Calendar } from 'lucide-react';
import VirtualKeyboard from '../../components/VirtualKeyboard';

interface QuickScanModalProps {
    isOpen: boolean;
    onClose: () => void;
    products: any[];
    onAddToCart: (product: any, customQty?: number) => void;
}

interface ScannedItem {
    id: number;
    name: string;
    qty: number;
    timestamp: number;
}

const QuickScanModal: React.FC<QuickScanModalProps> = ({ isOpen, onClose, products, onAddToCart }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const [flowStep, setFlowStep] = useState<'SEARCH' | 'BATCH_SELECT' | 'QTY_INPUT'>('SEARCH');
    const [inputMode, setInputMode] = useState<'SCAN' | 'MANUAL'>('SCAN');
    const [searchQuery, setSearchQuery] = useState('');

    const [matchedBatches, setMatchedBatches] = useState<any[]>([]);
    const [highlightedBatchIndex, setHighlightedBatchIndex] = useState(0);
    const [customQty, setCustomQty] = useState('1');

    const [lastScanned, setLastScanned] = useState<{ name: string; status: 'success' | 'error' } | null>(null);
    const [sessionHistory, setSessionHistory] = useState<ScannedItem[]>([]);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [highlightedSuggestion, setHighlightedSuggestion] = useState(0);

    useEffect(() => {
        if (isOpen) {
            resetToSearch();
            setSessionHistory([]);
            setLastScanned(null);
        }
    }, [isOpen]);

    const resetToSearch = () => {
        setFlowStep('SEARCH');
        setSearchQuery('');
        setInputMode('SCAN');
        setMatchedBatches([]);
        setSuggestions([]);
        setCustomQty('1');
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    useEffect(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    }, [sessionHistory]);

    const commitProductToCart = () => {
        const product = matchedBatches[highlightedBatchIndex];
        const qty = parseFloat(customQty) || 1;

        if (product.type === 'Stock' && product.stock <= 0 && !product.allowNegativeStock) {
            setLastScanned({ name: `${product.name} (Out of Stock)`, status: 'error' });
            resetToSearch();
            return;
        }

        onAddToCart(product, qty);

        setSessionHistory(prev => {
            const existing = prev.find(i => i.name === product.name);
            if (existing) {
                return [...prev.filter(i => i.name !== product.name), { ...existing, qty: existing.qty + qty, timestamp: Date.now() }];
            }
            return [...prev, { id: Date.now(), name: product.name, qty: qty, timestamp: Date.now() }];
        });

        setLastScanned({ name: `${product.name} x${qty}`, status: 'success' });
        resetToSearch();
    };

    // 🚀 THE SUFFIX INTERCEPTOR
    const handleProcessSearch = (queryOverride?: string) => {
        const query = (queryOverride || searchQuery).trim();
        if (!query) return;

        const exactMatches = products.filter(p => {
            const dbBarcode = p.barcode ? String(p.barcode).trim() : '';
            const baseBarcode = dbBarcode.split('-')[0]; // Ignored the -1, -2 suffix!

            return dbBarcode === query ||
                   baseBarcode === query ||
                   (p.sku && p.sku.toLowerCase() === query.toLowerCase());
        });

        if (exactMatches.length > 1) {
            setMatchedBatches(exactMatches);
            setHighlightedBatchIndex(0);
            setFlowStep('BATCH_SELECT');
        } else if (exactMatches.length === 1) {
            setMatchedBatches(exactMatches);
            setHighlightedBatchIndex(0);
            setFlowStep('QTY_INPUT');
        } else {
            if (inputMode === 'MANUAL' && suggestions.length > 0) {
                setMatchedBatches([suggestions[highlightedSuggestion]]);
                setHighlightedBatchIndex(0);
                setFlowStep('QTY_INPUT');
                return;
            }
            setLastScanned({ name: `Unknown: "${query}"`, status: 'error' });
            setSearchQuery('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Home' || e.key === 'Escape') {
            e.preventDefault();
            onClose();
            return;
        }

        if (flowStep === 'SEARCH') {
            if (suggestions.length > 0) {
                if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedSuggestion(prev => Math.min(prev + 1, suggestions.length - 1)); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedSuggestion(prev => Math.max(prev - 1, 0)); }
                else if (e.key === 'Enter') { e.preventDefault(); handleProcessSearch(suggestions[highlightedSuggestion].name); }
            } else {
                if (e.key === 'Enter') { e.preventDefault(); handleProcessSearch(); }
                else if (e.key === 'Backspace' && searchQuery === '') setInputMode('MANUAL');
            }
        }
        else if (flowStep === 'BATCH_SELECT') {
            e.preventDefault();
            if (e.key === 'ArrowDown') { setHighlightedBatchIndex(prev => Math.min(prev + 1, matchedBatches.length - 1)); }
            else if (e.key === 'ArrowUp') { setHighlightedBatchIndex(prev => Math.max(prev - 1, 0)); }
            else if (e.key === ' ' || e.key === 'Enter') { setFlowStep('QTY_INPUT'); }
            else if (e.key === 'Backspace') { resetToSearch(); }
        }
        else if (flowStep === 'QTY_INPUT') {
            if (e.key === 'Enter') {
                e.preventDefault();
                commitProductToCart();
            } else if (e.key === 'Backspace' && customQty === '') {
                e.preventDefault();
                if (matchedBatches.length > 1) setFlowStep('BATCH_SELECT');
                else resetToSearch();
            }
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (flowStep === 'QTY_INPUT') {
            if (/^\d*\.?\d*$/.test(val)) setCustomQty(val);
            return;
        }
        setSearchQuery(val);
        if (inputMode === 'MANUAL' && val.trim().length > 1) {
            const matches = products.filter(p => p.name.toLowerCase().includes(val.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(val.toLowerCase()))).slice(0, 5);
            setSuggestions(matches);
            setHighlightedSuggestion(0);
        } else {
            setSuggestions([]);
        }
    };

    const handleNumpadKey = (key: string) => {
        if (key === 'Enter') commitProductToCart();
        else if (key === 'Backspace') setCustomQty(prev => prev.slice(0, -1));
        else setCustomQty(prev => prev === '1' && key !== '.' ? key : prev + key);
        inputRef.current?.focus();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-start justify-center pt-10 bg-black/60 backdrop-blur-sm transition-opacity">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col max-h-[85vh] animate-in zoom-in-95">

                <div className={`p-4 flex justify-between items-center border-b ${flowStep === 'SEARCH' ? (inputMode === 'SCAN' ? 'bg-blue-600' : 'bg-orange-500') : flowStep === 'BATCH_SELECT' ? 'bg-purple-600' : 'bg-green-600'} text-white transition-colors duration-300`}>
                    <div className="flex items-center gap-3">
                        {flowStep === 'SEARCH' ? (inputMode === 'SCAN' ? <QrCode size={28} /> : <Search size={28} />) : flowStep === 'BATCH_SELECT' ? <Layers size={28}/> : <Package size={28}/>}
                        <div>
                            <h2 className="text-xl font-bold uppercase tracking-wider">
                                {flowStep === 'SEARCH' ? (inputMode === 'SCAN' ? 'Quick Scan' : 'Product Search') : flowStep === 'BATCH_SELECT' ? 'Select Batch' : 'Enter Quantity'}
                            </h2>
                            <p className="text-xs opacity-80 font-mono">
                                {flowStep === 'SEARCH' ? 'Ready for Barcode Reader...' : flowStep === 'BATCH_SELECT' ? 'Multiple batches detected' : 'Confirm quantity to add'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-xs bg-white/20 px-2 py-1 rounded text-right font-medium">HOME to Close</div>
                        <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition"><X size={24} /></button>
                    </div>
                </div>

                <div className={`p-6 relative z-20 ${flowStep !== 'SEARCH' ? 'pb-2' : 'pb-6'}`}>
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type="text"
                            autoFocus
                            value={flowStep === 'QTY_INPUT' ? customQty : searchQuery}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            onBlur={() => setTimeout(() => inputRef.current?.focus(), 10)}
                            placeholder={flowStep === 'QTY_INPUT' ? "Enter Qty..." : inputMode === 'SCAN' ? "Scan barcode..." : "Type name..."}
                            className={`w-full text-3xl font-mono font-bold p-4 border-2 rounded-xl outline-none transition-all shadow-inner text-center ${
                                flowStep === 'QTY_INPUT' ? 'border-green-300 focus:border-green-600 text-green-900 bg-green-50' :
                                inputMode === 'SCAN' ? 'border-blue-200 focus:border-blue-600 placeholder-blue-200 text-blue-900' : 'border-orange-200 focus:border-orange-500 placeholder-orange-200 text-orange-900'
                            }`}
                        />
                        {flowStep === 'SEARCH' && suggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden z-30 text-left">
                                {suggestions.map((product, idx) => (
                                    <div key={product.id} onClick={() => handleProcessSearch(product.name)} className={`p-3 px-4 flex justify-between items-center cursor-pointer border-b last:border-0 ${idx === highlightedSuggestion ? 'bg-blue-50 text-blue-800' : 'hover:bg-gray-50'}`}>
                                        <div className="font-bold">{product.name}</div>
                                        <div className="text-sm opacity-60 font-mono">${Number(product.price).toFixed(2)}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {flowStep === 'SEARCH' && (
                        <div className="mt-4 h-6 flex items-center justify-center">
                            {lastScanned ? (
                                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold animate-in fade-in zoom-in-95 ${lastScanned.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {lastScanned.status === 'success' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />} {lastScanned.name}
                                </div>
                            ) : (<span className="text-gray-300 text-xs font-bold uppercase tracking-widest">Awaiting Scanner Input</span>)}
                        </div>
                    )}
                </div>

                <div className="flex-1 bg-gray-50 border-t border-gray-100 flex flex-col overflow-hidden">

                    {flowStep === 'SEARCH' && (
                        <>
                            <div className="px-6 py-2 bg-gray-100 border-b border-gray-200 flex justify-between items-center shrink-0">
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
                                                <div className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">{item.qty}</div>
                                                <span className="font-bold text-gray-700">{item.name}</span>
                                            </div>
                                            <ChevronRight size={16} className="text-gray-300" />
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}

                    {flowStep === 'BATCH_SELECT' && (
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            <div className="text-center text-xs font-bold text-purple-600 uppercase mb-2">Use ↑/↓ Arrows and Spacebar to select</div>
                            {matchedBatches.map((variant, idx) => {
                                const batchData = variant.batches?.[0];
                                const expiryRaw = batchData?.expiryDate || variant.stockExpiryDate;
                                const expiryDisplay = expiryRaw ? new Date(expiryRaw).toLocaleDateString() : 'No Expiry';
                                const batchNoDisplay = batchData?.batchNumber || variant.batchNumber || 'N/A';

                                // Clean up the UI so the cashier doesn't see the ugly "-1" suffix
                                const cleanBarcode = variant.barcode ? String(variant.barcode).split('-')[0] : '-';

                                return (
                                    <div key={variant.id} onClick={() => { setHighlightedBatchIndex(idx); setFlowStep('QTY_INPUT'); }}
                                         className={`flex justify-between items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${idx === highlightedBatchIndex ? 'bg-purple-50 border-purple-500 shadow-md ring-2 ring-purple-200' : 'bg-white border-gray-200 hover:border-purple-300'} ${variant.stock <= 0 && !variant.allowNegativeStock ? 'opacity-50 grayscale' : ''}`}>

                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={24} className="text-gray-400"/>
                                                <span className={`font-black text-2xl tracking-tight ${expiryRaw ? 'text-orange-600' : 'text-gray-800'}`}>
                                                    EXP: {expiryDisplay}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2 mt-1">
                                                <Package size={18} className="text-gray-500"/>
                                                <span className="font-bold text-lg text-gray-700">BATCH: {batchNoDisplay}</span>
                                                {variant.variantName && (
                                                    <span className="text-sm font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded ml-1">{variant.variantName}</span>
                                                )}
                                            </div>

                                            <div className="text-xs text-gray-400 flex gap-2 mt-1 font-mono font-bold">
                                                <span className="bg-gray-100 px-2 py-1 rounded">
                                                    <QrCode size={10} className="inline mr-1 -mt-0.5"/> BC: {cleanBarcode}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className="text-3xl font-black text-blue-600">${Number(variant.price).toFixed(2)}</div>
                                            <div className={`text-sm font-bold mt-2 bg-gray-100 px-3 py-1 rounded-full inline-block ${variant.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                {variant.stock > 0 ? `${variant.stock} In Stock` : 'Out of Stock'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {flowStep === 'QTY_INPUT' && (
                        <div className="flex flex-col h-full bg-white animate-in slide-in-from-right-4">
                            <div className="p-3 bg-green-50 border-b border-green-100 flex justify-between items-center px-6">
                                <span className="text-sm font-bold text-green-800">Adding: {matchedBatches[highlightedBatchIndex]?.name}</span>
                                <span className="text-sm font-bold text-gray-500">Price: ${Number(matchedBatches[highlightedBatchIndex]?.price).toFixed(2)}</span>
                            </div>
                            <div className="flex-1 flex items-center justify-center p-4">
                                <div className="w-full max-w-sm shadow-xl rounded-2xl overflow-hidden border border-gray-100">
                                    <VirtualKeyboard layout="numeric" onKeyPress={handleNumpadKey} onBackspace={() => handleNumpadKey('Backspace')} onEnter={() => handleNumpadKey('Enter')} className="bg-gray-50 border-none shadow-none" />
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between gap-4">
                                <button onClick={() => { if(matchedBatches.length > 1) setFlowStep('BATCH_SELECT'); else resetToSearch(); }} className="px-6 py-3 font-bold text-gray-500 hover:bg-gray-200 rounded-xl">Back</button>
                                <button onClick={commitProductToCart} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-lg">Confirm Quantity (Enter)</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuickScanModal;