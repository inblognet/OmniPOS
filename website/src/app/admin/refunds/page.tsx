"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useToastStore } from "@/store/useToastStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { Undo2, XCircle, UploadCloud, Loader2, DollarSign, PackageOpen, Settings, Save } from "lucide-react";

interface RefundRequest {
  id: number;
  order_id: number;
  customer_name: string;
  customer_email: string;
  reason: string;
  bank_details: string;
  status: string;
  refund_amount: string;
  admin_slip_url: string;
  customer_feedback: string;
  created_at: string;
}

export default function AdminRefundsPage() {
  const { addToast } = useToastStore();
  const currencySymbol = useSettingsStore((state) => state.currencySymbol);

  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [stats, setStats] = useState({ total_refunded_amount: 0, total_refunded_orders: 0, restocked_count: 0 });
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  // 🔥 Refund Configuration State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [config, setConfig] = useState({
    refund_policy: "Items must be returned in original condition within the refund window.",
    refund_duration_days: 7,
    refund_processing_days: 3
  });

  // Modal State for Uploading Slip
  const [showSlipModal, setShowSlipModal] = useState<RefundRequest | null>(null);
  const [slipUrl, setSlipUrl] = useState("");
  const [restock, setRestock] = useState(false);

  // 🔥 Fetch both Refunds and the Configuration Policy
  const fetchData = async () => {
    try {
      const [refundsRes, configRes] = await Promise.all([
        api.get("/web/admin/refunds"),
        api.get("/web/settings/refund-policy")
      ]);

      if (refundsRes.data.success) {
        setRequests(refundsRes.data.requests);
        setStats(refundsRes.data.stats);
      }
      if (configRes.data && configRes.data.success) {
        setConfig(configRes.data.policy);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      addToast("Failed to load dashboard data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdateStatus = async (id: number, newStatus: string, slipUrl?: string, restockItems?: boolean) => {
    setProcessingId(id);
    try {
      const res = await api.put(`/web/admin/refunds/${id}`, {
        status: newStatus,
        adminSlipUrl: slipUrl,
        restockItems: restockItems
      });
      if (res.data.success) {
        addToast(`Refund marked as ${newStatus}`, "success");
        setShowSlipModal(null);
        setSlipUrl("");
        fetchData();
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      addToast("Failed to update status", "error");
    } finally {
      setProcessingId(null);
    }
  };

  // 🔥 Save updated configuration
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await api.put("/web/admin/refund-config", config);
      if (res.data.success) {
        addToast("Refund policy updated successfully!", "success");
        setShowConfigModal(false);
      }
    } catch (error) {
      console.error("Failed to update config:", error);
      addToast("Failed to update policy", "error");
    } finally {
      setSavingConfig(false);
    }
  };

  if (loading) return <div className="min-h-screen flex justify-center pt-20"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
            <Undo2 className="text-blue-600" size={32} />
            Refund Management
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Review customer requests, process payments, and track restocked inventory.</p>
        </div>

        {/* 🔥 Configure Policy Button */}
        <button
          onClick={() => setShowConfigModal(true)}
          className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-colors"
        >
          <Settings size={18} className="text-gray-500" /> Configure Policy
        </button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-red-50 p-4 rounded-2xl text-red-600"><DollarSign size={32} /></div>
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase">Total Refunded</p>
            <p className="text-2xl font-black text-gray-900">{currencySymbol}{parseFloat(String(stats.total_refunded_amount) || "0").toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-blue-50 p-4 rounded-2xl text-blue-600"><Undo2 size={32} /></div>
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase">Refunded Orders</p>
            <p className="text-2xl font-black text-gray-900">{stats.total_refunded_orders || 0}</p>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-green-50 p-4 rounded-2xl text-green-600"><PackageOpen size={32} /></div>
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase">Items Restocked</p>
            <p className="text-2xl font-black text-gray-900">{stats.restocked_count || 0}</p>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase">Order / Date</th>
                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase">Customer & Reason</th>
                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {requests.map(req => (
                <tr key={req.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-black text-gray-900 block">#{req.order_id}</span>
                    <span className="text-xs text-gray-500 font-medium">{new Date(req.created_at).toLocaleDateString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-gray-900 block">{req.customer_name}</span>
                    <span className="text-xs text-gray-500 line-clamp-1 max-w-[250px]">{req.reason}</span>
                  </td>
                  <td className="px-6 py-4 font-black text-rose-600">
                    {currencySymbol}{parseFloat(req.refund_amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      req.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                      req.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' :
                      req.status === 'PROCESSED' ? 'bg-indigo-100 text-indigo-700' :
                      req.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {req.status === 'PENDING' && (
                      <>
                        <button onClick={() => handleUpdateStatus(req.id, 'APPROVED')} disabled={processingId === req.id} className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors">Approve</button>
                        <button onClick={() => handleUpdateStatus(req.id, 'REJECTED')} disabled={processingId === req.id} className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors">Reject</button>
                      </>
                    )}
                    {req.status === 'APPROVED' && (
                      <button onClick={() => setShowSlipModal(req)} className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-1.5 rounded-lg font-bold text-xs transition-colors shadow-sm">
                        Upload Slip
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400 font-bold">No refund requests found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🔥 Configuration Settings Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowConfigModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900"><XCircle size={24} /></button>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Refund Settings</h2>
            <p className="text-gray-500 text-sm mb-6">These rules will be displayed to your customers when they view their orders.</p>

            <form onSubmit={handleSaveConfig} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Refund Window (Days)</label>
                  <input type="number" min="0" value={config.refund_duration_days} onChange={(e) => setConfig({...config, refund_duration_days: parseInt(e.target.value) || 0})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-blue-500" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Processing Time (Days)</label>
                  <input type="number" min="1" value={config.refund_processing_days} onChange={(e) => setConfig({...config, refund_processing_days: parseInt(e.target.value) || 1})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-blue-500" required />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Refund Policy Description</label>
                <textarea rows={4} value={config.refund_policy} onChange={(e) => setConfig({...config, refund_policy: e.target.value})} placeholder="e.g. Items must be returned in original packaging..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-blue-500 text-sm" required />
              </div>

              <button
                type="submit"
                disabled={savingConfig}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-4"
              >
                {savingConfig ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
                Save Configuration
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Upload Slip Modal */}
      {showSlipModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowSlipModal(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900"><XCircle size={24} /></button>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Process Refund</h2>
            <p className="text-gray-500 text-sm mb-6">Send the bank slip URL and restock items for Order #{showSlipModal.order_id}.</p>

            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Customer Bank Details</p>
                <p className="text-sm font-medium text-gray-900">{showSlipModal.bank_details}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Bank Transfer Slip Image URL</label>
                <input type="text" placeholder="https://cloudinary.com/..." value={slipUrl} onChange={(e) => setSlipUrl(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-blue-500" />
              </div>

              <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm font-bold text-gray-700">Add items back to inventory (Restock)</span>
              </label>
            </div>

            <button
              onClick={() => handleUpdateStatus(showSlipModal.id, 'PROCESSED', slipUrl, restock)}
              disabled={processingId === showSlipModal.id || !slipUrl}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {processingId === showSlipModal.id ? <Loader2 className="animate-spin" size={20}/> : <UploadCloud size={20}/>}
              Send Slip & Mark Processed
            </button>
          </div>
        </div>
      )}

    </div>
  );
}