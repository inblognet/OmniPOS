import React, { useEffect, useState, useRef } from 'react';
import { db, StoreSettings, DEFAULT_THEME } from '../../db/db';
import {
  Save, Building, Phone, MapPin, Percent, Download, Upload,
  AlertTriangle, Banknote, Mail, Image as ImageIcon, Printer, Type,
  Palette, RefreshCcw, Monitor, Sidebar, Layout,
  Trash2, Database, ShieldAlert, Sparkles
} from 'lucide-react';

// ✅ Theme Presets Configuration
const THEME_PRESETS = [
  { name: 'System Default', colors: DEFAULT_THEME },
  {
    name: 'Light Mode',
    colors: {
      primaryColor: '#3b82f6', navbarColor: '#ffffff', sidebarColor: '#f3f4f6',
      backgroundColor: '#f9fafb', cardColor: '#ffffff', textColor: '#1f2937',
      sidebarTextColor: '#4b5563', labelColor: '#374151', subTextColor: '#6b7280'
    }
  },
  {
    name: 'Dark Mode',
    colors: {
      primaryColor: '#3b82f6', navbarColor: '#111827', sidebarColor: '#1f2937',
      backgroundColor: '#000000', cardColor: '#111827', textColor: '#f3f4f6',
      sidebarTextColor: '#9ca3af', labelColor: '#d1d5db', subTextColor: '#6b7280'
    }
  },
  {
    name: 'Midnight Bloom',
    colors: {
      primaryColor: '#8b5cf6', navbarColor: '#2e1065', sidebarColor: '#1e1b4b',
      backgroundColor: '#020617', cardColor: '#1e293b', textColor: '#e2e8f0',
      sidebarTextColor: '#a78bfa', labelColor: '#c4b5fd', subTextColor: '#64748b'
    }
  },
  {
    name: 'Amethyst Haze',
    colors: {
      primaryColor: '#d946ef', navbarColor: '#4a044e', sidebarColor: '#2e1065',
      backgroundColor: '#2e1065', cardColor: '#581c87', textColor: '#fdf4ff',
      sidebarTextColor: '#f0abfc', labelColor: '#fae8ff', subTextColor: '#c084fc'
    }
  },
  {
    name: 'Cyberpunk',
    colors: {
      primaryColor: '#f472b6', navbarColor: '#000000', sidebarColor: '#18181b',
      backgroundColor: '#09090b', cardColor: '#27272a', textColor: '#22d3ee',
      sidebarTextColor: '#f472b6', labelColor: '#c084fc', subTextColor: '#a1a1aa'
    }
  },
  {
    name: 'Solar Dusk',
    colors: {
      primaryColor: '#f97316', navbarColor: '#431407', sidebarColor: '#2a0a04',
      backgroundColor: '#0c0a09', cardColor: '#1c1917', textColor: '#fdba74',
      sidebarTextColor: '#fb923c', labelColor: '#fed7aa', subTextColor: '#78716c'
    }
  },
  {
    name: 'Emerald Corporate',
    colors: {
      primaryColor: '#10b981', navbarColor: '#064e3b', sidebarColor: '#022c22',
      backgroundColor: '#065f46', cardColor: '#064e3b', textColor: '#d1fae5',
      sidebarTextColor: '#6ee7b7', labelColor: '#a7f3d0', subTextColor: '#34d399'
    }
  },
  {
    name: 'Ivory Prime',
    colors: {
      primaryColor: '#d97706', navbarColor: '#fffbeb', sidebarColor: '#fef3c7',
      backgroundColor: '#ffffff', cardColor: '#ffffff', textColor: '#451a03',
      sidebarTextColor: '#92400e', labelColor: '#b45309', subTextColor: '#d97706'
    }
  },
  {
    name: 'Steel Frost',
    colors: {
      primaryColor: '#64748b', navbarColor: '#f8fafc', sidebarColor: '#f1f5f9',
      backgroundColor: '#e2e8f0', cardColor: '#ffffff', textColor: '#334155',
      sidebarTextColor: '#475569', labelColor: '#475569', subTextColor: '#94a3b8'
    }
  },
  {
    name: 'Neo Brutalism',
    colors: {
      primaryColor: '#000000', navbarColor: '#facc15', sidebarColor: '#ffffff',
      backgroundColor: '#e0f2fe', cardColor: '#ffffff', textColor: '#000000',
      sidebarTextColor: '#000000', labelColor: '#000000', subTextColor: '#4b5563'
    }
  },
  {
    name: 'Ocean Breeze',
    colors: {
      primaryColor: '#0ea5e9', navbarColor: '#f0f9ff', sidebarColor: '#e0f2fe',
      backgroundColor: '#f0f9ff', cardColor: '#ffffff', textColor: '#0c4a6e',
      sidebarTextColor: '#0284c7', labelColor: '#0369a1', subTextColor: '#7dd3fc'
    }
  },
  {
    name: 'Graphite',
    colors: {
      primaryColor: '#9ca3af', navbarColor: '#111827', sidebarColor: '#1f2937',
      backgroundColor: '#374151', cardColor: '#1f2937', textColor: '#f3f4f6',
      sidebarTextColor: '#d1d5db', labelColor: '#e5e7eb', subTextColor: '#9ca3af'
    }
  }
];

