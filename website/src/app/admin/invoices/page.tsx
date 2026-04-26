"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useToastStore } from "@/store/useToastStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import {
  FileText, Plus, Receipt, Layout, Trash2, Edit3, Loader2, X, CheckCircle2, Calculator,
  Search, Calendar, History, FileClock
} from "lucide-react";

interface Template {
  id: number;
  name: string;
  type: string;
  is_active: boolean;
  updated_at: string;
}

interface DocumentRecord {
  id: number;
  document_type: string;
  reference_no: string;
  customer_name: string;
  total_amount: string;
  created_at: string;
}

export default function InvoiceTemplatesPage() {
  const router = useRouter();
  const { addToast } = useToastStore();
  const currencySymbol = useSettingsStore((state) => state.currencySymbol);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: "", type: "INVOICE" });

  // 🔥 NEW: Document Records State
  const [activeLogTab, setActiveLogTab] = useState("INVOICE");
  const [records, setRecords] = useState<DocumentRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [searchLog, setSearchLog] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const fetchTemplates = async () => {
    try {
      const res = await api.get("/web/admin/invoice-templates");
      if (res.data.success) setTemplates(res.data.templates);
    } catch (error) {
      addToast("Failed to load templates", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async () => {
    setRecordsLoading(true);
    try {
      const res = await api.get(`/web/admin/document-records?type=${activeLogTab}`);
      if (res.data.success) setRecords(res.data.records);
    } catch (error) {
      console.error("Failed to load records", error);
    } finally {
      setRecordsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch records whenever the active tab changes
  useEffect(() => {
    fetchRecords();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLogTab]);

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

  const handleToggleDefault = async (id: number, currentStatus: boolean) => {
    if (currentStatus) return;
    try {
      const res = await api.put(`/web/admin/invoice-templates/${id}/active`);
      if (res.data.success) {
        addToast("Default template updated successfully!", "success");
        fetchTemplates();
      }
    } catch (error) {
      addToast("Failed to update default template", "error");
    }
  };

  const getTemplateDisplayProps = (type: string) => {
    switch(type) {
      case 'INVOICE': return { icon: <FileText size={28} />, color: 'indigo', label: 'A4 Invoice' };
      case 'RECEIPT': return { icon: <Receipt size={28} />, color: 'orange', label: 'Thermal Receipt' };
      case 'QUOTATION': return { icon: <Calculator size={28} />, color: 'emerald', label: 'Checkout Quote' };
      case 'ADMIN_QUOTATION': return { icon: <Calculator size={28} />, color: 'teal', label: 'Admin Quote' };
      default: return { icon: <FileText size={28} />, color: 'gray', label: 'Document' };
    }
  };

  // 🔥 Filter the records purely on the frontend for instant search speed
  const filteredRecords = records.filter(record => {
    const matchesSearch = record.reference_no.toLowerCase().includes(searchLog.toLowerCase()) ||
                          record.customer_name.toLowerCase().includes(searchLog.toLowerCase());
    const matchesDate = filterDate ? record.created_at.startsWith(filterDate) : true;
    return matchesSearch && matchesDate;
  });

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20">

      {/* --- SECTION 1: TEMPLATE BUILDER --- */}
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
              <Layout className="text-blue-600" size={32} />
              Document Templates
            </h1>
            <p className="text-gray-500 mt-2 font-medium">Design dynamic layouts for A4 checkout invoices, POS receipts, and quotations.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-200"
          >
            <Plus size={20} /> Create New Template
          </button>
        </div>

        {templates.length === 0 ? (
          <div className="bg-white p-16 rounded-3xl text-center border border-dashed border-gray-200">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-gray-900">No templates found</h3>
            <p className="text-gray-500 mt-2">Click the button above to build your first invoice or receipt design!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {templates.map((template) => {
              const props = getTemplateDisplayProps(template.type);
              return (
                <div key={template.id} className={`bg-white rounded-3xl p-6 shadow-sm border transition-all flex flex-col group hover:shadow-md ${template.is_active ? 'border-green-400 ring-2 ring-green-50' : 'border-gray-100'}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-2xl bg-${props.color}-50 text-${props.color}-600`}>
                      {props.icon}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-${props.color}-100 text-${props.color}-700 whitespace-nowrap`}>
                        {props.label}
                      </span>
                      {template.is_active && (
                        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-1 whitespace-nowrap">
                          <CheckCircle2 size={12} /> Default
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-xl font-black text-gray-900 mb-1">{template.name}</h3>
                  <p className="text-xs text-gray-400 font-medium mb-4">Updated: {new Date(template.updated_at).toLocaleDateString()}</p>

                  <div className="flex items-center justify-between mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <span className={`text-xs font-bold ${template.is_active ? 'text-green-700' : 'text-gray-500'}`}>
                      {template.is_active ? 'Active' : 'Set Default'}
                    </span>
                    <button
                      type="button" onClick={() => handleToggleDefault(template.id, template.is_active)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${template.is_active ? 'bg-green-500 cursor-default' : 'bg-gray-300 hover:bg-gray-400'}`}
                    >
                      <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${template.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  <div className="mt-auto grid grid-cols-2 gap-3 pt-4 border-t border-gray-50">
                    <Link href={`/admin/invoices/${template.id}`} className="bg-gray-900 hover:bg-black text-white py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors">
                      <Edit3 size={14}/> Editor
                    </Link>
                    <button onClick={() => handleDelete(template.id)} className="bg-rose-50 hover:bg-rose-100 text-rose-600 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors">
                      <Trash2 size={14}/> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <hr className="border-gray-200" />

      {/* --- SECTION 2: DOCUMENT GENERATION HISTORY (LEDGER) --- */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            <History className="text-blue-600" size={28} />
            Generation Ledger
          </h2>
          <p className="text-gray-500 mt-2 font-medium">View the history of all generated invoices, receipts, and quotations.</p>
        </div>

        {/* Ledger Tabs */}
        <div className="flex flex-wrap gap-2">
          {['INVOICE', 'RECEIPT', 'QUOTATION', 'ADMIN_QUOTATION'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveLogTab(tab)}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                activeLogTab === tab
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {tab === 'INVOICE' && 'A4 Invoices'}
              {tab === 'RECEIPT' && 'Thermal Receipts'}
              {tab === 'QUOTATION' && 'Customer Quotes'}
              {tab === 'ADMIN_QUOTATION' && 'Admin Quotes'}
            </button>
          ))}
        </div>

        {/* Ledger Filters */}
        <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text" placeholder="Search by Reference No. or Customer Name..."
              value={searchLog} onChange={(e) => setSearchLog(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500"
            />
          </div>
          <div className="relative w-full md:w-64">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="date"
              value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 text-gray-600 cursor-pointer"
            />
          </div>
          {(searchLog || filterDate) && (
            <button
              onClick={() => { setSearchLog(''); setFilterDate(''); }}
              className="px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-sm font-bold transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Ledger Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">Reference No.</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {recordsLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                      <Loader2 className="animate-spin mx-auto mb-2 text-blue-600" size={24}/> Loading records...
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                      <FileClock size={32} className="mx-auto mb-2 opacity-50"/>
                      No records found for this category.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr key={record.id} className="border-b border-gray-50 hover:bg-blue-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-600">
                        {new Date(record.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-lg font-bold text-xs tracking-widest">
                          {record.reference_no}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">{record.customer_name}</td>
                      <td className="px-6 py-4 font-black text-gray-900 text-right">
                        {currencySymbol}{parseFloat(record.total_amount).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900"><X size={24} /></button>

            <h2 className="text-2xl font-black text-gray-900 mb-2">New Template</h2>
            <p className="text-gray-500 text-sm mb-6">Choose a document type to set the canvas size and category.</p>

            <form onSubmit={handleCreateTemplate} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Template Name</label>
                <input
                  type="text" required placeholder="e.g., Custom VIP Quotation"
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

                  <label className={`border-2 rounded-xl p-4 cursor-pointer transition-all flex flex-col items-center gap-2 ${newTemplate.type === 'QUOTATION' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white hover:border-emerald-300'}`}>
                    <input type="radio" name="type" className="hidden" checked={newTemplate.type === 'QUOTATION'} onChange={() => setNewTemplate({...newTemplate, type: 'QUOTATION'})} />
                    <Calculator size={24} />
                    <span className="font-bold text-sm text-center">Checkout Quote</span>
                  </label>

                  <label className={`border-2 rounded-xl p-4 cursor-pointer transition-all flex flex-col items-center gap-2 ${newTemplate.type === 'ADMIN_QUOTATION' ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-gray-200 bg-white hover:border-teal-300'}`}>
                    <input type="radio" name="type" className="hidden" checked={newTemplate.type === 'ADMIN_QUOTATION'} onChange={() => setNewTemplate({...newTemplate, type: 'ADMIN_QUOTATION'})} />
                    <Calculator size={24} />
                    <span className="font-bold text-sm text-center">Admin Quote</span>
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