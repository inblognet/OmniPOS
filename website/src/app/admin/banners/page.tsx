"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Image as ImageIcon, Plus, Trash2, Eye, EyeOff } from "lucide-react";

interface Banner {
  id: number;
  image_url: string;
  title: string;
  subtitle: string;
  is_active: boolean;
}

export default function AdminBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newBanner, setNewBanner] = useState({ image_url: "", title: "", subtitle: "" });

  const fetchBanners = async () => {
    try {
      const res = await api.get("/web/admin/banners");
      if (res.data.success) setBanners(res.data.banners || []);
    } catch (err) {
      console.error("Failed to fetch banners", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBanners(); }, []);

  const handleAddBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBanner.image_url) return alert("Image URL is required!");

    setIsSubmitting(true);
    try {
      const res = await api.post("/web/admin/banners", newBanner);
      if (res.data.success) {
        setBanners([res.data.banner, ...banners]);
        setNewBanner({ image_url: "", title: "", subtitle: "" });
      }
    } catch (err) {
      alert("Failed to add banner");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleVisibility = async (id: number) => {
    try {
      const res = await api.put(`/web/admin/banners/${id}/toggle`);
      if (res.data.success) {
        setBanners(banners.map(b => b.id === id ? { ...b, is_active: !b.is_active } : b));
      }
    } catch (err) {
      alert("Failed to toggle visibility");
    }
  };

  const deleteBanner = async (id: number) => {
    if (!confirm("Are you sure you want to delete this banner?")) return;
    try {
      const res = await api.delete(`/web/admin/banners/${id}`);
      if (res.data.success) {
        setBanners(banners.filter(b => b.id !== id));
      }
    } catch (err) {
      alert("Failed to delete banner");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-7xl mx-auto px-4">

        <div className="mb-8">
          <h1 className="text-4xl font-black text-gray-900 flex items-center gap-3">
            <ImageIcon className="text-blue-600" size={40} />
            Homepage Banners
          </h1>
          <p className="text-gray-500 mt-2 text-lg">Manage the sliding carousel on your storefront.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Add New Banner Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 sticky top-10">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Plus size={20} className="text-blue-600"/> Add New Banner
              </h2>
              <form onSubmit={handleAddBanner} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Image URL *</label>
                  <input
                    type="text" placeholder="https://..."
                    className="w-full bg-gray-50 border-none px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newBanner.image_url} onChange={e => setNewBanner({...newBanner, image_url: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Title</label>
                  <input
                    type="text" placeholder="e.g. Summer Sale"
                    className="w-full bg-gray-50 border-none px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newBanner.title} onChange={e => setNewBanner({...newBanner, title: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Subtitle</label>
                  <textarea
                    placeholder="e.g. Get 50% off!" rows={3}
                    className="w-full bg-gray-50 border-none px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    value={newBanner.subtitle} onChange={e => setNewBanner({...newBanner, subtitle: e.target.value})}
                  />
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl cursor-pointer">
                  {isSubmitting ? "Saving..." : "Publish Banner"}
                </button>
              </form>
            </div>
          </div>

          {/* Banner List */}
          <div className="lg:col-span-2 space-y-6">
            {loading ? (
              <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
            ) : banners.map(banner => (
              <div key={banner.id} className={`bg-white rounded-3xl p-4 shadow-sm border flex flex-col md:flex-row gap-6 transition-all ${banner.is_active ? 'border-gray-100' : 'border-dashed border-gray-300 opacity-75'}`}>
                <div className="w-full md:w-64 h-36 rounded-2xl overflow-hidden relative bg-gray-100 flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={banner.image_url} alt="Banner" className="w-full h-full object-cover" />
                  {!banner.is_active && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                      <span className="bg-gray-800 text-white text-xs font-bold px-3 py-1 rounded-full"><EyeOff size={14} className="inline mr-1"/> Hidden</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-between py-2">
                  <div>
                    <h3 className="text-xl font-black text-gray-900 mb-1">{banner.title || "No Title"}</h3>
                    <p className="text-gray-500 text-sm line-clamp-2">{banner.subtitle || "No Subtitle"}</p>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => toggleVisibility(banner.id)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-gray-100 hover:bg-gray-200 cursor-pointer text-gray-800">
                      {banner.is_active ? <EyeOff size={16}/> : <Eye size={16}/>} {banner.is_active ? 'Hide' : 'Show'}
                    </button>
                    <button onClick={() => deleteBanner(banner.id)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer">
                      <Trash2 size={16}/> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}