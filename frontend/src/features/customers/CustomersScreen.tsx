import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Customer } from '../../db/db';
import {
  Users, Search, Download, Upload, Plus,
  Trash2, Edit, Award, Phone, MapPin,
  TrendingUp, AlertTriangle, X, Save, Settings
} from 'lucide-react';
import { exportCustomers, parseCustomerFile, processImport } from '../../utils/customerImportExport';
import { useCurrency } from '../../hooks/useCurrency';

const CustomersScreen: React.FC = () => {
  const currency = useCurrency();
  const customers = useLiveQuery(() => db.customers.toArray()) || [];
  const settings = useLiveQuery(() => db.settings.get(1));

  // UI State
  const [search, setSearch] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showLoyaltyModal, setShowLoyaltyModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    type: 'Walk-in',
    loyaltyJoined: false
  });

  // ✅ Loyalty Configuration State
  const [loyaltyConfig, setLoyaltyConfig] = useState({
      threshold: 100,
      rate: 1,
      redemptionRate: 1 // Default: 1 Point = 1 Currency Unit
  });

  // Sync state with DB settings when loaded
  useEffect(() => {
      if (settings) {
          setLoyaltyConfig({
              threshold: settings.loyaltySpendThreshold || 100,
              rate: settings.loyaltyEarnRate || 1,
              redemptionRate: settings.loyaltyRedemptionRate || 0.01 // Load from DB
          });
      }
  }, [settings]);

  // Import State
  const [importMode, setImportMode] = useState<'create' | 'update' | 'upsert'>('upsert');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importStats, setImportStats] = useState<any>(null);

  // Analytics
  const totalCustomers = customers.length;
  const members = customers.filter(c => c.loyaltyJoined).length;
  const totalSpendAll = customers.reduce((sum, c) => sum + (c.totalSpend || 0), 0);

  // Filter
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  // --- ACTIONS ---

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({ name: '', phone: '', type: 'Walk-in', loyaltyJoined: false });
    setShowModal(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingId(customer.id!);
    setFormData({
        name: customer.name,
        phone: customer.phone || '',
        type: customer.type,
        loyaltyJoined: customer.loyaltyJoined || false
    });
    setShowModal(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
        if (editingId) {
            await db.customers.update(editingId, {
                name: formData.name,
                phone: formData.phone,
                type: formData.type as any,
                loyaltyJoined: formData.loyaltyJoined
            });
        } else {
            await db.customers.add({
                name: formData.name,
                phone: formData.phone,
                type: formData.type as any,
                loyaltyJoined: formData.loyaltyJoined,
                loyaltyPoints: 0,
                totalPurchases: 0,
                totalSpend: 0,
                createdAt: new Date().toISOString()
            });
        }
        setShowModal(false);
    } catch (error) {
        alert("Failed to save customer.");
        console.error(error);
    }
  };

  // ✅ SAVE LOYALTY RULES
  const handleSaveLoyaltySettings = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          await db.settings.update(1, {
              loyaltySpendThreshold: Number(loyaltyConfig.threshold),
              loyaltyEarnRate: Number(loyaltyConfig.rate),
              loyaltyRedemptionRate: Number(loyaltyConfig.redemptionRate)
          });
          setShowLoyaltyModal(false);
      } catch (err) {
          alert("Failed to save loyalty settings");
          console.error(err);
      }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setIsProcessing(true);
    try {
      const rawData = await parseCustomerFile(importFile);
      const stats = await processImport(rawData, importMode);
      setImportStats(stats);
    } catch (err) {
      alert("Failed to parse file");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">

      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <Users className="text-blue-600" /> Customers
           </h1>
           <p className="text-gray-500">Manage relationships, loyalty, and imports.</p>
        </div>
        <div className="flex gap-2">
            <button
                onClick={() => setShowLoyaltyModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
            >
                <Settings size={18} /> Loyalty Rules
            </button>

            <button
                onClick={() => exportCustomers()}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
            >
                <Download size={18} /> Backup / Export
            </button>
            <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
                <Upload size={18} /> Import
            </button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-gray-500 text-sm font-medium">Total Records</p>
                <h3 className="text-2xl font-bold text-gray-800">{totalCustomers}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <Users size={24} />
            </div>
         </div>
         <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-gray-500 text-sm font-medium">Loyalty Members</p>
                <h3 className="text-2xl font-bold text-gray-800">{members}</h3>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                <Award size={24} />
            </div>
         </div>
         <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-gray-500 text-sm font-medium">Total Customer LTV</p>
                <h3 className="text-2xl font-bold text-gray-800">{currency}{totalSpendAll.toFixed(2)}</h3>
            </div>
            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                <TrendingUp size={24} />
            </div>
         </div>
      </div>

      {/* Main Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col min-h-[500px]">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                    type="text"
                    placeholder="Search by name, phone or ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                />
            </div>
            <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-black transition-colors"
            >
                <Plus size={18} /> New Customer
            </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                    <tr>
                        <th className="px-6 py-4">Customer</th>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4">Loyalty Balance</th>
                        <th className="px-6 py-4">Stats</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filteredCustomers.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                No customers found. Try importing or creating one.
                            </td>
                        </tr>
                    ) : (
                        filteredCustomers.map(c => (
                            <tr key={c.id} className="hover:bg-transparent hover:ring-1 hover:ring-inset hover:ring-gray-300 transition-all">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-800">{c.name}</span>
                                        {c.phone && <span className="text-xs text-gray-400 flex items-center gap-1"><Phone size={10} /> {c.phone}</span>}
                                        {c.address && <span className="text-xs text-gray-400 flex items-center gap-1"><MapPin size={10} /> {c.address}</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                                        c.type === 'Member' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                        c.type === 'Wholesale' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                        'bg-gray-100 text-gray-600 border-gray-200'
                                    }`}>
                                        {c.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {c.loyaltyJoined ? (
                                        <div className="flex flex-col items-start gap-1">
                                            <div className="text-sm font-bold text-gray-800">{c.loyaltyPoints || 0} pts</div>
                                            <div className="text-xs font-bold text-purple-700 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded">
                                                Worth: {currency}{((c.loyaltyPoints || 0) * loyaltyConfig.redemptionRate).toFixed(2)}
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">Not Joined</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    <div>{c.totalPurchases || 0} Orders</div>
                                    <div className="font-medium">{currency}{(c.totalSpend || 0).toFixed(2)}</div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button onClick={() => openEditModal(c)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={() => db.customers.delete(c.id!)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* --- CREATE / EDIT CUSTOMER MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        {editingId ? <Edit size={18} className="text-blue-600" /> : <Plus size={18} className="text-blue-600" />}
                        {editingId ? "Edit Customer" : "Add Customer"}
                    </h3>
                    <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSaveCustomer} className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Customer Name *</label>
                        <input type="text" required autoFocus value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. John Doe"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number</label>
                        <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. 555-0123"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                        <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                            <option>Walk-in</option>
                            <option>Registered</option>
                            <option>Member</option>
                            <option>Wholesale</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2 py-2">
                        <input type="checkbox" id="loyaltyJoin" checked={formData.loyaltyJoined} onChange={(e) => setFormData({...formData, loyaltyJoined: e.target.checked})} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"/>
                        <label htmlFor="loyaltyJoin" className="text-sm text-gray-700 font-medium">Enable Loyalty Program</label>
                    </div>
                    <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors">
                        <Save size={18} /> {editingId ? "Update Customer" : "Save Customer"}
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* --- LOYALTY SETTINGS MODAL (✅ UPDATED FOR DARK MODE) --- */}
      {showLoyaltyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            {/* ✅ Main Container: Added dark:bg-gray-950 dark:text-white */}
            <div className="bg-white dark:bg-gray-950 dark:text-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
                {/* ✅ Header: Added dark:bg-gray-900 dark:border-gray-800 */}
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                    {/* ✅ Title: Added dark:text-white */}
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Settings size={18} className="text-purple-600" /> Loyalty Rules
                    </h3>
                    <button onClick={() => setShowLoyaltyModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSaveLoyaltySettings} className="p-5 space-y-4">
                    {/* ✅ Purple Info Box: Adjusted colors and transparency for dark mode */}
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-xs rounded-lg border border-purple-100 dark:border-purple-800">
                        <strong>Earning Rule:</strong> If Spend Threshold is <strong>{currency}100</strong> and Earn Rate is <strong>1</strong>, a customer spending <strong>{currency}1,000</strong> earns <strong>10 points</strong>.
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            {/* ✅ Label: Added dark:text-gray-400 */}
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Spend Threshold ({currency})</label>
                            {/* ✅ Input: Added dark mode borders, background, and text color */}
                            <input
                                type="number" min="1" required
                                value={loyaltyConfig.threshold}
                                onChange={(e) => setLoyaltyConfig({...loyaltyConfig, threshold: parseFloat(e.target.value)})}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-center font-bold text-gray-800 dark:text-white dark:bg-gray-900"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Points Earned</label>
                            <input
                                type="number" min="0.1" step="0.1" required
                                value={loyaltyConfig.rate}
                                onChange={(e) => setLoyaltyConfig({...loyaltyConfig, rate: parseFloat(e.target.value)})}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-center font-bold text-gray-800 dark:text-white dark:bg-gray-900"
                            />
                        </div>
                    </div>

                    {/* Redemption Value Section */}
                    {/* ✅ Green Info Box: Adjusted colors and transparency for dark mode */}
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-lg mt-2">
                        {/* ✅ Green Label */}
                        <label className="block text-xs font-bold text-green-700 dark:text-green-300 uppercase mb-1">Redemption Value ({currency})</label>
                        <div className="flex items-center gap-2">
                            {/* ✅ Green Span */}
                            <span className="text-sm text-green-800 dark:text-green-200 font-medium">1 Point =</span>
                            {/* ✅ Green Input */}
                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                required
                                value={loyaltyConfig.redemptionRate}
                                onChange={(e) => setLoyaltyConfig({...loyaltyConfig, redemptionRate: parseFloat(e.target.value)})}
                                className="flex-1 px-3 py-2 border border-green-200 dark:border-green-700 rounded-lg focus:ring-2 focus:ring-green-500 outline-none font-bold text-green-900 dark:text-white dark:bg-green-900/50"
                            />
                        </div>
                        {/* ✅ Green Helper Text */}
                        <p className="text-[10px] text-green-600 dark:text-green-400 mt-1">
                            A customer with 100 points gets a discount of {currency}{(100 * loyaltyConfig.redemptionRate).toFixed(2)}.
                        </p>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors mt-2"
                    >
                        <Save size={18} /> Save Rules
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* --- IMPORT MODAL --- */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Upload size={20} className="text-blue-600" /> Import Customers
                    </h3>
                    <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                {!importStats ? (
                    <div className="p-6 space-y-6">
                        {/* 1. Mode Selection */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Import Mode</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['create', 'update', 'upsert'] as const).map(mode => (
                                    <button
                                        key={mode}
                                        onClick={() => setImportMode(mode)}
                                        className={`px-3 py-2 text-sm border rounded-lg capitalize ${
                                            importMode === mode
                                            ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold'
                                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {/* 2. File Upload */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Upload File (CSV/Excel)</label>
                            <input
                                type="file"
                                accept=".csv, .xlsx, .xls"
                                onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                        </div>
                        {/* 3. Actions */}
                        <div className="flex gap-3 pt-2">
                             <button
                                onClick={handleImport}
                                disabled={!importFile || isProcessing}
                                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
                             >
                                {isProcessing ? "Processing..." : "Start Import"}
                             </button>
                        </div>
                    </div>
                ) : (
                    // RESULT VIEW
                    <div className="p-6 space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                             <div className="text-center flex-1">
                                <div className="text-2xl font-bold text-green-600">{importStats.added}</div>
                                <div className="text-xs text-gray-500 uppercase">Created</div>
                             </div>
                             <div className="w-px h-8 bg-gray-200"></div>
                             <div className="text-center flex-1">
                                <div className="text-2xl font-bold text-blue-600">{importStats.updated}</div>
                                <div className="text-xs text-gray-500 uppercase">Updated</div>
                             </div>
                             <div className="w-px h-8 bg-gray-200"></div>
                             <div className="text-center flex-1">
                                <div className="text-2xl font-bold text-gray-500">{importStats.skipped}</div>
                                <div className="text-xs text-gray-500 uppercase">Skipped</div>
                             </div>
                        </div>
                        {importStats.errors.length > 0 && (
                            <div className="max-h-32 overflow-y-auto p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
                                <h4 className="font-bold mb-1 flex items-center gap-1"><AlertTriangle size={12}/> Errors</h4>
                                {importStats.errors.map((e: string, i: number) => <div key={i}>{e}</div>)}
                            </div>
                        )}
                        <button
                            onClick={() => { setImportStats(null); setShowImportModal(false); setImportFile(null); }}
                            className="w-full bg-gray-900 text-white py-2 rounded-lg font-bold"
                        >
                            Done
                        </button>
                    </div>
                )}
            </div>
        </div>
      )}

    </div>
  );
};

export default CustomersScreen;