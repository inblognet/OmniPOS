"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useToastStore } from "@/store/useToastStore";
import { FileText, Plus, Receipt, Layout, Trash2, Edit3, Loader2, X, CheckCircle2 } from "lucide-react";

interface Template {
  id: number;
  name: string;
  type: string;
  is_active: boolean;
  updated_at: string;
}

export default function InvoiceTemplatesPage() {
  const router = useRouter();
  const { addToast } = useToastStore();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: "", type: "INVOICE" });

  const fetchTemplates = async () => {
    try {
      const res = await api.get("/web/admin/invoice-templates");
      if (res.data.success) {
        setTemplates(res.data.templates);
      }
    } catch (error) {
      addToast("Failed to load templates", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplate.name.trim()) return;
    setCreating(true);

    try {
      const res = await api.post("/web/admin/invoice-templates", newTemplate);
      if (res.data.success) {
        addToast("Template created! Launching editor...", "success");
        setShowModal(false);
        router.push(`/admin/invoices/${res.data.templateId}`);
      }
    } catch (error) {
      addToast("Failed to create template", "error");
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this template? This cannot be undone.")) return;
    try {
      const res = await api.delete(`/web/admin/invoice-templates/${id}`);
      if (res.data.success) {
        addToast("Template deleted", "info");
        fetchTemplates();
      }
    } catch (error) {
      addToast("Failed to delete template", "error");
    }
  };

  // 🔥 NEW: Toggle Active/Default Template Function
  const handleToggleDefault = async (id: number, currentStatus: boolean) => {
    if (currentStatus) return; // Already the default, do nothing

    try {
      const res = await api.put(`/web/admin/invoice-templates/${id}/active`);
      if (res.data.success) {
        addToast("Default template updated successfully!", "success");
        fetchTemplates(); // Refresh the list to show the new active state
      }
    } catch (error) {
      addToast("Failed to update default template", "error");
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
            <Layout className="text-blue-600" size={32} />
            Invoice & Receipt Templates
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Design dynamic layouts for A4 checkout invoices and thermal POS receipts.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-200"
        >
          <Plus size={20} /> Create New Template
        </button>
      </div>

      {/* Template Grid */}
      {templates.length === 0 ? (
        <div className="bg-white p-16 rounded-3xl text-center border border-dashed border-gray-200">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-900">No templates found</h3>
          <p className="text-gray-500 mt-2">Click the button above to build your first invoice or receipt design!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div key={template.id} className={`bg-white rounded-3xl p-6 shadow-sm border transition-all flex flex-col group hover:shadow-md ${template.is_active ? 'border-green-400 ring-2 ring-green-50' : 'border-gray-100'}`}>

              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-2xl ${template.type === 'INVOICE' ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                  {template.type === 'INVOICE' ? <FileText size={28} /> : <Receipt size={28} />}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${template.type === 'INVOICE' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>
                    {template.type === 'INVOICE' ? 'A4 Document' : 'Thermal Receipt'}
                  </span>
                  {template.is_active && (
                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Active Default
                    </span>
                  )}
                </div>
              </div>

              <h3 className="text-xl font-black text-gray-900 mb-1">{template.name}</h3>
              <p className="text-xs text-gray-400 font-medium mb-4">Last updated: {new Date(template.updated_at).toLocaleDateString()}</p>

              {/* 🔥 NEW: The Toggle Switch */}
              <div className="flex items-center justify-between mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className={`text-sm font-bold ${template.is_active ? 'text-green-700' : 'text-gray-500'}`}>
                  {template.is_active ? 'Currently Active' : 'Set as Default'}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleDefault(template.id, template.is_active)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${template.is_active ? 'bg-green-500 cursor-default' : 'bg-gray-300 hover:bg-gray-400'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${template.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="mt-auto grid grid-cols-2 gap-3 pt-4 border-t border-gray-50">
                <Link
                  href={`/admin/invoices/${template.id}`}
                  className="bg-gray-900 hover:bg-black text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Edit3 size={16}/> Live Editor
                </Link>
                <button
                  onClick={() => handleDelete(template.id)}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-600 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Trash2 size={16}/> Delete
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900"><X size={24} /></button>

            <h2 className="text-2xl font-black text-gray-900 mb-2">New Template</h2>
            <p className="text-gray-500 text-sm mb-6">Choose a document type to set the canvas size.</p>

            <form onSubmit={handleCreateTemplate} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Template Name</label>
                <input
                  type="text" required placeholder="e.g., Default Checkout Invoice"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  value={newTemplate.name} onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Document Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`border-2 rounded-xl p-4 cursor-pointer transition-all flex flex-col items-center gap-2 ${newTemplate.type === 'INVOICE' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white hover:border-indigo-300'}`}>
                    <input type="radio" name="type" className="hidden" checked={newTemplate.type === 'INVOICE'} onChange={() => setNewTemplate({...newTemplate, type: 'INVOICE'})} />
                    <FileText size={24} />
                    <span className="font-bold text-sm">A4 Invoice</span>
                  </label>
                  <label className={`border-2 rounded-xl p-4 cursor-pointer transition-all flex flex-col items-center gap-2 ${newTemplate.type === 'RECEIPT' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 bg-white hover:border-orange-300'}`}>
                    <input type="radio" name="type" className="hidden" checked={newTemplate.type === 'RECEIPT'} onChange={() => setNewTemplate({...newTemplate, type: 'RECEIPT'})} />
                    <Receipt size={24} />
                    <span className="font-bold text-sm text-center">Thermal Receipt</span>
                  </label>
                </div>
              </div>

              <button type="submit" disabled={creating} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 mt-4 disabled:opacity-50">
                {creating ? <Loader2 className="animate-spin" size={20}/> : <Plus size={20}/>}
                Start Building
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}