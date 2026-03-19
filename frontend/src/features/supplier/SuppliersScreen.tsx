import React, { useState, useEffect } from 'react';
import { db, Supplier } from '../../db/db';
import api from '../../api/axiosConfig'; // ✅ IMPORT THE API
import { Plus, Edit, Trash2, X, Save, Search, Building2, Phone, Box } from 'lucide-react';

const SuppliersScreen: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Supplier>({
    name: '', nic: '', phone: '', companyName: '', address: '', itemsBrand: '', categoryType: ''
  });

  const loadSuppliers = async () => {
    try {
      // ✅ 1. FETCH FROM CLOUD INSTEAD OF LOCAL DB
      const res = await api.get('/suppliers');

      // PostgreSQL returns snake_case (company_name), so we map it to camelCase for React
      const mappedData = res.data.map((s: any) => ({
        id: s.id,
        name: s.name,
        nic: s.nic,
        phone: s.phone,
        companyName: s.company_name || s.companyName || '',
        address: s.address,
        itemsBrand: s.items_brand || s.itemsBrand || '',
        categoryType: s.category_type || s.categoryType || '',
        createdAt: s.created_at || s.createdAt,
        updatedAt: s.updated_at || s.updatedAt
      }));

      setSuppliers(mappedData);

      // Optional: Save a backup to local DB for offline mode
      await db.suppliers.clear();
      await db.suppliers.bulkAdd(mappedData);
    } catch (err) {
      console.error("Failed to load suppliers from cloud. Falling back to local.", err);
      const localData = await db.suppliers.orderBy('id').reverse().toArray();
      setSuppliers(localData);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return alert("Supplier contact name is required.");

    try {
      const payload = {
        ...formData,
        updatedAt: new Date().toISOString(),
        createdAt: editingId ? formData.createdAt : new Date().toISOString()
      };

      // ✅ 2. SAVE DIRECTLY TO CLOUD API
      if (editingId) {
        await api.put(`/suppliers/${editingId}`, payload);
      } else {
        await api.post('/suppliers', payload);
      }

      setShowModal(false);
      loadSuppliers(); // Refresh the list from the cloud
    } catch (err) {
      console.error("Save failed", err);
      alert("Failed to save supplier to the cloud database.");
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this supplier? Products linked to them will remain, but will lose the supplier link.")) {
      try {
        // ✅ 3. DELETE FROM CLOUD API
        await api.delete(`/suppliers/${id}`);
        loadSuppliers();
      } catch (err) {
        alert("Failed to delete supplier from cloud.");
      }
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({ name: '', nic: '', phone: '', companyName: '', address: '', itemsBrand: '', categoryType: '' });
    setShowModal(true);
  };

  const openEditModal = (s: Supplier) => {
    setEditingId(s.id!);
    setFormData({ ...s });
    setShowModal(true);
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.companyName && s.companyName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="h-full flex flex-col bg-[var(--background-color,#f9fafb)] p-6 overflow-y-auto transition-colors">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-color,#1f2937)] flex items-center gap-2">
            <Building2 className="text-[var(--primary-color,#3b82f6)]" /> Supplier Records
          </h1>
          <p className="text-[var(--sub-text-color,#6b7280)] text-sm mt-1 font-medium">Manage wholesale distributors and vendor contact information.</p>
        </div>
        <button onClick={openCreateModal} className="bg-[var(--primary-color,#2563eb)] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] transition-all hover:brightness-110 active:scale-95">
          <Plus size={20} /> Add Supplier
        </button>
      </div>

      <div className="bg-[var(--card-color,#ffffff)] p-4 rounded-xl border border-[var(--sidebar-color,#e5e7eb)] shadow-sm mb-6 transition-colors">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sub-text-color,#9ca3af)]" size={18} />
          <input
            type="text"
            placeholder="Search by contact name or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-[var(--sidebar-color,#e5e7eb)] rounded-lg focus:ring-2 focus:ring-[var(--primary-color,#3b82f6)] bg-[var(--background-color,#f9fafb)] text-[var(--text-color,#1f2937)] outline-none font-medium transition-colors"
          />
        </div>
      </div>

      <div className="bg-[var(--card-color,#ffffff)] rounded-xl border border-[var(--sidebar-color,#e5e7eb)] shadow-sm overflow-hidden flex-1 transition-colors">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[var(--background-color,#f3f4f6)] text-[var(--sub-text-color,#6b7280)] text-xs uppercase font-black border-b border-[var(--sidebar-color,#e5e7eb)] tracking-wider">
            <tr>
              <th className="px-6 py-4">Supplier / Contact</th>
              <th className="px-6 py-4">Company</th>
              <th className="px-6 py-4">Phone</th>
              <th className="px-6 py-4">Brands / Categories</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--sidebar-color,#f3f4f6)]">
            {filteredSuppliers.map((s) => (
              <tr key={s.id} className="hover:bg-[var(--background-color,#f9fafb)] transition-all group">
                <td className="px-6 py-4">
                  <div className="font-bold text-[var(--text-color,#1f2937)] text-base">{s.name}</div>
                  {s.nic && <div className="text-[10px] font-bold text-[var(--sub-text-color,#9ca3af)] tracking-wider mt-0.5">NIC: {s.nic}</div>}
                </td>
                <td className="px-6 py-4 text-[var(--text-color,#374151)] font-bold">{s.companyName || '-'}</td>
                <td className="px-6 py-4">
                  {s.phone ? (
                      <div className="text-sm font-bold text-[var(--text-color,#4b5563)] flex items-center gap-1.5 bg-[var(--background-color,#f3f4f6)] w-max px-2.5 py-1 rounded-md border border-[var(--sidebar-color,#e5e7eb)]">
                          <Phone size={12} className="text-[var(--primary-color,#3b82f6)]"/> {s.phone}
                      </div>
                  ) : '-'}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-bold text-[var(--text-color,#374151)] flex items-center gap-1"><Box size={14} className="text-[var(--sub-text-color,#9ca3af)]"/> {s.itemsBrand || 'Mixed Brands'}</div>
                  <div className="text-xs font-medium text-[var(--sub-text-color,#6b7280)] mt-0.5">{s.categoryType || 'General Categories'}</div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditModal(s)} className="p-2 text-[var(--primary-color,#3b82f6)] hover:bg-[var(--primary-color)]/10 rounded-lg transition-colors"><Edit size={18} /></button>
                    <button onClick={() => handleDelete(s.id!)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredSuppliers.length === 0 && (
              <tr><td colSpan={5} className="p-12 text-center text-[var(--sub-text-color,#9ca3af)] font-bold text-lg">No suppliers found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--card-color,#ffffff)] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 border border-[var(--sidebar-color,#e5e7eb)]">
            <div className="px-6 py-5 border-b border-[var(--sidebar-color,#f3f4f6)] flex justify-between items-center bg-[var(--background-color,#f9fafb)]">
              <h2 className="text-xl font-black text-[var(--text-color,#1f2937)] flex items-center gap-2">
                  <Building2 size={24} className="text-[var(--primary-color,#3b82f6)]"/> {editingId ? 'Edit Supplier' : 'New Supplier'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-[var(--sidebar-color,#e5e7eb)] rounded-full text-[var(--sub-text-color,#9ca3af)] transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-5">
                <div><label className="block text-xs font-bold text-[var(--sub-text-color,#6b7280)] uppercase tracking-wider mb-1.5">Contact Name *</label><input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 border border-[var(--sidebar-color,#e5e7eb)] rounded-xl focus:ring-2 focus:ring-[var(--primary-color,#3b82f6)] bg-[var(--background-color,#f9fafb)] text-[var(--text-color,#1f2937)] outline-none font-bold" /></div>
                <div><label className="block text-xs font-bold text-[var(--sub-text-color,#6b7280)] uppercase tracking-wider mb-1.5">Company Name</label><input type="text" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} className="w-full p-3 border border-[var(--sidebar-color,#e5e7eb)] rounded-xl focus:ring-2 focus:ring-[var(--primary-color,#3b82f6)] bg-[var(--background-color,#f9fafb)] text-[var(--text-color,#1f2937)] outline-none font-bold" /></div>
                <div><label className="block text-xs font-bold text-[var(--sub-text-color,#6b7280)] uppercase tracking-wider mb-1.5">Phone Number</label><input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-3 border border-[var(--sidebar-color,#e5e7eb)] rounded-xl focus:ring-2 focus:ring-[var(--primary-color,#3b82f6)] bg-[var(--background-color,#f9fafb)] text-[var(--text-color,#1f2937)] outline-none font-bold" /></div>
                <div><label className="block text-xs font-bold text-[var(--sub-text-color,#6b7280)] uppercase tracking-wider mb-1.5">NIC</label><input type="text" value={formData.nic} onChange={e => setFormData({...formData, nic: e.target.value})} className="w-full p-3 border border-[var(--sidebar-color,#e5e7eb)] rounded-xl focus:ring-2 focus:ring-[var(--primary-color,#3b82f6)] bg-[var(--background-color,#f9fafb)] text-[var(--text-color,#1f2937)] outline-none font-bold" /></div>
                <div className="col-span-2"><label className="block text-xs font-bold text-[var(--sub-text-color,#6b7280)] uppercase tracking-wider mb-1.5">Address</label><input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full p-3 border border-[var(--sidebar-color,#e5e7eb)] rounded-xl focus:ring-2 focus:ring-[var(--primary-color,#3b82f6)] bg-[var(--background-color,#f9fafb)] text-[var(--text-color,#1f2937)] outline-none font-bold" /></div>
                <div><label className="block text-xs font-bold text-[var(--sub-text-color,#6b7280)] uppercase tracking-wider mb-1.5">Brands Supplied</label><input type="text" placeholder="e.g. Coca-Cola, Pepsi" value={formData.itemsBrand} onChange={e => setFormData({...formData, itemsBrand: e.target.value})} className="w-full p-3 border border-[var(--sidebar-color,#e5e7eb)] rounded-xl focus:ring-2 focus:ring-[var(--primary-color,#3b82f6)] bg-[var(--background-color,#f9fafb)] text-[var(--text-color,#1f2937)] outline-none font-bold" /></div>
                <div><label className="block text-xs font-bold text-[var(--sub-text-color,#6b7280)] uppercase tracking-wider mb-1.5">Categories Supplied</label><input type="text" placeholder="e.g. Beverages, Snacks" value={formData.categoryType} onChange={e => setFormData({...formData, categoryType: e.target.value})} className="w-full p-3 border border-[var(--sidebar-color,#e5e7eb)] rounded-xl focus:ring-2 focus:ring-[var(--primary-color,#3b82f6)] bg-[var(--background-color,#f9fafb)] text-[var(--text-color,#1f2937)] outline-none font-bold" /></div>
              </div>
              <div className="flex justify-end gap-3 mt-8 pt-5 border-t border-[var(--sidebar-color,#f3f4f6)]">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 text-[var(--sub-text-color,#6b7280)] font-bold hover:bg-[var(--background-color,#f3f4f6)] rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-8 py-3 bg-[var(--primary-color,#2563eb)] hover:brightness-110 text-white font-black rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2"><Save size={18}/> {editingId ? 'Update' : 'Save'} Supplier</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliersScreen;