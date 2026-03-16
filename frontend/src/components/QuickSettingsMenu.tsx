import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings, Download, Maximize, Minimize, Lock,
  Keyboard, Calculator, X, ChevronLeft, LogOut, MonitorSmartphone
} from 'lucide-react';
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

  // Logged In User State
  const [user, setUser] = useState<{name: string, email: string, role: string} | null>(null);

  // ✅ ZOOM STATE
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Fetch user and saved zoom on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('omnipos_user');
    if (storedUser) {
      try { setUser(JSON.parse(storedUser)); } catch (e) { console.error("Failed to parse user"); }
    }

    // Apply saved zoom perfectly on boot
    const savedZoom = localStorage.getItem('omnipos_zoom');
    if (savedZoom) {
      applyZoom(parseInt(savedZoom, 10));
    }
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) { setIsOpen(false); }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  // ==========================================
  // 🔍 THE MATH-PERFECT ZOOM HANDLER
  // ==========================================
  const applyZoom = (newZoom: number) => {
    setZoomLevel(newZoom);
    const scale = newZoom / 100;

    // Clear out the old buggy transform
    const rootElement = document.getElementById('root');
    if (rootElement) {
        rootElement.style.transform = '';
        rootElement.style.width = '';
        rootElement.style.height = '';
    }

    // 1. Apply true CSS Zoom to the body
    document.body.style.zoom = `${newZoom}%`;

    // 2. MAGIC: Set a math variable so the app knows how to shrink its 100vh containers!
    document.documentElement.style.setProperty('--zoom-factor', scale.toString());

    localStorage.setItem('omnipos_zoom', newZoom.toString());
  };

  const handleZoomOut = () => { if (zoomLevel > 50) applyZoom(zoomLevel - 10); };
  const handleZoomIn = () => { if (zoomLevel < 150) applyZoom(zoomLevel + 10); };
  const handleZoomReset = () => { applyZoom(100); };


  // --- Actions ---
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) { document.documentElement.requestFullscreen(); setIsFullscreen(true);
    } else { if (document.exitFullscreen) { document.exitFullscreen(); setIsFullscreen(false); } }
    setIsOpen(false);
  };

  const handleQuickBackup = async () => {
    try {
      const data = { timestamp: new Date().toISOString(), products: await db.products.toArray(), orders: await db.orders.toArray(), settings: await db.settings.toArray() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `OmniPOS_QuickBackup_${new Date().toISOString().split('T')[0]}.json`; a.click(); URL.revokeObjectURL(url); setIsOpen(false);
    } catch (err) { alert("Backup Failed"); }
  };

  const handleLogout = () => {
    localStorage.removeItem('omnipos_token'); localStorage.removeItem('omnipos_user');
    applyZoom(100); // Reset screen scale perfectly before leaving
    navigate('/login');
  };

  // --- Calculator Logic ---
  const handleCalcPress = (val: string) => {
    if (val === 'C') { setCalcInput(""); } else if (val === '=') { try { setCalcInput(eval(calcInput).toString()); } catch { setCalcInput("Error"); }
    } else if (val === 'back') { setCalcInput(calcInput.slice(0, -1)); } else { setCalcInput(calcInput + val); }
  };

  const calcBtns = ['C', '(', ')', '/', '7', '8', '9', '*', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', 'back', '='];

  return (
    <>
      {/* 🚀 MAGIC CSS TO PREVENT SCROLLBARS WHEN ZOOMING */}
      <style>{`
        /* Mathematically forces Tailwind full-screen elements to shrink so they never overflow! */
        .h-screen { height: calc(100vh / var(--zoom-factor, 1)) !important; }
        .min-h-screen { min-height: calc(100vh / var(--zoom-factor, 1)) !important; }
        .w-screen { width: calc(100vw / var(--zoom-factor, 1)) !important; }
        #root { height: calc(100vh / var(--zoom-factor, 1)) !important; }
      `}</style>

      {/* 1. LOCK SCREEN OVERLAY */}
      {isLocked && (
        <div className="fixed inset-0 z-[9999] bg-gray-900 flex flex-col items-center justify-center text-white space-y-6 animate-in fade-in duration-300">
            <div className="p-4 bg-gray-800 rounded-full shadow-2xl border border-gray-700"><Lock size={64} className="text-red-500 animate-pulse" /></div>
            <div className="text-center space-y-2"><h1 className="text-3xl font-bold tracking-widest">TERMINAL LOCKED</h1><p className="text-gray-400">System is secured. Authorize to resume.</p></div>
            <button onClick={() => setIsLocked(false)} className="px-8 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-bold text-lg transition-all active:scale-95 shadow-lg shadow-red-900/50">UNLOCK SYSTEM</button>
        </div>
      )}

      {/* 2. SHORTCUTS MODAL */}
      {showShortcuts && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowShortcuts(false)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center bg-gray-50"><h3 className="font-bold text-gray-800 flex items-center gap-2"><Keyboard size={18}/> Keyboard Shortcuts</h3><button onClick={() => setShowShortcuts(false)} className="text-gray-400 hover:text-red-500"><X size={20}/></button></div>
                <div className="p-4 space-y-2">
                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"><span className="text-sm text-gray-600">Instantly opens Checkout / Pay & Print</span><span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded border border-gray-300">End</span></div>
                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"><span className="text-sm text-gray-600">Toggles the Quick Scan Modal</span><span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded border border-gray-300">Home</span></div>
                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"><span className="text-sm text-gray-600">Jumps cursor straight to the Product Search Bar</span><span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded border border-gray-300">Insert</span></div>
                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"><span className="text-sm text-gray-600">Clears the Cart (Only works if you aren't typing in a text box, to prevent accidents!)</span><span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded border border-gray-300">Delete</span></div>
                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"><span className="text-sm text-gray-600">Toggles the Category Filter dropdown</span><span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded border border-gray-300">PgUp</span></div>
                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"><span className="text-sm text-gray-600">Toggles the Customer Facing Display (CFD) on and off</span><span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded border border-gray-300">PgDn</span></div>
                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"><span className="text-sm text-gray-600">Instantly close any open popup</span><span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded border border-gray-300">ESC</span></div>

                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"><span className="text-sm text-gray-600">Open Sales Records</span><span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded border border-gray-300">F10</span></div>
                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"><span className="text-sm text-gray-600">Open Resumes the last held sale</span><span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded border border-gray-300">F9</span></div>
                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"><span className="text-sm text-gray-600">OpenPuts the current sale on Hold</span><span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded border border-gray-300">F8</span></div>
                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"><span className="text-sm text-gray-600">Open Add Customer</span><span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded border border-gray-300">F7</span></div>
                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"><span className="text-sm text-gray-600">Open (Unit Calc)</span><span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded border border-gray-300">F6</span></div>
                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"><span className="text-sm text-gray-600">Clear cart an Page</span><span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded border border-gray-300">F5</span></div>
                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"><span className="text-sm text-gray-600">Open Process Refund</span><span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded border border-gray-300">F4</span></div>
                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"><span className="text-sm text-gray-600">Open Custom Item</span><span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded border border-gray-300">F3</span></div>
                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"><span className="text-sm text-gray-600">Open Search</span><span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded border border-gray-300">F2</span></div>
                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"><span className="text-sm text-gray-600">Open the "Update Customer" modal</span><span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded border border-gray-300">F1</span></div>

                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"><span className="text-sm text-gray-600">Move focus between buttons and inputs inside popups</span><span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded border border-gray-300">Arrows (Up, Down, Left, Right)</span></div>
                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"><span className="text-sm text-gray-600">Toggle checkboxes or "click" the focused button</span><span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded border border-gray-300">Spacebar</span></div>
                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"><span className="text-sm text-gray-600">Jump focus directly to "Search" or "Find" fields.</span><span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded border border-gray-300">TAB</span></div>
                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"><span className="text-sm text-gray-600">Submit or complete the popup action</span><span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded border border-gray-300">ENTER</span></div>

                </div>
                <div className="p-3 bg-gray-50 text-xs text-center text-gray-400 border-t">Note: Shortcuts are context-dependent.</div>
            </div>
        </div>
      )}

      {/* 3. CALCULATOR MODAL */}
      {showCalculator && (
        <div className="fixed inset-0 z-[100] bg-black/20 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowCalculator(false)}>
            <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden border border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="p-6 bg-gray-800 text-right"><div className="text-gray-400 text-xs mb-1">Mini Calculator</div><input type="text" value={calcInput} readOnly className="w-full bg-transparent text-white text-3xl font-mono text-right outline-none placeholder-gray-600" placeholder="0"/></div>
                <div className="grid grid-cols-4 gap-1 p-4 bg-gray-900">
                    {calcBtns.map((btn) => (<button key={btn} onClick={() => handleCalcPress(btn)} className={`h-14 rounded-lg font-bold text-lg transition-all active:scale-95 ${btn === '=' ? 'bg-blue-600 text-white col-span-1' : ''} ${btn === 'C' ? 'bg-red-500/20 text-red-500' : ''} ${['/','*','-','+'].includes(btn) ? 'bg-gray-700 text-blue-400' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}>{btn === 'back' ? <ChevronLeft size={20} className="mx-auto"/> : btn}</button>))}
                </div>
            </div>
        </div>
      )}

      {/* 4. MENU TRIGGER */}
      <div className="relative" ref={menuRef}>
        <button onClick={() => setIsOpen(!isOpen)} className={`p-2 rounded-full transition-colors ${isOpen ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`} title="Quick Settings">
          <Settings size={20} className={isOpen ? "animate-spin-slow" : ""} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2">
            {user && (
              <div className="px-4 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm flex-shrink-0">{user.name.charAt(0).toUpperCase()}</div>
                <div className="overflow-hidden"><p className="text-sm font-bold text-gray-800 truncate">{user.name}</p><p className="text-xs text-gray-500 truncate" title={user.email}>{user.email}</p><span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase rounded-full tracking-wider">{user.role}</span></div>
              </div>
            )}

            {/* ✅ ZOOM DISPLAY CONTROLS */}
            <div className="px-4 py-3 border-b border-gray-100 bg-white">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><MonitorSmartphone size={14}/> Display Scale</span>
                    <span className="text-xs font-black text-blue-600">{zoomLevel}%</span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleZoomOut} className="w-8 h-8 flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-600 font-bold transition-colors active:scale-95">-</button>
                    <button onClick={handleZoomIn} className="w-8 h-8 flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-600 font-bold transition-colors active:scale-95">+</button>
                    <button onClick={handleZoomReset} className="flex-1 h-8 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors active:scale-95">Reset Default</button>
                </div>
            </div>

            <div className="p-1 space-y-1">
              <button onClick={() => { setIsLocked(true); setIsOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors text-left"><Lock size={16} /> Lock Terminal</button>
              <button onClick={toggleFullscreen} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors text-left">{isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />} {isFullscreen ? 'Exit Fullscreen' : 'Enter POS Mode'}</button>
              <button onClick={() => { setShowCalculator(true); setIsOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-emerald-600 rounded-lg transition-colors text-left"><Calculator size={16} /> Mini Calculator</button>
              <button onClick={() => { setShowShortcuts(true); setIsOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-orange-600 rounded-lg transition-colors text-left"><Keyboard size={16} /> Keyboard Shortcuts</button>

              {user?.role === 'admin' && (
                <>
                  <div className="my-1 border-t border-gray-100"></div>
                  <button onClick={handleQuickBackup} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-green-600 rounded-lg transition-colors text-left"><Download size={16} /> Backup Data Now</button>
                  <button onClick={() => { navigate('/settings'); setIsOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-purple-600 rounded-lg transition-colors text-left"><Settings size={16} /> Full Configuration</button>
                </>
              )}

              <div className="my-1 border-t border-gray-100"></div>
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left"><LogOut size={16} /> Sign Out</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};