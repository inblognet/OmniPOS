"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/useUserStore";
import api from "@/lib/api";
import {
  User, Mail, Phone, MapPin, Building,
  Hash, Award, Save, Loader2
} from "lucide-react";

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string;
  points: number;
}

export default function CustomerProfilePage() {
  const router = useRouter();
  const { user } = useUserStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    name: "", email: "", phone: "", address: "", city: "", postal_code: "", points: 0
  });

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await api.get(`/web/customers/${user.id}/profile`);
        if (res.data.success) {
          const data = res.data.profile;
          setProfile({
            name: data.name || "",
            email: data.email || "",
            phone: data.phone || "",
            address: data.address || "",
            city: data.city || "",
            postal_code: data.postal_code || "",
            points: data.points || 0
          });
        }
      } catch (error) {
        console.error("Failed to load profile", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, router]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    try {
      const res = await api.put(`/web/customers/${user.id}/profile`, {
        phone: profile.phone,
        address: profile.address,
        city: profile.city,
        postal_code: profile.postal_code
      });

      if (res.data.success) {
        alert("Profile updated successfully! This address will be used for future checkouts.");
      }
    } catch (error) {
      alert("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex justify-center pt-20"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-3xl mx-auto px-4">

        <div className="mb-10">
          <h1 className="text-4xl font-black text-gray-900 flex items-center gap-3">
            <User className="text-blue-600" size={40} />
            My Profile
          </h1>
          <p className="text-gray-500 mt-2 text-lg">Manage your default shipping address and account details.</p>
        </div>

        {/* Loyalty Points Card */}
        <div className="bg-gradient-to-r from-amber-400 to-amber-500 rounded-3xl p-8 shadow-lg shadow-amber-200 mb-8 text-amber-950 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black flex items-center gap-2 mb-1">
              <Award size={24} /> OmniStore Rewards
            </h2>
            <p className="font-medium opacity-90">Earn points on every purchase!</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-black">{profile.points}</p>
            <p className="text-sm font-bold uppercase tracking-wider opacity-80">Total Points</p>
          </div>
        </div>

        {/* Profile Settings Form */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <form onSubmit={handleSaveProfile} className="space-y-6">

            {/* Read-Only Account Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-gray-100">
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Full Name</label>
                <div className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-xl border border-gray-100 text-gray-500">
                  <User size={18} />
                  <span className="font-bold">{profile.name}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Email Address</label>
                <div className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-xl border border-gray-100 text-gray-500">
                  <Mail size={18} />
                  <span className="font-bold truncate">{profile.email}</span>
                </div>
              </div>
            </div>

            <h3 className="text-xl font-black text-gray-900 pt-2">Default Shipping Details</h3>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="tel"
                  placeholder="e.g. +1 234 567 8900"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  value={profile.phone}
                  onChange={(e) => setProfile({...profile, phone: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Street Address</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-4 text-gray-400" size={20} />
                <textarea
                  rows={3}
                  placeholder="Street name, apartment, suite, etc."
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none font-medium"
                  value={profile.address}
                  onChange={(e) => setProfile({...profile, address: e.target.value})}
                ></textarea>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">City / Province</label>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="City Name"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                    value={profile.city}
                    onChange={(e) => setProfile({...profile, city: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Postal / Zip Code</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="e.g. 10001"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                    value={profile.postal_code}
                    onChange={(e) => setProfile({...profile, postal_code: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-200 mt-4 disabled:opacity-50"
            >
              {saving ? <Loader2 size={24} className="animate-spin" /> : <><Save size={24} /> Save Profile Settings</>}
            </button>

          </form>
        </div>

      </div>
    </div>
  );
}