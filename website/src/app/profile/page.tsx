"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/useUserStore";
import { useToastStore } from "@/store/useToastStore"; // 🔥 Imported the global toast store
import api from "@/lib/api";
import {
  UserCircle, Phone, MapPin, Building, Hash,
  Loader2, Save, Award, Mail
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useUserStore();
  const { addToast } = useToastStore(); // 🔥 Initialize toast function

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postal_code: "",
    points: 0,
  });

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await api.get(`/web/customers/${user.id}/profile`);
        if (res.data.success && res.data.profile) {
          setProfileData({
            name: res.data.profile.name || "",
            email: res.data.profile.email || "",
            phone: res.data.profile.phone || "",
            address: res.data.profile.address || "",
            city: res.data.profile.city || "",
            postal_code: res.data.profile.postal_code || "",
            points: res.data.profile.points || 0,
          });
        }
      } catch (error) {
        console.error("Failed to load profile", error);
        // 🔥 Replaced alert with error toast
        addToast("Failed to load profile data", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, router, addToast]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    try {
      const res = await api.put(`/web/customers/${user.id}/profile`, {
        phone: profileData.phone,
        address: profileData.address,
        city: profileData.city,
        postal_code: profileData.postal_code,
      });

      if (res.data.success) {
        // 🔥 Replaced alert with success toast
        addToast("Profile updated successfully!", "success");
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
      // 🔥 Replaced alert with error toast
      addToast("Failed to update profile. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex justify-center pt-20"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-4xl mx-auto px-4">

        {/* Page Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-gray-900 flex items-center gap-3">
              <UserCircle className="text-blue-600" size={40} />
              My Profile
            </h1>
            <p className="text-gray-500 mt-2 text-lg">Manage your personal information and delivery addresses.</p>
          </div>

          {/* Reward Points Badge */}
          <div className="bg-amber-50 border border-amber-100 px-5 py-3 rounded-2xl flex items-center gap-3 shadow-sm self-start">
            <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
              <Award size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">Reward Points</p>
              <p className="text-xl font-black text-amber-700">{profileData.points}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">

          {/* Read-Only Account Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 pb-8 border-b border-gray-100">
            <div>
              <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
              <div className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-xl border border-gray-100">
                <UserCircle className="text-gray-400" size={20} />
                <span className="font-bold text-gray-900">{profileData.name}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
              <div className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-xl border border-gray-100">
                <Mail className="text-gray-400" size={20} />
                <span className="font-bold text-gray-900">{profileData.email}</span>
              </div>
            </div>
          </div>

          {/* Editable Form */}
          <form onSubmit={handleSave} className="space-y-6">
            <h2 className="text-xl font-black text-gray-900 mb-4">Delivery Information</h2>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="tel"
                  placeholder="Your mobile number"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Street Address</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-4 text-gray-400" size={20} />
                <textarea
                  rows={3}
                  placeholder="Full street address"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 resize-none font-medium transition-all"
                  value={profileData.address}
                  onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                ></textarea>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">City</label>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="City"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all"
                    value={profileData.city}
                    onChange={(e) => setProfileData({...profileData, city: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Postal Code</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Zip / Postal"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all"
                    value={profileData.postal_code}
                    onChange={(e) => setProfileData({...profileData, postal_code: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-gray-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-black py-3 px-8 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}