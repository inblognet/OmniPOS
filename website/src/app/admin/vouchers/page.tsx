"use client";
import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import axios from "axios"; // 🔥 Imported axios for strict error typing
import { useToastStore } from "@/store/useToastStore";
import {
  Ticket, Plus, Trash2, Loader2, Image as ImageIcon,
  Calendar, Globe, Lock, ToggleLeft, ToggleRight, MessageSquare
} from "lucide-react";

interface Voucher {
  id: number;
  code: string;
  discount_percentage: number;
  description: string;
  image_url: string | null;
  expire_date_time: string | null;
  is_active: boolean;
  is_public: boolean;
  created_at: string;
}

export default function AdminVouchersPage() {
  const { addToast } = useToastStore();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    code: "",
    discount_percentage: "",
    description: "",
    expire_date_time: "",
    is_public: true,
  });

  // Image Upload State
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // 🔥 Wrapped in useCallback to satisfy the useEffect dependency array
  const fetchVouchers = useCallback(async () => {
    try {
      const res = await api.get("/web/admin/vouchers");
      if (res.data.success) {
        setVouchers(res.data.vouchers);
      }
    } catch (error: unknown) {
      console.error("Failed to load vouchers", error); // 🔥 Used the error
      addToast("Failed to load vouchers", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]); // 🔥 Dependency added securely

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.discount_percentage) return;
    setSubmitting(true);

    const submitData = new FormData();
    submitData.append("code", formData.code);
    submitData.append("discount_percentage", formData.discount_percentage);
    submitData.append("description", formData.description);
    submitData.append("is_public", formData.is_public.toString());

    if (formData.expire_date_time) {
      submitData.append("expire_date_time", formData.expire_date_time);
    }
    if (selectedImage) {
      submitData.append("image", selectedImage);
    }

    try {
      const res = await api.post("/web/admin/vouchers", submitData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (res.data.success) {
        addToast("Voucher created successfully!", "success");
        setFormData({ code: "", discount_percentage: "", description: "", expire_date_time: "", is_public: true });
        setSelectedImage(null);
        setImagePreview(null);
        fetchVouchers();
      }
    } catch (error: unknown) {
      console.error("Failed to create voucher:", error); // 🔥 Used the error
      if (axios.isAxiosError(error)) {
        addToast(error.response?.data?.message || "Failed to create voucher", "error");
      } else {
        addToast("Failed to create voucher", "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      const res = await api.put(`/web/admin/vouchers/${id}/toggle`);
      if (res.data.success) fetchVouchers();
    } catch (error: unknown) {
      console.error("Toggle error:", error); // 🔥 Used the error
      addToast("Failed to update status", "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this voucher forever?")) return;
    try {
      const res = await api.delete(`/web/admin/vouchers/${id}`);
      if (res.data.success) {
        addToast("Voucher deleted", "info");
        fetchVouchers();
      }
    } catch (error: unknown) {
      console.error("Delete error:", error); // 🔥 Used the error
      addToast("Failed to delete voucher", "error");
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
          <Ticket className="text-blue-600" size={32} />
          Voucher Management
        </h1>
        <p className="text-gray-500 mt-2 font-medium">Create promotional codes, upload banner images, and manage public deals.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* LEFT: Create Voucher Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 sticky top-24">
            <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
              <Plus className="text-blue-600" /> Create New Voucher
            </h2>

            <form onSubmit={handleCreateVoucher} className="space-y-5">

              {/* Image Upload */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Pop-up Banner Image</label>
                <div className="flex items-center justify-center w-full">
                  <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${imagePreview ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-blue-300'}`}>
                    {imagePreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6 text-gray-400">
                        <ImageIcon size={28} className="mb-2" />
                        <p className="text-sm font-bold">Click to upload image</p>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SUMMER20"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-black text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Discount %</label>
                  <input
                    type="number"
                    required
                    min="1" max="100"
                    placeholder="%"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-black text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.discount_percentage}
                    onChange={(e) => setFormData({...formData, discount_percentage: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><MessageSquare size={14}/> Marketing Message</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Get 20% off your entire order today!"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Calendar size={14}/> Expiration Date (Optional)</label>
                <input
                  type="datetime-local"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  value={formData.expire_date_time}
                  onChange={(e) => setFormData({...formData, expire_date_time: e.target.value})}
                />
              </div>

              {/* Public Toggle */}
              <div
                className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-200 cursor-pointer"
                onClick={() => setFormData({...formData, is_public: !formData.is_public})}
              >
                <div>
                  <p className="font-bold text-gray-900 text-sm flex items-center gap-1">
                    {formData.is_public ? <Globe size={16} className="text-green-500"/> : <Lock size={16} className="text-amber-500"/>}
                    {formData.is_public ? "Public Voucher" : "Private Voucher"}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formData.is_public ? "Shows on homepage pop-up" : "Hidden, requires manual code"}
                  </p>
                </div>
                {formData.is_public ? <ToggleRight size={32} className="text-green-500" /> : <ToggleLeft size={32} className="text-gray-300" />}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3.5 rounded-xl transition-all active:scale-95 shadow-md shadow-blue-200 disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {submitting ? <Loader2 size={20} className="animate-spin"/> : <Ticket size={20}/>}
                {submitting ? "Creating..." : "Save Changes"}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT: Voucher List */}
        <div className="lg:col-span-2 space-y-4">
          {vouchers.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center">
              <Ticket size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="font-bold text-gray-900 text-lg">No vouchers found</p>
              <p className="text-gray-500 text-sm mt-1">Create your first discount code on the left!</p>
            </div>
          ) : (
            vouchers.map((voucher) => {
              const isExpired = voucher.expire_date_time && new Date(voucher.expire_date_time) < new Date();

              return (
                <div key={voucher.id} className={`bg-white rounded-3xl p-5 shadow-sm border flex flex-col sm:flex-row items-center gap-6 transition-all ${voucher.is_active && !isExpired ? 'border-gray-100' : 'border-gray-200 opacity-60'}`}>

                  {/* Image Thumbnail */}
                  <div className="w-24 h-24 shrink-0 rounded-2xl bg-gray-50 overflow-hidden border border-gray-100 flex items-center justify-center">
                    {voucher.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={voucher.image_url} alt="Voucher" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="text-gray-300" size={32} />
                    )}
                  </div>

                  <div className="flex-1 text-center sm:text-left w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                      <h3 className="text-2xl font-black text-gray-900 tracking-widest">{voucher.code}</h3>
                      <span className="bg-green-100 text-green-700 font-bold px-3 py-1 rounded-lg text-sm whitespace-nowrap self-center sm:self-auto">
                        {voucher.discount_percentage}% OFF
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-600 line-clamp-2 mb-3">{voucher.description || "No description provided."}</p>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs font-bold">
                      {voucher.is_public ? (
                        <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md"><Globe size={14}/> Public</span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md"><Lock size={14}/> Private</span>
                      )}

                      {voucher.expire_date_time && (
                        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-md ${isExpired ? 'text-red-600 bg-red-50' : 'text-gray-600 bg-gray-100'}`}>
                          <Calendar size={14}/>
                          {isExpired ? "Expired" : "Expires"}: {new Date(voucher.expire_date_time).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex sm:flex-col items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-gray-100 sm:border-l sm:pl-6">
                    <button
                      onClick={() => handleToggle(voucher.id)}
                      className={`flex items-center justify-center gap-2 w-full sm:w-32 py-2.5 rounded-xl font-bold text-sm transition-colors ${voucher.is_active ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-gray-900 text-white hover:bg-black'}`}
                    >
                      {voucher.is_active ? "Deactivate" : "Activate"}
                    </button>

                    <button
                      onClick={() => handleDelete(voucher.id)}
                      className="flex items-center justify-center gap-2 w-full sm:w-32 py-2.5 rounded-xl font-bold text-sm bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>

                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}