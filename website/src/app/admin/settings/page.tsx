"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Settings, Palette, Save, Database, AlertTriangle,
  Download, Upload, Trash2, Loader2, Store
} from "lucide-react";

// The exact presets from your POS system!
const DEFAULT_THEME = { primaryColor: '#3b82f6', navbarColor: '#ffffff', sidebarColor: '#f3f4f6', backgroundColor: '#f9fafb', cardColor: '#ffffff', textColor: '#1f2937', sidebarTextColor: '#4b5563', labelColor: '#374151', subTextColor: '#6b7280' };

const THEME_PRESETS = [
  { name: 'System Default', colors: DEFAULT_THEME },
  { name: 'Light Mode', colors: { primaryColor: '#3b82f6', navbarColor: '#ffffff', sidebarColor: '#f3f4f6', backgroundColor: '#f9fafb', cardColor: '#ffffff', textColor: '#1f2937', sidebarTextColor: '#4b5563', labelColor: '#374151', subTextColor: '#6b7280' } },
  { name: 'Dark Mode', colors: { primaryColor: '#3b82f6', navbarColor: '#111827', sidebarColor: '#1f2937', backgroundColor: '#000000', cardColor: '#111827', textColor: '#f3f4f6', sidebarTextColor: '#9ca3af', labelColor: '#d1d5db', subTextColor: '#6b7280' } },
  { name: 'Midnight Bloom', colors: { primaryColor: '#8b5cf6', navbarColor: '#2e1065', sidebarColor: '#1e1b4b', backgroundColor: '#020617', cardColor: '#1e293b', textColor: '#e2e8f0', sidebarTextColor: '#a78bfa', labelColor: '#c4b5fd', subTextColor: '#64748b' } },
  { name: 'Amethyst Haze', colors: { primaryColor: '#d946ef', navbarColor: '#4a044e', sidebarColor: '#2e1065', backgroundColor: '#2e1065', cardColor: '#581c87', textColor: '#fdf4ff', sidebarTextColor: '#f0abfc', labelColor: '#fae8ff', subTextColor: '#c084fc' } },
  { name: 'Cyberpunk', colors: { primaryColor: '#f472b6', navbarColor: '#000000', sidebarColor: '#18181b', backgroundColor: '#09090b', cardColor: '#27272a', textColor: '#22d3ee', sidebarTextColor: '#f472b6', labelColor: '#c084fc', subTextColor: '#a1a1aa' } },
  { name: 'Solar Dusk', colors: { primaryColor: '#f97316', navbarColor: '#431407', sidebarColor: '#2a0a04', backgroundColor: '#0c0a09', cardColor: '#1c1917', textColor: '#fdba74', sidebarTextColor: '#fb923c', labelColor: '#fed7aa', subTextColor: '#78716c' } },
  { name: 'Emerald Corporate', colors: { primaryColor: '#10b981', navbarColor: '#064e3b', sidebarColor: '#022c22', backgroundColor: '#065f46', cardColor: '#064e3b', textColor: '#d1fae5', sidebarTextColor: '#6ee7b7', labelColor: '#a7f3d0', subTextColor: '#34d399' } },
  { name: 'Ivory Prime', colors: { primaryColor: '#d97706', navbarColor: '#fffbeb', sidebarColor: '#fef3c7', backgroundColor: '#ffffff', cardColor: '#ffffff', textColor: '#451a03', sidebarTextColor: '#92400e', labelColor: '#b45309', subTextColor: '#d97706' } },
  { name: 'Steel Frost', colors: { primaryColor: '#64748b', navbarColor: '#f8fafc', sidebarColor: '#f1f5f9', backgroundColor: '#e2e8f0', cardColor: '#ffffff', textColor: '#334155', sidebarTextColor: '#475569', labelColor: '#475569', subTextColor: '#94a3b8' } },
  { name: 'Neo Brutalism', colors: { primaryColor: '#000000', navbarColor: '#facc15', sidebarColor: '#ffffff', backgroundColor: '#e0f2fe', cardColor: '#ffffff', textColor: '#000000', sidebarTextColor: '#000000', labelColor: '#000000', subTextColor: '#4b5563' } },
  { name: 'Ocean Breeze', colors: { primaryColor: '#0ea5e9', navbarColor: '#f0f9ff', sidebarColor: '#e0f2fe', backgroundColor: '#f0f9ff', cardColor: '#ffffff', textColor: '#0c4a6e', sidebarTextColor: '#0284c7', labelColor: '#0369a1', subTextColor: '#7dd3fc' } },
  { name: 'Graphite', colors: { primaryColor: '#9ca3af', navbarColor: '#111827', sidebarColor: '#1f2937', backgroundColor: '#374151', cardColor: '#1f2937', textColor: '#f3f4f6', sidebarTextColor: '#d1d5db', labelColor: '#e5e7eb', subTextColor: '#9ca3af' } }
];

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("System Default");

  const [formData, setFormData] = useState({
    store_name: "", phone_number: "", email_address: "", address: "", tax_rate: "0.10", currency_symbol: "$",
    theme_primary: "#3b82f6", theme_navbar: "#ffffff", theme_sidebar: "#f3f4f6",
    theme_background: "#f9fafb", theme_card: "#ffffff", theme_text: "#1f2937",
    theme_sidebar_text: "#4b5563", theme_label: "#374151", theme_sub_text: "#6b7280"
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get("/web/settings");
        if (res.data.success && res.data.settings) {
          setFormData({ ...formData, ...res.data.settings });
        }
      } catch (err) {
        console.error("Failed to fetch settings", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put("/web/admin/settings", formData);
      if (res.data.success) {
        alert("Store settings securely updated in the database!");
      }
    } catch (err) {
      alert("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (presetName: string) => {
    setSelectedPreset(presetName);
    const preset = THEME_PRESETS.find(p => p.name === presetName);
    if (!preset) return;

    setFormData(prev => ({
      ...prev,
      theme_primary: preset.colors.primaryColor,
      theme_navbar: preset.colors.navbarColor,
      theme_sidebar: preset.colors.sidebarColor,
      theme_background: preset.colors.backgroundColor,
      theme_card: preset.colors.cardColor,
      theme_text: preset.colors.textColor,
      theme_sidebar_text: preset.colors.sidebarTextColor,
      theme_label: preset.colors.labelColor,
      theme_sub_text: preset.colors.subTextColor
    }));
  };

  const ColorInput = ({ label, field }: { label: string, field: keyof typeof formData }) => (
    <div>
      <label className="block text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-2">
        <div className="w-3 h-3 rounded-sm border border-gray-300 shadow-sm" style={{ backgroundColor: formData[field] }}></div>
        {label}
      </label>
      <div className="flex items-center gap-0 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 transition-all">
        <input
          type="color"
          value={formData[field]}
          onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
          className="w-12 h-12 cursor-pointer bg-gray-50 border-none outline-none"
        />
        <input
          type="text"
          value={formData[field].toUpperCase()}
          onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
          className="flex-1 bg-transparent text-gray-900 text-sm px-3 py-2 outline-none font-mono uppercase font-bold"
        />
      </div>
    </div>
  );

  if (loading) return <div className="min-h-[60vh] flex justify-center items-center"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">

      <div>
        <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
          <Settings className="text-blue-600" size={32} />
          Store Configuration
        </h1>
        <p className="text-gray-500 mt-1 font-medium">Manage your store details, theme presets, and system data.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-gray-100 text-gray-900">

        {/* 1. Store Config Section */}
        <div className="p-8 border-b border-gray-100">
          <h2 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
            <Store size={18} className="text-blue-600"/> General Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Store Name</label>
              <input type="text" value={formData.store_name} onChange={e => setFormData({...formData, store_name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Phone Number</label>
              <input type="text" value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Email Address</label>
              <input type="email" value={formData.email_address} onChange={e => setFormData({...formData, email_address: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Store Address</label>
              <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Tax Rate (Decimal)</label>
              <div className="flex items-center gap-3">
                <input type="number" step="0.01" value={formData.tax_rate} onChange={e => setFormData({...formData, tax_rate: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
                <span className="text-sm font-bold text-gray-500 bg-gray-50 px-4 py-3 rounded-xl border border-gray-200">= {(parseFloat(formData.tax_rate) * 100).toFixed(1)}%</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Currency Symbol</label>
              <select value={formData.currency_symbol} onChange={e => setFormData({...formData, currency_symbol: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
                <option value="$">Dollar ($)</option>
                <option value="€">Euro (€)</option>
                <option value="£">Pound (£)</option>
                <option value="Rs">Rupees (Rs)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. Appearance & Theme Section */}
        <div className="p-8 bg-gray-50/50 border-b border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <Palette size={18} className="text-purple-500"/> Appearance & Theme
            </h2>
          </div>

          <div className="mb-8">
             <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Theme Presets</label>
             <select
                value={selectedPreset}
                onChange={(e) => applyPreset(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-colors shadow-sm"
              >
                {THEME_PRESETS.map(preset => (
                  <option key={preset.name} value={preset.name}>{preset.name}</option>
                ))}
             </select>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <ColorInput label="System Primary" field="theme_primary" />
            <ColorInput label="Navigation Bar" field="theme_navbar" />
            <ColorInput label="Sidebar Bg" field="theme_sidebar" />
            <ColorInput label="App Background" field="theme_background" />
            <ColorInput label="Content Cards" field="theme_card" />
            <ColorInput label="Main Text" field="theme_text" />
            <ColorInput label="Sidebar Text" field="theme_sidebar_text" />
            <ColorInput label="Form Labels" field="theme_label" />
            <ColorInput label="Sub-text/Help" field="theme_sub_text" />
          </div>
        </div>

        {/* Save Button Bar */}
        <div className="p-6 bg-gray-50 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-blue-200 active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            Save All Changes
          </button>
        </div>

      </div>

      {/* 3. Data Management Section */}
      <div className="mt-10">
        <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
          Data Management <span className="bg-red-50 text-red-600 border border-red-200 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Cloud Critical</span>
        </h3>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">

           <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 mb-8">
              <AlertTriangle size={20} className="text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-blue-900">About Cloud Storage</p>
                <p className="text-xs text-blue-700 mt-1">Actions taken here affect <strong className="font-black">ALL DEVICES</strong> instantly. Backup files include Products, Orders, Customers, and configurations.</p>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 border-b border-gray-100 pb-8">
              <button onClick={() => alert("Backup routing will be configured soon!")} className="border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group">
                <div className="bg-gray-50 p-3 rounded-full text-blue-600 group-hover:bg-blue-100 transition-colors"><Download size={24}/></div>
                <span className="text-gray-900 font-bold mt-2">Export System Backup</span>
                <span className="text-xs text-gray-500 font-medium">Download .json for restore</span>
              </button>
              <button onClick={() => alert("Restore routing will be configured soon!")} className="border-2 border-dashed border-gray-200 hover:border-amber-300 hover:bg-amber-50 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group">
                <div className="bg-gray-50 p-3 rounded-full text-amber-500 group-hover:bg-amber-100 transition-colors"><Upload size={24}/></div>
                <span className="text-gray-900 font-bold mt-2">Restore System Backup</span>
                <span className="text-xs text-gray-500 font-medium">Overwrite DB from file</span>
              </button>
           </div>

           <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Database size={14}/> Danger Zone</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50/50">
                    <h4 className="text-gray-900 font-black text-sm mb-1 flex items-center gap-2"><Database size={14} className="text-gray-400"/> Clear Sales</h4>
                    <p className="text-xs text-gray-500 mb-4 font-medium">Wipes all orders and revenue logs.</p>
                    <button className="w-full py-2 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 text-xs font-bold rounded-lg transition-colors shadow-sm">Clear Orders</button>
                 </div>
                 <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50/50">
                    <h4 className="text-amber-600 font-black text-sm mb-1 flex items-center gap-2"><Trash2 size={14}/> Clear Inventory</h4>
                    <p className="text-xs text-gray-500 mb-4 font-medium">Archives all products and stock.</p>
                    <button className="w-full py-2 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 text-xs font-bold rounded-lg transition-colors shadow-sm">Archive Products</button>
                 </div>
                 <div className="border border-red-200 bg-red-50 rounded-2xl p-5 relative overflow-hidden">
                    <h4 className="text-red-700 font-black text-sm mb-1 flex items-center gap-2">Factory Reset</h4>
                    <p className="text-xs text-red-600/80 mb-4 font-medium">Nukes entire database.</p>
                    <button className="w-full py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors shadow-md shadow-red-200 active:scale-95">Reset Everything</button>
                 </div>
              </div>
           </div>

        </div>
      </div>

    </div>
  );
}