const SettingsScreen: React.FC = () => {
  const [settings, setSettings] = useState<StoreSettings>({
    storeName: '',
    address: '',
    phone: '',
    email: '',
    taxRate: 0.08,
    currency: '$',
    receiptWidth: '80mm',
    showLogo: false,
    headerText: '',
    footerText: '',
    logoUrl: '',
    theme: DEFAULT_THEME
  });

  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    db.settings.get(1).then((data) => {
      if (data) {
          setSettings({ ...data, theme: { ...DEFAULT_THEME, ...data.theme } });
      }
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.settings.put({ ...settings, id: 1 });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // --- Theme Logic ---
  const resetTheme = () => {
    if(confirm("Reset all colors to Factory Default?")) {
        setSettings({ ...settings, theme: DEFAULT_THEME });
    }
  };

  const updateColor = (key: keyof typeof DEFAULT_THEME, value: string) => {
    setSettings(prev => ({
        ...prev,
        theme: { ...prev.theme!, [key]: value }
    }));
  };

  const applyPreset = (presetName: string) => {
    const preset = THEME_PRESETS.find(p => p.name === presetName);
    if (preset) {
        setSettings(prev => ({
            ...prev,
            theme: { ...prev.theme!, ...preset.colors }
        }));
    }
  };

  // --- Logic: Logo Upload ---
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({
            ...settings,
            logoUrl: reader.result as string,
            showLogo: true
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Logic: Backup Export ---
  const handleExport = async () => {
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
      a.download = `OmniPOS_Backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to export data.");
      console.error(err);
    }
  };

  // --- Logic: Restore Import ---
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("⚠️ WARNING: This will overwrite your current inventory and sales history. Are you sure?")) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        await db.transaction('rw', db.products, db.orders, db.settings, async () => {
          await db.products.clear();
          await db.orders.clear();
          await db.settings.clear();

          if (json.products) await db.products.bulkAdd(json.products);
          if (json.orders) await db.orders.bulkAdd(json.orders);
          if (json.settings) await db.settings.bulkAdd(json.settings);
        });

        alert("✅ Database restored successfully! Reloading...");
        window.location.reload();
      } catch (err) {
        alert("❌ Failed to import file. Invalid JSON.");
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  // --- ✅ NEW LOGIC: DATA CLEANUP & RESET ---
  const handleClearOrders = async () => {
    if (confirm("⚠️ WARNING: This will DELETE all Sales History, Revenue Data, and Logs. \n\nThis action cannot be undone. Continue?")) {
      try {
        await db.orders.clear();
        alert("✅ Sales history has been cleared.");
        window.location.reload();
      } catch (error) {
        console.error("Failed to clear orders:", error);
        alert("Error clearing data.");
      }
    }
  };

  const handleClearInventory = async () => {
    if (confirm("⚠️ WARNING: This will DELETE all Products and Stock levels. \n\nYour Sales History will remain. Continue?")) {
      try {
        await db.products.clear();
        alert("✅ Inventory has been cleared.");
        window.location.reload();
      } catch (error) {
        console.error("Failed to clear inventory:", error);
        alert("Error clearing data.");
      }
    }
  };

  const handleFactoryReset = async () => {
    const code = prompt("🔴 DANGER: FACTORY RESET \n\nThis will wipe EVERYTHING (Products, Orders, Settings). \n\nType 'DELETE' to confirm:");
    if (code === 'DELETE') {
      try {
        await db.delete(); // Deletes the entire database
        alert("✅ System Reset Complete. Reloading...");
        window.location.reload(); // App will recreate DB on restart
      } catch (error) {
        console.error("Factory reset failed:", error);
        alert("Reset failed.");
      }
    }
  };


  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">

      {/* 1. Store Configuration Section */}
      <section>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Store Configuration</h1>
          <p className="text-gray-500">Manage your store details, theme, and receipt layout.</p>
        </div>

        <form onSubmit={handleSave} className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 space-y-6">

          {/* Store Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    <Building size={16} /> Store Name
                </label>
                <input
                    type="text" required value={settings.storeName}
                    onChange={(e) => setSettings({...settings, storeName: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>
            <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    <Phone size={16} /> Phone Number
                </label>
                <input
                    type="text" required value={settings.phone}
                    onChange={(e) => setSettings({...settings, phone: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    <Mail size={16} /> Email Address
                </label>
                <input
                    type="email" value={settings.email || ''}
                    onChange={(e) => setSettings({...settings, email: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="support@store.com"
                />
            </div>
            <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    <MapPin size={16} /> Address
                </label>
                <input
                    type="text" required value={settings.address}
                    onChange={(e) => setSettings({...settings, address: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <Percent size={16} /> Tax Rate (Decimal)
              </label>
              <div className="flex items-center gap-4">
                  <input
                      type="number" step="0.01" min="0" max="1" required value={settings.taxRate}
                      onChange={(e) => setSettings({...settings, taxRate: parseFloat(e.target.value)})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <span className="text-gray-500 font-medium">= {(settings.taxRate * 100).toFixed(0)}%</span>
              </div>
            </div>

            {/* Currency Selector */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <Banknote size={16} /> Currency Symbol
              </label>
              <select
                  value={settings.currency || '$'}
                  onChange={(e) => setSettings({...settings, currency: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                  <option value="$">Dollar ($)</option>
                  <option value="€">Euro (€)</option>
                  <option value="£">Pound (£)</option>
                  <option value="Rs">Rupee (Rs)</option>
                  <option value="¥">Yen (¥)</option>
                  <option value="kr">Kroner (kr)</option>
                  <option value="LKR">LKR (Rs)</option>
              </select>
            </div>
          </div>

          {/* APPEARANCE & THEME SECTION */}
           <div className="pt-6 border-t border-gray-100">
             <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Palette size={20} className="text-purple-600"/> Appearance & Theme
                 </h3>
                 <button type="button" onClick={resetTheme} className="text-sm text-gray-500 hover:text-red-600 flex items-center gap-1">
                    <RefreshCcw size={14} /> Reset Defaults
                 </button>
             </div>

             {/* ✅ NEW: Theme Presets Dropdown */}
             <div className="mb-6">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Sparkles size={16} className="text-yellow-500" /> Theme Presets
                </label>
                <select
                    onChange={(e) => applyPreset(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white font-medium text-gray-700"
                    defaultValue=""
                >
                    <option value="" disabled>Select a Theme...</option>
                    {THEME_PRESETS.map((preset) => (
                        <option key={preset.name} value={preset.name}>
                            {preset.name}
                        </option>
                    ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">Selecting a preset will instantly update all color fields below.</p>
             </div>

             {/* Individual Color Pickers */}
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Primary Color */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full shadow-sm border border-gray-200" style={{background: settings.theme?.primaryColor}}></div>
                        System Primary Color
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="color"
                            value={settings.theme?.primaryColor}
                            onChange={(e) => updateColor('primaryColor', e.target.value)}
                            className="h-10 w-14 p-1 rounded cursor-pointer border border-gray-300 bg-white"
                        />
                        <input
                            type="text"
                            value={settings.theme?.primaryColor}
                            onChange={(e) => updateColor('primaryColor', e.target.value)}
                            className="flex-1 px-3 border border-gray-300 rounded-lg uppercase font-mono text-sm"
                        />
                    </div>
                </div>

                {/* Navbar Color */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Monitor size={14}/> Top Navigation Bar
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="color"
                            value={settings.theme?.navbarColor}
                            onChange={(e) => updateColor('navbarColor', e.target.value)}
                            className="h-10 w-14 p-1 rounded cursor-pointer border border-gray-300 bg-white"
                        />
                        <input
                            type="text"
                            value={settings.theme?.navbarColor}
                            onChange={(e) => updateColor('navbarColor', e.target.value)}
                            className="flex-1 px-3 border border-gray-300 rounded-lg uppercase font-mono text-sm"
                        />
                    </div>
                </div>

                {/* Sidebar Background */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Sidebar size={14}/> Sidebar Background
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="color"
                            value={settings.theme?.sidebarColor}
                            onChange={(e) => updateColor('sidebarColor', e.target.value)}
                            className="h-10 w-14 p-1 rounded cursor-pointer border border-gray-300 bg-white"
                        />
                        <input
                            type="text"
                            value={settings.theme?.sidebarColor}
                            onChange={(e) => updateColor('sidebarColor', e.target.value)}
                            className="flex-1 px-3 border border-gray-300 rounded-lg uppercase font-mono text-sm"
                        />
                    </div>
                </div>

                {/* App Background */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2"><Layout size={14}/> App Background</label>
                    <div className="flex gap-2">
                        <input
                            type="color"
                            value={settings.theme?.backgroundColor}
                            onChange={(e) => updateColor('backgroundColor', e.target.value)}
                            className="h-10 w-14 p-1 rounded cursor-pointer border border-gray-300 bg-white"
                        />
                        <input
                            type="text"
                            value={settings.theme?.backgroundColor}
                            onChange={(e) => updateColor('backgroundColor', e.target.value)}
                            className="flex-1 px-3 border border-gray-300 rounded-lg uppercase font-mono text-sm"
                        />
                    </div>
                </div>

                {/* Card Background */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Content Cards</label>
                    <div className="flex gap-2">
                        <input
                            type="color"
                            value={settings.theme?.cardColor}
                            onChange={(e) => updateColor('cardColor', e.target.value)}
                            className="h-10 w-14 p-1 rounded cursor-pointer border border-gray-300 bg-white"
                        />
                        <input
                            type="text"
                            value={settings.theme?.cardColor}
                            onChange={(e) => updateColor('cardColor', e.target.value)}
                            className="flex-1 px-3 border border-gray-300 rounded-lg uppercase font-mono text-sm"
                        />
                    </div>
                </div>

                {/* Main Text Color */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Main Text Color</label>
                    <div className="flex gap-2">
                        <input
                            type="color"
                            value={settings.theme?.textColor}
                            onChange={(e) => updateColor('textColor', e.target.value)}
                            className="h-10 w-14 p-1 rounded cursor-pointer border border-gray-300 bg-white"
                        />
                        <input
                            type="text"
                            value={settings.theme?.textColor}
                            onChange={(e) => updateColor('textColor', e.target.value)}
                            className="flex-1 px-3 border border-gray-300 rounded-lg uppercase font-mono text-sm"
                        />
                    </div>
                </div>

                {/* Sidebar Text Color */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Sidebar size={14}/> Sidebar Text Color
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="color"
                            value={settings.theme?.sidebarTextColor}
                            onChange={(e) => updateColor('sidebarTextColor', e.target.value)}
                            className="h-10 w-14 p-1 rounded cursor-pointer border border-gray-300 bg-white"
                        />
                        <input
                            type="text"
                            value={settings.theme?.sidebarTextColor}
                            onChange={(e) => updateColor('sidebarTextColor', e.target.value)}
                            className="flex-1 px-3 border border-gray-300 rounded-lg uppercase font-mono text-sm"
                        />
                    </div>
                </div>

                {/* Label Color */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Form Labels</label>
                    <div className="flex gap-2">
                        <input
                            type="color"
                            value={settings.theme?.labelColor}
                            onChange={(e) => updateColor('labelColor', e.target.value)}
                            className="h-10 w-14 p-1 rounded cursor-pointer border border-gray-300 bg-white"
                        />
                        <input
                            type="text"
                            value={settings.theme?.labelColor}
                            onChange={(e) => updateColor('labelColor', e.target.value)}
                            className="flex-1 px-3 border border-gray-300 rounded-lg uppercase font-mono text-sm"
                        />
                    </div>
                </div>

                {/* Sub-text Color */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Sub-text & Help</label>
                    <div className="flex gap-2">
                        <input
                            type="color"
                            value={settings.theme?.subTextColor}
                            onChange={(e) => updateColor('subTextColor', e.target.value)}
                            className="h-10 w-14 p-1 rounded cursor-pointer border border-gray-300 bg-white"
                        />
                        <input
                            type="text"
                            value={settings.theme?.subTextColor}
                            onChange={(e) => updateColor('subTextColor', e.target.value)}
                            className="flex-1 px-3 border border-gray-300 rounded-lg uppercase font-mono text-sm"
                        />
                    </div>
                </div>

             </div>
           </div>


          {/* --- RECEIPT CUSTOMIZATION SECTION --- */}
          <div className="pt-6 border-t border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                 <Printer size={20} className="text-blue-600"/> Receipt Customization
              </h3>

              {/* Logo Upload */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                    <ImageIcon size={16} /> Store Logo
                </label>
                <div className="flex items-start gap-4">
                  {settings.logoUrl ? (
                    <div className="relative group">
                          <img src={settings.logoUrl} alt="Preview" className="h-20 w-20 object-contain border border-gray-300 bg-white rounded-md p-1" />
                          <button
                            type="button"
                            onClick={() => setSettings({...settings, logoUrl: '', showLogo: false})}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600"
                            title="Remove Logo"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                          </button>
                    </div>
                  ) : (
                      <div className="h-20 w-20 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center text-gray-400">
                          <ImageIcon size={24} />
                      </div>
                  )}

                  <div className="flex flex-col gap-2">
                      <input
                          type="file"
                          ref={logoInputRef}
                          onChange={handleLogoUpload}
                          accept="image/*"
                          className="hidden"
                      />
                      <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          className="px-4 py-2 text-sm bg-white hover:bg-gray-100 rounded-lg border border-gray-300 transition-colors font-medium text-gray-700"
                      >
                          {settings.logoUrl ? 'Change Logo' : 'Upload Logo'}
                      </button>

                      <div className="flex items-center gap-2 mt-1">
                          <input
                            type="checkbox"
                            id="showLogo"
                            checked={settings.showLogo}
                            disabled={!settings.logoUrl}
                            onChange={(e) => setSettings({...settings, showLogo: e.target.checked})}
                            className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 border-gray-300"
                          />
                          <label htmlFor="showLogo" className={`text-sm ${!settings.logoUrl ? 'text-gray-400' : 'text-gray-700'}`}>
                              Print logo on receipt
                          </label>
                      </div>
                  </div>
                </div>
              </div>

              {/* Width Selector */}
              <div className="mb-6">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Printer size={16} /> Paper Width
                </label>
                <div className="flex gap-4">
                  <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${settings.receiptWidth === '80mm' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input
                        type="radio"
                        name="width"
                        value="80mm"
                        checked={settings.receiptWidth === '80mm'}
                        onChange={(e) => setSettings({...settings, receiptWidth: e.target.value})}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                          <span className="block text-sm font-bold text-gray-800">80mm (Standard)</span>
                          <span className="text-xs text-gray-500">Best for thermal printers</span>
                      </div>
                  </label>

                  <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${settings.receiptWidth === '58mm' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input
                        type="radio"
                        name="width"
                        value="58mm"
                        checked={settings.receiptWidth === '58mm'}
                        onChange={(e) => setSettings({...settings, receiptWidth: e.target.value})}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                          <span className="block text-sm font-bold text-gray-800">58mm (Small)</span>
                          <span className="text-xs text-gray-500">Compact handheld printers</span>
                      </div>
                  </label>
                </div>
              </div>

              {/* Custom Text */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                        <Type size={16} /> Header Message
                    </label>
                    <input
                        type="text"
                        placeholder="e.g. Welcome to OmniPOS!"
                        value={settings.headerText || ''}
                        onChange={(e) => setSettings({...settings, headerText: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">Appears below the store name</p>
                </div>
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                        <Type size={16} /> Footer Message
                    </label>
                    <input
                        type="text"
                        placeholder="e.g. Thank you for visiting!"
                        value={settings.footerText || ''}
                        onChange={(e) => setSettings({...settings, footerText: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">Appears at the very bottom</p>
                </div>
              </div>
            </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-between sticky bottom-0 bg-white p-4 -mx-8 -mb-8 rounded-b-xl shadow-inner">
              {saved ? <span className="text-green-600 font-medium animate-pulse">Settings Saved!</span> : <span></span>}
              <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-blue-100">
                  <Save size={18} /> Save All Changes
              </button>
          </div>
        </form>
      </section>

      {/* 2. Data Management Section */}
      <section>
        <div className="mb-6 flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-800">Data Management</h2>
            <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full font-bold">Critical</span>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-start gap-4 mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
                <AlertTriangle className="text-blue-600 shrink-0 mt-1" size={24} />
                <div className="text-sm text-blue-800">
                    <p className="font-bold mb-1">About Data Storage</p>
                    <p>Your data is stored locally in this browser. We recommend exporting a backup weekly to prevent data loss if your browser cache is cleared.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <button
                    onClick={handleExport}
                    className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
                >
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-full group-hover:scale-110 transition-transform">
                        <Download size={24} />
                    </div>
                    <div className="text-center">
                        <span className="block font-bold text-gray-700">Export Backup</span>
                        <span className="text-xs text-gray-500">Download .json file</span>
                    </div>
                </button>

                <div className="relative">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImport}
                        accept=".json"
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-red-500 hover:bg-red-50 transition-all group"
                    >
                        <div className="p-3 bg-gray-100 text-gray-600 rounded-full group-hover:bg-red-100 group-hover:text-red-600 transition-colors">
                            <Upload size={24} />
                        </div>
                        <div className="text-center">
                            <span className="block font-bold text-gray-700">Restore Data</span>
                            <span className="text-xs text-gray-500">Overwrite from backup</span>
                        </div>
                    </button>
                </div>
            </div>

            {/* ✅ NEW: DANGER ZONE */}
            <div className="pt-6 border-t border-gray-100">
                 <h3 className="font-bold text-red-700 flex items-center gap-2 mb-4">
                     <ShieldAlert size={20} /> Danger Zone
                 </h3>
                 <p className="text-sm text-gray-500 mb-6">Use these tools to clean up old data or reset the system for a new store.</p>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Clear Sales */}
                    <div className="p-4 border border-gray-200 rounded-lg hover:border-red-300 transition-colors">
                        <div className="flex items-center gap-2 mb-2 text-gray-800 font-bold">
                            <Database size={18} className="text-blue-500"/>
                            Clear Sales History
                        </div>
                        <p className="text-xs text-gray-500 mb-4 h-10">
                            Deletes all orders, revenue stats, and refunds. Keeps inventory intact.
                        </p>
                        <button
                            onClick={handleClearOrders}
                            className="w-full py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-red-50 hover:text-red-600 hover:border-red-200 font-medium text-sm transition-colors"
                        >
                            Clear Orders
                        </button>
                    </div>

                    {/* Clear Inventory */}
                    <div className="p-4 border border-gray-200 rounded-lg hover:border-red-300 transition-colors">
                        <div className="flex items-center gap-2 mb-2 text-gray-800 font-bold">
                            <Trash2 size={18} className="text-orange-500"/>
                            Clear Inventory
                        </div>
                        <p className="text-xs text-gray-500 mb-4 h-10">
                            Deletes all products and stock levels. Keeps sales history logs.
                        </p>
                        <button
                            onClick={handleClearInventory}
                            className="w-full py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-red-50 hover:text-red-600 hover:border-red-200 font-medium text-sm transition-colors"
                        >
                            Clear Products
                        </button>
                    </div>

                    {/* Factory Reset */}
                    <div className="p-4 border border-red-200 bg-red-50/50 rounded-lg hover:bg-red-50 transition-colors">
                        <div className="flex items-center gap-2 mb-2 text-red-700 font-bold">
                            <ShieldAlert size={18} />
                            Factory Reset
                        </div>
                        <p className="text-xs text-red-600/80 mb-4 h-10">
                            Wipes <strong>EVERYTHING</strong>. Used for fresh installations or new stores.
                        </p>
                        <button
                            onClick={handleFactoryReset}
                            className="w-full py-2 bg-red-600 text-white rounded hover:bg-red-700 shadow-sm font-bold text-sm transition-colors"
                        >
                            Reset Everything
                        </button>
                    </div>
                 </div>
            </div>

        </div>
      </section>
    </div>
  );
};

export default SettingsScreen;