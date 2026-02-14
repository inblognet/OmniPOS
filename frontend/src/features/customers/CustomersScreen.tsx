import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import {
  Users, Search, Download, Upload, Plus,
  Trash2, Edit, Award, Phone,
  TrendingUp, AlertTriangle, X, Save, Settings,
  CheckSquare // ✅ Added missing import
} from 'lucide-react';
import { exportCustomers, parseCustomerFile, processImport } from '../../utils/customerImportExport';
import { useCurrency } from '../../hooks/useCurrency';
// ✅ API Service
import { customerService, Customer } from '../../services/customerService';

const CustomersScreen: React.FC = () => {
  const currency = useCurrency();

  // ✅ API State for Customers
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Keep Settings on Dexie for now (until Settings API is ready)
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
    type: 'Walk-in' as Customer['type'],
    loyaltyJoined: false
  });

  // ✅ Loyalty Configuration State
  const [loyaltyConfig, setLoyaltyConfig] = useState({
      threshold: 100,
      rate: 1,
      redemptionRate: 1
  });

  // ✅ LOAD CUSTOMERS FROM API
  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await customerService.getAll();
      setCustomers(data);
    } catch (error) {
      console.error("Failed to load customers", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // Sync state with DB settings when loaded
  useEffect(() => {
      if (settings) {
          setLoyaltyConfig({
              threshold: settings.loyaltySpendThreshold || 100,
              rate: settings.loyaltyEarnRate || 1,
              redemptionRate: settings.loyaltyRedemptionRate || 0.01
          });
      }
  }, [settings]);

  // Analytics
  const totalCustomers = customers.length;
  const members = customers.filter(c => c.type === 'Member' || c.loyaltyJoined).length;
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
        let payload: Partial<Customer> = {
            name: formData.name,
            phone: formData.phone,
            type: formData.type,
            loyaltyJoined: formData.loyaltyJoined,
        };

        if (editingId) {
            // Find existing customer stats to preserve them
            const existing = customers.find(c => c.id === editingId);
            if (existing) {
                payload = {
                    ...payload,
                    loyaltyPoints: existing.loyaltyPoints,
                    totalSpend: existing.totalSpend,
                    totalPurchases: existing.totalPurchases,
                    lastPurchaseDate: existing.lastPurchaseDate
                };
            }
            await customerService.update(editingId, payload);
        } else {
            // New customer defaults
            const newCustomer: Customer = {
                ...(payload as Customer),
                loyaltyPoints: 0,
                totalSpend: 0,
                totalPurchases: 0
            };
            await customerService.create(newCustomer);
        }

        setShowModal(false);
        loadCustomers();
    } catch (error) {
        alert("Failed to save customer to server.");
        console.error(error);
    }
  };

  const handleDeleteCustomer = async (id: number) => {
      if (window.confirm("Are you sure you want to delete this customer?")) {
          try {
              await customerService.delete(id);
              loadCustomers();
          } catch (error) {
              console.error("Failed to delete customer", error);
              alert("Failed to delete customer.");
          }
      }
  };

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

  // Import Logic
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importStats, setImportStats] = useState<any>(null);
  const [importMode, setImportMode] = useState<'create' | 'update' | 'upsert'>('upsert');

  const handleImport = async () => {
    if (!importFile) return;
    setIsProcessing(true);
    try {
      const rawData = await parseCustomerFile(importFile);
      const stats = await processImport(rawData, importMode);
      setImportStats(stats);
      loadCustomers();
    } catch (err) {
      alert("Failed to parse file");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">

      {/* --- HEADER & TOP ACTIONS --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <Users className="text-blue-600" /> Customers
           </h1>
           <p className="text-gray-500 text-sm">Manage relationships, loyalty, and cloud-synced records.</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setShowLoyaltyModal(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 shadow-sm transition-all">
                <Settings size={18} /> Loyalty Rules
            </button>
            <button onClick={() => exportCustomers()} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 shadow-sm transition-all">
                <Download size={18} /> Backup / Export
            </button>
            <button onClick={() => setShowImportModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all">
                <Upload size={18} /> Import
            </button>
        </div>
      </div>

      {/* --- ANALYTICS CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between transition-hover hover:border-blue-200">
            <div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Total Records</p>
                <h3 className="text-3xl font-bold text-gray-800 tracking-tight">{totalCustomers}</h3>
            </div>
            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><Users size={28} /></div>
         </div>
         <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between transition-hover hover:border-purple-200">
            <div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Loyalty Members</p>
                <h3 className="text-3xl font-bold text-gray-800 tracking-tight">{members}</h3>
            </div>
            <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl"><Award size={28} /></div>
         </div>
         <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between transition-hover hover:border-green-200">
            <div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Total Customer LTV</p>
                <h3 className="text-3xl font-bold text-gray-800 tracking-tight">{currency}{totalSpendAll.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="p-4 bg-green-50 text-green-600 rounded-2xl"><TrendingUp size={28} /></div>
         </div>
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col min-h-[600px] overflow-hidden">

        {/* Toolbar */}
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row gap-4 bg-gray-50/30">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by name, phone or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-inner transition-all"
                />
            </div>
            <button onClick={openCreateModal} className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all active:scale-95 shadow-lg shadow-gray-200">
                <Plus size={20} /> New Customer
            </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 text-gray-500 text-[11px] uppercase font-bold tracking-widest border-b border-gray-200">
                    <tr>
                        <th className="px-8 py-5">Customer Profile</th>
                        <th className="px-6 py-5">Classification</th>
                        <th className="px-6 py-5">Loyalty Wallet</th>
                        <th className="px-6 py-5">Purchase History</th>
                        <th className="px-8 py-5 text-right">Management</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                    {loading ? (
                        <tr><td colSpan={5} className="px-8 py-20 text-center"><div className="flex flex-col items-center gap-3 text-gray-400 animate-pulse"><Users size={48} className="opacity-20"/><p className="font-medium">Syncing with cloud database...</p></div></td></tr>
                    ) : filteredCustomers.length === 0 ? (
                        <tr><td colSpan={5} className="px-8 py-20 text-center"><div className="flex flex-col items-center gap-3 text-gray-300"><Users size={48} className="opacity-10"/><p className="text-lg font-bold">No Records Found</p><p className="text-sm">Try broadening your search or creating a new entry.</p></div></td></tr>
                    ) : (
                        filteredCustomers.map(c => (
                            <tr key={c.id} className="hover:bg-blue-50/30 transition-all group">
                                <td className="px-8 py-5">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-800 text-base">{c.name}</span>
                                        <div className="flex items-center gap-3 mt-1">
                                          {c.phone && <span className="text-xs text-gray-500 flex items-center gap-1 font-medium bg-gray-100 px-2 py-0.5 rounded-full"><Phone size={10} /> {c.phone}</span>}
                                          {c.email && <span className="text-xs text-gray-400 flex items-center gap-1 truncate max-w-[150px] italic">{c.email}</span>}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter border ${
                                        c.type === 'Member' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                        c.type === 'Wholesale' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                        c.type === 'Registered' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                        'bg-gray-100 text-gray-500 border-gray-200'
                                    }`}>{c.type}</span>
                                </td>
                                <td className="px-6 py-5">
                                    {(c.loyaltyJoined || c.type === 'Member') ? (
                                        <div className="flex flex-col gap-1">
                                            <div className="text-sm font-black text-gray-800 flex items-center gap-1.5"><Award size={14} className="text-purple-600"/> {c.loyaltyPoints || 0} Points</div>
                                            <div className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full w-fit border border-purple-100">
                                                Value: {currency}{((c.loyaltyPoints || 0) * loyaltyConfig.redemptionRate).toFixed(2)}
                                            </div>
                                        </div>
                                    ) : <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter opacity-50 italic">Opted Out</span>}
                                </td>
                                <td className="px-6 py-5">
                                    <div className="text-xs font-bold text-gray-600">{c.totalPurchases || 0} Transactions</div>
                                    <div className="text-sm font-black text-green-600">{currency}{(c.totalSpend || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEditModal(c)} className="p-2.5 text-blue-600 hover:bg-blue-100 rounded-xl transition-all"><Edit size={18} /></button>
                                        <button onClick={() => handleDeleteCustomer(c.id!)} className="p-2.5 text-red-500 hover:bg-red-100 rounded-xl transition-all"><Trash2 size={18} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* --- ADD/EDIT MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                      <h3 className="font-black text-gray-900 flex items-center gap-2 text-lg">
                          {editingId ? <Edit className="text-blue-600" /> : <Plus className="text-blue-600" />}
                          {editingId ? "Modify Profile" : "Create Profile"}
                      </h3>
                      <p className="text-xs text-gray-500 font-medium">Capture essential customer details.</p>
                    </div>
                    <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400"><X size={20} /></button>
                </div>
                <form onSubmit={handleSaveCustomer} className="p-8 space-y-5">
                    <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Full Legal Name *</label><input type="text" required autoFocus value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-bold text-gray-800 transition-all placeholder:text-gray-300" placeholder="e.g. Alexander Pierce"/></div>
                    <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Mobile Contact</label><input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-bold text-gray-800 transition-all" placeholder="+1 (000) 000-0000"/></div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Account Classification</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['Walk-in', 'Registered', 'Member', 'Wholesale'].map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setFormData({...formData, type: t as any})}
                            className={`py-2 px-3 rounded-xl text-xs font-black transition-all border-2 ${formData.type === t ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white border-gray-100 text-gray-500 hover:border-blue-200'}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-blue-900">Loyalty Rewards</span>
                          <span className="text-[10px] text-blue-700 font-medium">Enable points accumulation</span>
                        </div>
                        <input type="checkbox" checked={formData.loyaltyJoined} onChange={(e) => setFormData({...formData, loyaltyJoined: e.target.checked})} className="w-6 h-6 text-blue-600 rounded-lg cursor-pointer focus:ring-blue-500"/>
                    </div>
                    <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-100 transition-all active:scale-95 flex items-center justify-center gap-2">
                        <Save size={18} /> {editingId ? "Update Database" : "Create Record"}
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* --- LOYALTY SETTINGS MODAL --- */}
      {showLoyaltyModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
            <div className="bg-white dark:bg-gray-950 dark:text-white rounded-3xl shadow-2xl w-full max-sm overflow-hidden animate-in zoom-in-95">
                <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900">
                    <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2"><Settings size={20} className="text-purple-600" /> Reward Engine</h3>
                    <button onClick={() => setShowLoyaltyModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400"><X size={20}/></button>
                </div>
                <form onSubmit={handleSaveLoyaltySettings} className="p-8 space-y-6">
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-[10px] rounded-2xl border border-purple-100 font-bold leading-relaxed">
                        <AlertTriangle size={14} className="mb-1 text-purple-600"/>
                        System Rule: Spending {currency}{loyaltyConfig.threshold} will award the customer with {loyaltyConfig.rate} points.
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Spend Floor ({currency})</label><input type="number" value={loyaltyConfig.threshold} onChange={(e) => setLoyaltyConfig({...loyaltyConfig, threshold: parseFloat(e.target.value)})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl dark:bg-gray-900 dark:border-gray-800 font-black text-center"/></div>
                        <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Points per step</label><input type="number" value={loyaltyConfig.rate} onChange={(e) => setLoyaltyConfig({...loyaltyConfig, rate: parseFloat(e.target.value)})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl dark:bg-gray-900 dark:border-gray-800 font-black text-center"/></div>
                    </div>
                    <div className="p-5 bg-green-50 dark:bg-green-900/20 border-2 border-green-100 rounded-2xl">
                        <label className="block text-[10px] font-black text-green-700 uppercase tracking-widest mb-1.5">Redemption Value (1 Point = ?)</label>
                        <div className="flex items-center gap-2">
                           <span className="font-black text-green-900 text-lg">{currency}</span>
                           <input type="number" step="0.01" value={loyaltyConfig.redemptionRate} onChange={(e) => setLoyaltyConfig({...loyaltyConfig, redemptionRate: parseFloat(e.target.value)})} className="w-full px-4 py-3 border-2 border-green-200 rounded-xl dark:bg-gray-900 text-green-900 dark:text-green-100 font-black text-lg focus:ring-green-500 outline-none"/>
                        </div>
                    </div>
                    <button type="submit" className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black shadow-xl shadow-purple-100 transition-all active:scale-95"><Save size={18} className="inline mr-2"/> Apply Rules</button>
                </form>
            </div>
        </div>
      )}

      {/* --- IMPORT MODAL --- */}
      {showImportModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                <div className="px-6 py-5 border-b flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-black text-gray-900 flex items-center gap-2"><Upload size={22} className="text-blue-600" /> Bulk Integration</h3>
                    <button onClick={() => setShowImportModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400"><X size={20}/></button>
                </div>
                {!importStats ? (
                    <div className="p-8 space-y-8">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Resolution Strategy</label>
                            <div className="grid grid-cols-3 gap-3">
                                {(['create', 'update', 'upsert'] as const).map(mode => (
                                    <button key={mode} onClick={() => setImportMode(mode)} className={`px-3 py-3 text-xs font-black border-2 rounded-2xl capitalize transition-all ${importMode === mode ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white border-gray-100 text-gray-500 hover:border-blue-200'}`}>{mode}</button>
                                ))}
                            </div>
                        </div>
                        <div className="border-2 border-dashed border-gray-200 p-8 rounded-3xl text-center bg-gray-50/50">
                           <input type="file" id="customerFile" accept=".csv, .xlsx, .xls" onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)} className="hidden"/>
                           <label htmlFor="customerFile" className="cursor-pointer flex flex-col items-center gap-3">
                              <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 text-blue-600"><Plus size={24}/></div>
                              <span className="text-sm font-bold text-gray-600">{importFile ? importFile.name : "Select CSV or Excel Spreadsheet"}</span>
                           </label>
                        </div>
                        <button onClick={handleImport} disabled={!importFile || isProcessing} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black hover:bg-blue-700 disabled:opacity-30 shadow-xl shadow-blue-100 transition-all">{isProcessing ? "Processing Stream..." : "Initiate Integration"}</button>
                    </div>
                ) : (
                    <div className="p-10 space-y-6 text-center animate-in fade-in zoom-in-95">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4"><CheckSquare size={40}/></div>
                        <h4 className="text-2xl font-black text-gray-900 tracking-tight">Sync Complete</h4>
                        <div className="grid grid-cols-3 gap-2 py-4">
                           <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100"><div className="text-lg font-black text-green-600">{importStats.added}</div><div className="text-[8px] font-black uppercase text-gray-400">Created</div></div>
                           <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100"><div className="text-lg font-black text-blue-600">{importStats.updated}</div><div className="text-[8px] font-black uppercase text-gray-400">Updated</div></div>
                           <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100"><div className="text-lg font-black text-gray-400">{importStats.skipped}</div><div className="text-[8px] font-black uppercase text-gray-400">Skipped</div></div>
                        </div>
                        <button onClick={() => { setImportStats(null); setShowImportModal(false); }} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black transition-all hover:bg-black">Dismiss</button>
                    </div>
                )}
            </div>
        </div>
      )}

    </div>
  );
};

export default CustomersScreen;