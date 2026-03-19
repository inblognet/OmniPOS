import React, { useState, useEffect } from 'react';
import { db, Supplier } from '../../db/db';
import api from '../../api/axiosConfig';
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
      const res = await api.get('/suppliers');

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

      if (editingId) {
        await api.put(`/suppliers/${editingId}`, payload);
      } else {
        await api.post('/suppliers', payload);
      }

      setShowModal(false);
      loadSuppliers();
    } catch (err) {
      console.error("Save failed", err);
      alert("Failed to save supplier to the cloud database.");
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this supplier? Products linked to them will remain, but will lose the supplier link.")) {
      try {
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
    <div className="h-full flex flex-col bg-gray-50 p-6 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Building2 className="text-blue-600" /> Supplier Records
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage wholesale distributors and vendor contact information.</p>
        </div>
        <button onClick={openCreateModal} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all hover:bg-blue-700 active:scale-95">
          <Plus size={20} /> Add Supplier
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by contact name or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex-1">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 text-gray-500 text-sm uppercase font-black border-b border-gray-200 tracking-wider">
            <tr>
              <th className="px-6 py-5">Supplier / Contact</th>
              <th className="px-6 py-5">Company</th>
              <th className="px-6 py-5">Phone</th>
              <th className="px-6 py-5">Brands / Categories</th>
              <th className="px-6 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredSuppliers.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50 transition-all group">
                <td className="px-6 py-5">
                  <div className="font-bold text-gray-900 text-base">{s.name}</div>
                  {s.nic && <div className="text-xs text-gray-400 font-bold mt-1 tracking-wide">NIC: {s.nic}</div>}
                </td>
                <td className="px-6 py-5 text-gray-700 font-bold">{s.companyName || '-'}</td>
                <td className="px-6 py-5">
                  {s.phone ? (
                      <div className="text-sm font-bold text-gray-600 flex items-center gap-1.5 bg-gray-50 w-max px-2.5 py-1 rounded-md border border-gray-200">
                          <Phone size={12} className="text-blue-600"/> {s.phone}
                      </div>
                  ) : '-'}
                </td>
                <td className="px-6 py-5">
                  <div className="text-sm font-bold text-gray-700 flex items-center gap-1"><Box size={14} className="text-gray-400"/> {s.itemsBrand || 'Mixed Brands'}</div>
                  <div className="text-xs font-medium text-gray-500 mt-0.5">{s.categoryType || 'General Categories'}</div>
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditModal(s)} className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><Edit size={18} /></button>
                    <button onClick={() => handleDelete(s.id!)} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredSuppliers.length === 0 && (
              <tr><td colSpan={5} className="p-12 text-center text-gray-400 font-bold text-lg">No suppliers found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Building2 size={20} className="text-blue-600"/> {editingId ? 'Edit Supplier' : 'New Supplier'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-5">
                <div><label className="block text-xs font-bold text-gray-500 mb-1">Contact Name *</label><input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium" /></div>
                <div><label className="block text-xs font-bold text-gray-500 mb-1">Company Name</label><input type="text" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium" /></div>
                <div><label className="block text-xs font-bold text-gray-500 mb-1">Phone Number</label><input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium" /></div>
                <div><label className="block text-xs font-bold text-gray-500 mb-1">NIC</label><input type="text" value={formData.nic} onChange={e => setFormData({...formData, nic: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium" /></div>
                <div className="col-span-2"><label className="block text-xs font-bold text-gray-500 mb-1">Address</label><input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium" /></div>
                <div><label className="block text-xs font-bold text-gray-500 mb-1">Brands Supplied</label><input type="text" placeholder="e.g. Coca-Cola, Pepsi" value={formData.itemsBrand} onChange={e => setFormData({...formData, itemsBrand: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium" /></div>
                <div><label className="block text-xs font-bold text-gray-500 mb-1">Categories Supplied</label><input type="text" placeholder="e.g. Beverages, Snacks" value={formData.categoryType} onChange={e => setFormData({...formData, categoryType: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium" /></div>
              </div>
              <div className="flex justify-end gap-3 mt-8 pt-5 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2"><Save size={18}/> {editingId ? 'Update' : 'Save'} Supplier</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliersScreen;