import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings, Download, Maximize, Minimize, Lock,
  Keyboard, Calculator, X, ChevronLeft
} from 'lucide-react'; // ✅ Removed unused 'Delete'
import { db } from '../db/db';

export const QuickSettingsMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  // Modal States
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // Calculator State
  const [calcInput, setCalcInput] = useState("");

  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Actions ---

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
    setIsOpen(false);
  };

  const handleQuickBackup = async () => {
    try {
      const data = {
        timestamp: new Date().toISOString(),
        products: await db.products.toArray(),
        orders: await db.orders.toArray(),
        settings: await db.settings.toArray()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OmniPOS_QuickBackup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setIsOpen(false);
    } catch (err) {
      alert("Backup Failed");
      console.error(err);
    }
  };

  // --- Calculator Logic ---
  const handleCalcPress = (val: string) => {
    if (val === 'C') {
        setCalcInput("");
    } else if (val === '=') {
        try {
            // eslint-disable-next-line
            setCalcInput(eval(calcInput).toString()); // Simple eval for local calculator
        } catch {
            setCalcInput("Error");
        }
    } else if (val === 'back') {
        setCalcInput(calcInput.slice(0, -1));
    } else {
        setCalcInput(calcInput + val);
    }
  };

  const calcBtns = [
    'C', '(', ')', '/',
    '7', '8', '9', '*',
    '4', '5', '6', '-',
    '1', '2', '3', '+',
    '0', '.', 'back', '='
  ];

  return (
    <>
      {/* 1. LOCK SCREEN OVERLAY */}
      {isLocked && (
        <div className="fixed inset-0 z-[9999] bg-gray-900 flex flex-col items-center justify-center text-white space-y-6 animate-in fade-in duration-300">
            <div className="p-4 bg-gray-800 rounded-full shadow-2xl border border-gray-700">
                <Lock size={64} className="text-red-500 animate-pulse" />
            </div>
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-widest">TERMINAL LOCKED</h1>
                <p className="text-gray-400">System is secured. Authorize to resume.</p>
            </div>
            <button
                onClick={() => setIsLocked(false)}
                className="px-8 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-bold text-lg transition-all active:scale-95 shadow-lg shadow-red-900/50"
            >
                UNLOCK SYSTEM
            </button>
        </div>
      )}

      {/* 2. SHORTCUTS MODAL */}
      {showShortcuts && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowShortcuts(false)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Keyboard size={18}/> Keyboard Shortcuts
                    </h3>
                    <button onClick={() => setShowShortcuts(false)} className="text-gray-400 hover:text-red-500"><X size={20}/></button>
                </div>
                <div className="p-4 space-y-2">
                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                        <span className="text-sm text-gray-600">Toggle Fullscreen</span>
                        <span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded border border-gray-300">F11</span>
                    </div>
                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                        <span className="text-sm text-gray-600">Print Last Receipt</span>
                        <span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded border border-gray-300">Ctrl + P</span>
                    </div>
                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                        <span className="text-sm text-gray-600">Quick Search</span>
                        <span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded border border-gray-300">Ctrl + K</span>
                    </div>
                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                        <span className="text-sm text-gray-600">New Sale</span>
                        <span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded border border-gray-300">Alt + N</span>
                    </div>
                </div>
                <div className="p-3 bg-gray-50 text-xs text-center text-gray-400 border-t">
                    Note: Shortcuts are context-dependent.
                </div>
            </div>
        </div>
      )}

      {/* 3. CALCULATOR MODAL */}
      {showCalculator && (
        <div className="fixed inset-0 z-[100] bg-black/20 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowCalculator(false)}>
            <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden border border-gray-700" onClick={e => e.stopPropagation()}>
                {/* Display */}
                <div className="p-6 bg-gray-800 text-right">
                    <div className="text-gray-400 text-xs mb-1">Mini Calculator</div>
                    <input
                        type="text"
                        value={calcInput}
                        readOnly
                        className="w-full bg-transparent text-white text-3xl font-mono text-right outline-none placeholder-gray-600"
                        placeholder="0"
                    />
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-4 gap-1 p-4 bg-gray-900">
                    {calcBtns.map((btn) => (
                        <button
                            key={btn}
                            onClick={() => handleCalcPress(btn)}
                            className={`
                                h-14 rounded-lg font-bold text-lg transition-all active:scale-95
                                ${btn === '=' ? 'bg-blue-600 text-white col-span-1' : ''}
                                ${btn === 'C' ? 'bg-red-500/20 text-red-500' : ''}
                                ${['/','*','-','+'].includes(btn) ? 'bg-gray-700 text-blue-400' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}
                            `}
                        >
                            {btn === 'back' ? <ChevronLeft size={20} className="mx-auto"/> : btn}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* 4. MENU TRIGGER */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`p-2 rounded-full transition-colors ${isOpen ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
          title="Quick Settings"
        >
          <Settings size={20} className={isOpen ? "animate-spin-slow" : ""} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">

            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-xs font-bold text-gray-500 uppercase">Quick Actions</p>
            </div>

            <div className="p-1 space-y-1">
              {/* Lock Screen */}
              <button
                onClick={() => { setIsLocked(true); setIsOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors text-left"
              >
                <Lock size={16} />
                Lock Terminal
              </button>

              {/* Fullscreen Toggle */}
              <button
                onClick={toggleFullscreen}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors text-left"
              >
                {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                {isFullscreen ? 'Exit Fullscreen' : 'Enter POS Mode'}
              </button>

              {/* Calculator */}
              <button
                onClick={() => { setShowCalculator(true); setIsOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-emerald-600 rounded-lg transition-colors text-left"
              >
                <Calculator size={16} />
                Mini Calculator
              </button>

              {/* Shortcuts */}
              <button
                onClick={() => { setShowShortcuts(true); setIsOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-orange-600 rounded-lg transition-colors text-left"
              >
                <Keyboard size={16} />
                Keyboard Shortcuts
              </button>

              <div className="my-1 border-t border-gray-100"></div>

              {/* Quick Backup */}
              <button
                onClick={handleQuickBackup}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-green-600 rounded-lg transition-colors text-left"
              >
                <Download size={16} />
                Backup Data Now
              </button>

              {/* Full Settings Link */}
              <button
                onClick={() => { navigate('/settings'); setIsOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-purple-600 rounded-lg transition-colors text-left"
              >
                <Settings size={16} />
                Full Configuration
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};