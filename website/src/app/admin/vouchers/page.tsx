"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Ticket, Plus, Trash2, Eye, EyeOff, Percent, AlignLeft, Loader2 } from "lucide-react";

interface Voucher {
  id: number;
  code: string;
  discount_percentage: number;
  description: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newVoucher, setNewVoucher] = useState({
    code: "",
    discount_percentage: "",
    description: ""
  });

  const fetchVouchers = async () => {
    try {
      const res = await api.get("/web/admin/vouchers");
      if (res.data.success) {
        setVouchers(res.data.vouchers || []);
      }
    } catch (err) {
      console.error("Failed to fetch vouchers", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  const handleAddVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await api.post("/web/admin/vouchers", {
        code: newVoucher.code.toUpperCase(), // Force uppercase!
        discount_percentage: parseInt(newVoucher.discount_percentage),
        description: newVoucher.description
      });

      if (res.data.success) {
        setNewVoucher({ code: "", discount_percentage: "", description: "" });
        fetchVouchers();
      }
    } catch (err) {
      alert("Failed to create voucher. That code might already exist!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleVisibility = async (id: number) => {
    try {
      await api.put(`/web/admin/vouchers/${id}/toggle`);
      fetchVouchers();
    } catch (err) {
      alert("Failed to toggle voucher.");
    }
  };

  const deleteVoucher = async (id: number) => {
    if (!confirm("Are you sure you want to delete this voucher code forever?")) return;
    try {
      await api.delete(`/web/admin/vouchers/${id}`);
      fetchVouchers();
    } catch (err) {
      alert("Failed to delete voucher.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-7xl mx-auto px-4">

        <div className="mb-8">
          <h1 className="text-4xl font-black text-gray-900 flex items-center gap-3">
            <Ticket className="text-blue-600" size={40} />
            Promo Vouchers
          </h1>
          <p className="text-gray-500 mt-2 text-lg">Create discount codes to share with your customers.</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* Add Voucher Form */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 sticky top-10">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Plus size={20} className="text-blue-600"/> Create Voucher
              </h2>

              <form onSubmit={handleAddVoucher} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Promo Code</label>
                  <div className="relative">
                    <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      required
                      type="text"
                      placeholder="e.g. SUMMER20"
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none uppercase font-black tracking-widest text-blue-600 placeholder:normal-case placeholder:font-normal placeholder:tracking-normal placeholder:text-gray-400"
                      value={newVoucher.code}
                      onChange={e => setNewVoucher({...newVoucher, code: e.target.value.replace(/\s/g, "")})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Discount Percentage (%)</label>
                  <div className="relative">
                    <Percent className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      required
                      type="number"
                      min="1"
                      max="100"
                      placeholder="10"
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                      value={newVoucher.discount_percentage}
                      onChange={e => setNewVoucher({...newVoucher, discount_percentage: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-1"><AlignLeft size={14}/> Description (Visible to Customers)</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. Get 20% off your entire order this summer!"
                    className="w-full bg-gray-50 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm"
                    value={newVoucher.description}
                    onChange={e => setNewVoucher({...newVoucher, description: e.target.value})}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 cursor-pointer mt-4 flex justify-center items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 size={20} className="animate-spin"/> : "Save Voucher"}
                </button>
              </form>
            </div>
          </div>

          {/* Vouchers Table */}
          <div className="xl:col-span-2">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500 uppercase tracking-wider">
                      <th className="p-4 font-bold">Code</th>
                      <th className="p-4 font-bold">Discount</th>
                      <th className="p-4 font-bold">Description</th>
                      <th className="p-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr><td colSpan={4} className="p-10 text-center text-gray-400 font-bold animate-pulse">Loading Vouchers...</td></tr>
                    ) : vouchers.length === 0 ? (
                      <tr><td colSpan={4} className="p-10 text-center text-gray-400 font-bold">No vouchers created yet.</td></tr>
                    ) : vouchers.map(voucher => (
                      <tr key={voucher.id} className={`hover:bg-gray-50 transition-colors ${!voucher.is_active ? 'opacity-50 grayscale-[0.5]' : ''}`}>

                        <td className="p-4">
                          <div className="inline-flex items-center justify-center bg-blue-50 text-blue-700 font-black tracking-widest px-3 py-1.5 rounded-lg border border-blue-200">
                            {voucher.code}
                          </div>
                          {!voucher.is_active && <span className="block mt-1 text-[10px] font-bold text-red-500 uppercase tracking-wider">Deactivated</span>}
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-1 font-black text-2xl text-gray-900">
                            {voucher.discount_percentage}<span className="text-gray-400 text-lg">%</span>
                          </div>
                        </td>

                        <td className="p-4 max-w-[200px]">
                          <p className="text-sm text-gray-600 line-clamp-2">{voucher.description}</p>
                        </td>

                        <td className="p-4 text-right whitespace-nowrap align-middle">
                          <button
                            onClick={() => toggleVisibility(voucher.id)}
                            className={`p-2 rounded-lg transition-colors inline-block cursor-pointer mr-1 ${voucher.is_active ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-400 hover:bg-gray-200'}`}
                            title={voucher.is_active ? "Deactivate Code" : "Reactivate Code"}
                          >
                            {voucher.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
                          </button>

                          <button
                            onClick={() => deleteVoucher(voucher.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-block cursor-pointer"
                            title="Delete Permanently"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}