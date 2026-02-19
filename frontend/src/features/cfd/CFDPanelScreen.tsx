import React, { useState, useEffect } from 'react';
import { Save, Image as ImageIcon, ToggleLeft, Layout } from 'lucide-react';
import { db } from '../../db/db';

export interface CFDConfig {
  showTax: boolean;
  showDiscount: boolean;
  showGross: boolean;
  showItemCount: boolean;
  welcomeMessage: string;
  promotionalImages: string[];
}

const DEFAULT_CFD_CONFIG: CFDConfig = {
  showTax: true,
  showDiscount: true,
  showGross: true,
  showItemCount: true,
  welcomeMessage: "Welcome to OmniPOS. We're glad you're here!",
  promotionalImages: []
};

const CFDPanelScreen: React.FC = () => {
  const [config, setConfig] = useState<CFDConfig>(DEFAULT_CFD_CONFIG);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      const existing = await db.settings.get(1);
      // ✅ Added 'as any' to bypass Dexie schema strictness
      if (existing && (existing as any).cfdSettings) {
        setConfig((existing as any).cfdSettings);
      }
    };
    loadConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const existing = await db.settings.get(1);
    if (existing) {
        // ✅ Added 'as any' to allow saving new properties
        await db.settings.put({ ...existing, cfdSettings: config } as any);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    }
  };

  const toggleSetting = (key: keyof CFDConfig) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex justify-between items-center mb-6">
        <div>
           <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <Layout className="text-indigo-600" /> CFD Configuration
           </h1>
           <p className="text-gray-500 text-sm">Manage Customer Front Display rules and advertisements.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 space-y-8">

        <div>
            <h3 className="font-bold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2">
                <ToggleLeft className="text-gray-500"/> Display Visibility Toggles
            </h3>
            <div className="grid grid-cols-2 gap-4">
                {[
                    { key: 'showTax', label: 'Show Tax Amount' },
                    { key: 'showDiscount', label: 'Show Discount Applied' },
                    { key: 'showGross', label: 'Show Gross Subtotal' },
                    { key: 'showItemCount', label: 'Show Total Item Count' }
                ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 border rounded-xl bg-gray-50">
                        <span className="font-medium text-gray-700">{item.label}</span>
                        <input
                            type="checkbox"
                            checked={config[item.key as keyof CFDConfig] as boolean}
                            onChange={() => toggleSetting(item.key as keyof CFDConfig)}
                            className="w-5 h-5 text-indigo-600 rounded cursor-pointer"
                        />
                    </div>
                ))}
            </div>
        </div>

        <div>
            <h3 className="font-bold text-gray-800 border-b pb-2 mb-4">Idle Mode & Messaging</h3>
            <label className="block text-sm font-bold text-gray-600 mb-2">Welcome Message</label>
            <input
                type="text"
                value={config.welcomeMessage}
                onChange={(e) => setConfig({...config, welcomeMessage: e.target.value})}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. Welcome to Our Store!"
            />
        </div>

        <div>
            <h3 className="font-bold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2">
                <ImageIcon className="text-gray-500"/> Promotional Media
            </h3>
            <p className="text-sm text-gray-500 mb-4">Upload banners to display in the carousel when idle, or on the left side during checkout.</p>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-400 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors">
                <p>Click to upload image (Coming in Phase 2)</p>
            </div>
        </div>

        <div className="flex justify-end pt-4">
            <button type="submit" className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg">
                <Save size={18}/> {saved ? 'Saved!' : 'Save CFD Config'}
            </button>
        </div>
      </form>
    </div>
  );
};

export default CFDPanelScreen;