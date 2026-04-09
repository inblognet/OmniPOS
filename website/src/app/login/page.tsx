"use client";
import { useState } from "react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUserStore } from "@/store/useUserStore";
import { LogIn, User as UserIcon, ShieldCheck } from "lucide-react";
import axios from "axios";

export default function LoginPage() {
  const [isEmployee, setIsEmployee] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(""); // Replaces the alert() with a clean UI message

  const router = useRouter();
  const setUser = useUserStore((state) => state.setUser);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      // 1. Choose the correct backend route based on the toggle switch
      const endpoint = isEmployee ? "/web/login/employee" : "/web/login/customer";
      const res = await api.post(endpoint, formData);

      if (res.data.success) {
        if (isEmployee) {
          // Admin Login Success -> Go to Admin Dashboard
          router.push("/admin");
        } else {
          // Customer Login Success -> Save to Store & Go to Homepage
          setUser(res.data.user);
          router.push("/");
        }
      }
    } catch (err: unknown) {
      // Safely extract the error using your axios logic
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message
        : "Login failed. Please check your credentials.";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-gray-100">

        <div className="text-center mb-8">
          <div className="bg-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <LogIn className="text-blue-600" size={32} />
          </div>
          <h2 className="text-3xl font-black text-gray-900">Welcome Back</h2>
          <p className="text-gray-500 mt-2">Sign in to your account</p>
        </div>

        {/* --- CUSTOMER / EMPLOYEE TOGGLE --- */}
        <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => { setIsEmployee(false); setErrorMsg(""); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${
              !isEmployee ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <UserIcon size={16} /> Customer
          </button>
          <button
            type="button"
            onClick={() => { setIsEmployee(true); setErrorMsg(""); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${
              isEmployee ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <ShieldCheck size={16} /> Employee
          </button>
        </div>

        {/* --- ERROR MESSAGE UI --- */}
        {errorMsg && (
          <div className="mb-6 bg-red-50 text-red-600 text-sm font-bold p-4 rounded-xl border border-red-100 text-center animate-in fade-in slide-in-from-top-2">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder={isEmployee ? "admin@omnistore.com" : "Email Address"}
            required
            className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
          />
          <input
            type="password"
            placeholder="Password"
            required
            className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white p-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-100 cursor-pointer"
          >
            {loading ? "Verifying..." : isEmployee ? "Access Admin Panel" : "Login"}
          </button>
        </form>

        {!isEmployee && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 font-medium">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-bold text-blue-600 hover:text-blue-500 transition-colors">
                Sign up
              </Link>
            </p>
          </div>
        )}

      </div>
    </div>
  );
}