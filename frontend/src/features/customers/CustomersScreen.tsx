// cspell:ignore dexie Dexie
import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, StoreSettings } from '../../db/db';
import {
  Users, Search, Upload, Plus,
  Trash2, Edit, Award, Phone, Mail, // ✅ Added Mail icon
  TrendingUp, X, Save, Settings
} from 'lucide-react';
import { useCurrency } from '../../hooks/useCurrency';
// ✅ Cloud API Service
import { customerService, Customer } from '../../services/customerService';
import api from '../../api/axiosConfig';

const CustomersScreen: React.FC = () => {
  const currency = useCurrency();

  // ✅ API State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Keep local settings for calculation logic
  const settings = useLiveQuery(() => db.settings.get(1));

  // UI State
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showLoyaltyModal, setShowLoyaltyModal] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '', // ✅ Added email to state
    type: 'Walk-in' as Customer['type'],
    loyaltyJoined: false
  });

  const [loyaltyConfig, setLoyaltyConfig] = useState({
      threshold: 100,
      rate: 1,
      redemptionRate: 1
  });

  // ✅ LOAD FROM CLOUD DATABASE
  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await customerService.getAll();
      setCustomers(data);
    } catch (error) {
      console.error("Cloud Sync Error (Customers):", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCustomers(); }, []);

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
  const totalSpendAll = customers.reduce((sum, c) => sum + (Number(c.totalSpend) || 0), 0);

  // Search Filter
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search)) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase())) // ✅ Added email to search
  );

  // --- ACTIONS ---

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({ name: '', phone: '', email: '', type: 'Walk-in', loyaltyJoined: false }); // ✅ Clear email
    setShowModal(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingId(customer.id!);
    setFormData({
        name: customer.name,
        phone: customer.phone || '',
        email: customer.email || '', // ✅ Populate email
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
            email: formData.email, // ✅ Added email to payload
            type: formData.type,
            loyaltyJoined: formData.loyaltyJoined,
        };

        if (editingId) {
            await customerService.update(editingId, payload);
        } else {
            const newCustomer: Customer = {
                ...(payload as Customer),
                loyaltyPoints: 0,
                totalSpend: 0,
                totalPurchases: 0
            };
            await customerService.create(newCustomer);
        }

        setShowModal(false);
        loadCustomers(); // Refresh list
    } catch (error) {
        alert("Failed to sync customer with cloud.");
    }
  };

  const handleDeleteCustomer = async (id: number) => {
      if (window.confirm("⚠️ Delete this customer profile permanently from cloud?")) {
          try {
              await customerService.delete(id);
              loadCustomers();
          } catch (error) {
              alert("Could not delete record.");
          }
      }
  };

  // ✅ SAVE LOYALTY RULES
  const handleSaveLoyaltyRules = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!settings) {
          alert("Settings are still loading. Please try again in a moment.");
          return;
      }

      try {
          const updatedSettings = {
              ...settings,
              loyaltySpendThreshold: loyaltyConfig.threshold,
              loyaltyEarnRate: loyaltyConfig.rate,
              loyaltyRedemptionRate: loyaltyConfig.redemptionRate
          };

          await api.put('/settings', updatedSettings);
          await db.settings.put({ ...updatedSettings, id: 1 } as StoreSettings);

          setShowLoyaltyModal(false);
          alert("✅ Loyalty rules updated successfully!");
      } catch (error) {
          console.error("Failed to save loyalty rules:", error);
          alert("❌ Failed to save loyalty rules to cloud.");
      }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <Users className="text-blue-600" /> Customer Insights
           </h1>
           <p className="text-gray-500 text-sm">Managed via Cloud Database Integration.</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setShowLoyaltyModal(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 shadow-sm transition-all">
                <Settings size={18} /> Loyalty Rules
            </button>
            <button onClick={() => alert("Bulk Import via Cloud requires Admin Console access. (Feature coming soon)")} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-lg transition-all">
                <Upload size={18} /> Bulk Import
            </button>
        </div>
      </div>

      {/* ANALYTICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Total Database</p>
                <h3 className="text-3xl font-bold text-gray-800 tracking-tight">{totalCustomers}</h3>
            </div>
            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><Users size={28} /></div>
         </div>
         <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Loyalty Base</p>
                <h3 className="text-3xl font-bold text-gray-800 tracking-tight">{members}</h3>
            </div>
            <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl"><Award size={28} /></div>
         </div>
         <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Estimated LTV</p>
                <h3 className="text-3xl font-bold text-gray-800 tracking-tight">{currency}{totalSpendAll.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="p-4 bg-green-50 text-green-600 rounded-2xl"><TrendingUp size={28} /></div>
         </div>
      </div>

      {/* CUSTOMER TABLE AREA */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row gap-4 bg-gray-50/30">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search secure records..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all"
                />
            </div>
            <button onClick={openCreateModal} className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg">
                <Plus size={20} /> Add Customer
            </button>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-black tracking-widest border-b border-gray-200">
                    <tr>
                        <th className="px-8 py-5">Profile</th>
                        <th className="px-6 py-5">Class</th>
                        <th className="px-6 py-5">Loyalty</th>
                        <th className="px-6 py-5">History</th>
                        <th className="px-8 py-5 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {loading ? (
                        <tr><td colSpan={5} className="py-20 text-center text-gray-400 animate-pulse font-bold">Establishing Cloud Connection...</td></tr>
                    ) : filteredCustomers.map(c => (
                        <tr key={c.id} className="hover:bg-blue-50/30 group transition-colors">
                            <td className="px-8 py-5">
                                <div className="flex flex-col">
                                    <span className="font-bold text-gray-800">{c.name}</span>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-xs text-gray-500 flex items-center gap-1 font-medium italic"><Phone size={10} /> {c.phone || 'No phone'}</span>
                                        {/* ✅ Display Email in Table */}
                                        {c.email && <span className="text-xs text-gray-400 flex items-center gap-1"><Mail size={10} /> {c.email}</span>}
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-5">
                                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter border ${
                                    c.type === 'Member' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                    c.type === 'Wholesale' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                    'bg-gray-100 text-gray-500 border-gray-200'
                                }`}>{c.type}</span>
                            </td>
                            <td className="px-6 py-5">
                                {c.loyaltyJoined ? (
                                    <div className="flex flex-col">
                                        <div className="text-sm font-black text-gray-800 flex items-center gap-1"><Award size={14} className="text-purple-600"/> {c.loyaltyPoints || 0} pts</div>
                                        <div className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 rounded-full border border-purple-100 w-fit mt-1">
                                            Val: {currency}{((c.loyaltyPoints || 0) * loyaltyConfig.redemptionRate).toFixed(2)}
                                        </div>
                                    </div>
                                ) : <span className="text-[10px] text-gray-400 font-bold uppercase opacity-50">Standard</span>}
                            </td>
                            <td className="px-6 py-5 text-xs">
                                <div className="font-bold text-gray-600">{c.totalPurchases || 0} Visits</div>
                                <div className="font-black text-green-600 text-sm">{currency}{(Number(c.totalSpend) || 0).toFixed(2)}</div>
                            </td>
                            <td className="px-8 py-5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="flex justify-end gap-1">
                                    <button onClick={() => openEditModal(c)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"><Edit size={16} /></button>
                                    <button onClick={() => handleDeleteCustomer(c.id!)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg"><Trash2 size={16} /></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* --- MODAL LOGIC (ADD/EDIT) --- */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-5 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-black text-gray-900 uppercase tracking-tight">{editingId ? "Update Profile" : "Register Profile"}</h3>
                    <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-400"><X size={20} /></button>
                </div>
                <form onSubmit={handleSaveCustomer} className="p-8 space-y-5">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Customer Name *</label>
                      <input type="text" required autoFocus value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-800"/>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Contact Phone</label>
                      <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-800"/>
                    </div>
                    {/* ✅ NEW: Email Field */}
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Email Address</label>
                      <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-800" placeholder="customer@email.com"/>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tier Classification</label>
                        <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value as any})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl font-bold bg-white">
                          <option value="Walk-in">Walk-in</option>
                          <option value="Registered">Registered</option>
                          <option value="Member">Member</option>
                          <option value="Wholesale">Wholesale</option>
                        </select>
                    </div>
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                        <span className="text-xs font-black text-blue-900">Enroll in Loyalty Program</span>
                        <input type="checkbox" checked={formData.loyaltyJoined} onChange={(e) => setFormData({...formData, loyaltyJoined: e.target.checked})} className="w-5 h-5 text-blue-600 rounded cursor-pointer"/>
                    </div>
                    <button type="submit" className="w-full py-4 bg-gray-900 text-white rounded-xl font-black text-sm hover:bg-black transition-all shadow-xl">
                        <Save size={18} className="inline mr-2" /> {editingId ? "Save Changes" : "Create Record"}
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* --- MODAL LOGIC (LOYALTY RULES) --- */}
      {showLoyaltyModal && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                 <div className="px-6 py-5 border-b flex justify-between items-center bg-purple-50">
                     <h3 className="font-black text-purple-900 uppercase tracking-tight flex items-center gap-2">
                         <Award size={20} className="text-purple-600"/> Loyalty Rules
                     </h3>
                     <button onClick={() => setShowLoyaltyModal(false)} className="p-2 hover:bg-purple-200 rounded-full text-purple-400"><X size={20} /></button>
                 </div>
                 <form onSubmit={handleSaveLoyaltyRules} className="p-8 space-y-6">

                     <div className="space-y-4">
                         {/* Earn Rules */}
                         <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                             <p className="text-xs font-black text-gray-500 uppercase tracking-widest border-b pb-2 mb-2">Earning Points</p>
                             <div>
                                 <label className="block text-xs font-bold text-gray-700 mb-1">Spend Threshold ({currency})</label>
                                 <input
                                     type="number"
                                     required
                                     min="1"
                                     value={loyaltyConfig.threshold}
                                     onChange={(e) => setLoyaltyConfig({...loyaltyConfig, threshold: Number(e.target.value)})}
                                     className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 outline-none"
                                 />
                                 <p className="text-[10px] text-gray-400 mt-1">Amount customer must spend to earn points.</p>
                             </div>
                             <div>
                                 <label className="block text-xs font-bold text-gray-700 mb-1">Points Awarded</label>
                                 <input
                                     type="number"
                                     required
                                     min="1"
                                     value={loyaltyConfig.rate}
                                     onChange={(e) => setLoyaltyConfig({...loyaltyConfig, rate: Number(e.target.value)})}
                                     className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 outline-none"
                                 />
                                 <p className="text-[10px] text-gray-400 mt-1">Points given per threshold met. (e.g. Spend {currency}{loyaltyConfig.threshold} = {loyaltyConfig.rate} points)</p>
                             </div>
                         </div>

                         {/* Redeem Rules */}
                         <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                             <p className="text-xs font-black text-gray-500 uppercase tracking-widest border-b pb-2 mb-2">Redeeming Points</p>
                             <div>
                                 <label className="block text-xs font-bold text-gray-700 mb-1">Value of 1 Point ({currency})</label>
                                 <input
                                     type="number"
                                     required
                                     step="0.01"
                                     min="0.01"
                                     value={loyaltyConfig.redemptionRate}
                                     onChange={(e) => setLoyaltyConfig({...loyaltyConfig, redemptionRate: Number(e.target.value)})}
                                     className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 outline-none"
                                 />
                                 <p className="text-[10px] text-gray-400 mt-1">Financial value of a point. (e.g. 100 points = {currency}{(100 * loyaltyConfig.redemptionRate).toFixed(2)})</p>
                             </div>
                         </div>
                     </div>

                     <button type="submit" className="w-full py-4 bg-purple-600 text-white rounded-xl font-black text-sm hover:bg-purple-700 transition-all shadow-lg">
                         <Save size={18} className="inline mr-2" /> Update Rules
                     </button>
                 </form>
             </div>
         </div>
      )}
    </div>
  );
};

export default CustomersScreen;