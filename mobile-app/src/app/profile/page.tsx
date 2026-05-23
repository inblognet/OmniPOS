"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone, MapPin, Building, Award, LogOut, Save, Edit2 } from 'lucide-react';
import { useUserStore } from '@/store/useUserStore';
import MobileLayout from '@/components/layout/MobileLayout';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string;
  points: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useUserStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    address: '',
    city: '',
    postal_code: '',
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const res = await api.get(`/web/customers/${user?.id}/profile`);
      if (res.data.success && res.data.profile) {
        setProfile(res.data.profile);
        setFormData({
          phone: res.data.profile.phone || '',
          address: res.data.profile.address || '',
          city: res.data.profile.city || '',
          postal_code: res.data.profile.postal_code || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await api.put(`/web/customers/${user?.id}/profile`, formData);
      if (res.data.success) {
        toast.success('Profile updated successfully');
        setEditing(false);
        fetchProfile();
      } else {
        toast.error('Failed to update profile');
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
    toast.success('Logged out successfully');
  };

  if (loading && !profile) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="pb-20">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 pt-12 pb-8 rounded-b-3xl">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <User size={40} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{profile?.name || user?.name}</h1>
              <p className="text-white/80 text-sm">{profile?.email || user?.email}</p>
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <div className="px-4 -mt-6">
          <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <Award size={20} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Loyalty Points</p>
                  <p className="text-2xl font-bold text-gray-900">{profile?.points || 0}</p>
                </div>
              </div>
              <button
                onClick={() => setEditing(!editing)}
                className="px-4 py-2 bg-gray-100 rounded-xl text-sm font-medium flex items-center gap-2"
              >
                <Edit2 size={16} />
                {editing ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>
          </div>
        </div>

        {/* Profile Info */}
        <div className="px-4 mt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Account Information</h2>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-4">
            <div className="flex items-center gap-3">
              <Mail size={18} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Email Address</p>
                <p className="font-medium text-gray-900">{profile?.email || user?.email}</p>
              </div>
            </div>
            
            {!editing ? (
              <>
                <div className="flex items-center gap-3">
                  <Phone size={18} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Phone Number</p>
                    <p className="font-medium text-gray-900">{profile?.phone || 'Not set'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin size={18} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Address</p>
                    <p className="font-medium text-gray-900">{profile?.address || 'Not set'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Building size={18} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">City / Postal Code</p>
                    <p className="font-medium text-gray-900">
                      {profile?.city || 'Not set'} {profile?.postal_code ? `(${profile.postal_code})` : ''}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Street Address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="City"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="flex-1 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Postal Code"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    className="w-32 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Logout Button */}
        <div className="px-4 mt-8">
          <button
            onClick={handleLogout}
            className="w-full bg-red-50 text-red-600 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 border border-red-200"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>

        {/* App Version */}
        <div className="text-center mt-6 mb-4">
          <p className="text-xs text-gray-400">OmniPOS Mobile App v1.0.0</p>
        </div>
      </div>
    </MobileLayout>
  );
}
