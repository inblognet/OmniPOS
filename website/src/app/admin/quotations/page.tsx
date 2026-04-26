"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import axios from "axios";
import { useToastStore } from "@/store/useToastStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import {
  Search, Plus, Trash2, DownloadCloud, FileText, User,
  Phone, Loader2, Calculator, Tag
} from "lucide-react";

interface Product {
  id: number;
  name: string;
  price: string;
  stock_quantity: number;
  image_url: string | null;
}

interface QuoteItem {
  product_id: number;
  name: string;
  price: number; // Admins can override this!
  quantity: number;
}

export default function AdminQuotationGenerator() {
  const { addToast } = useToastStore();
  const currencySymbol = useSettingsStore((state) => state.currencySymbol);

  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Quote State
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [generating, setGenerating] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  // 1. Fetch Inventory
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.get("/web/products");
        if (res.data.success) {
          setProducts(res.data.products);
        }
      } catch (error) {
        addToast("Failed to load products", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Add to Quote Cart
  const addItem = (product: Product) => {
    const existing = quoteItems.find(item => item.product_id === product.id);
    if (existing) {
      setQuoteItems(quoteItems.map(item =>
        item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setQuoteItems([...quoteItems, {
        product_id: product.id,
        name: product.name,
        price: parseFloat(product.price),
        quantity: 1
      }]);
    }
  };

  // 3. Update Item Details (Allowing Price Overrides!)
  const updateItem = (id: number, field: 'quantity' | 'price', value: number) => {
    if (value < 0) value = 0;
    setQuoteItems(quoteItems.map(item =>
      item.product_id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeItem = (id: number) => {
    setQuoteItems(quoteItems.filter(item => item.product_id !== id));
  };

  // 4. Calculations
  const subTotal = quoteItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const finalTotal = subTotal - (discountAmount || 0);

  // 5. Generate PDF Document
  const handleGeneratePDF = async () => {
    if (quoteItems.length === 0) return addToast("Add some items first!", "error");
    setGenerating(true);
    addToast("Building quotation document...", "info");

    try {
      const res = await axios.post(`${API_BASE_URL}/web/admin/generate-quotation`, {
        items: quoteItems,
        customerName: customerName,
        customerPhone: customerPhone,
        discountAmount: discountAmount
      }, { responseType: 'blob' });

      // Trigger Download
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Quotation_${customerName.replace(/\s+/g, '_') || 'Draft'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      addToast("Quotation downloaded successfully!", "success");
    } catch (error) {
      console.error("Quotation error", error);
      addToast("Failed to generate quotation.", "error");
    } finally {
      setGenerating(false);
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) return <div className="h-full flex justify-center items-center"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-20">

      <div>
        <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
          <FileText className="text-blue-600" size={32} />
          Quotation Generator
        </h1>
        <p className="text-gray-500 mt-2 font-medium">Build custom quotes, override pricing, and generate official PDFs.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

        {/* LEFT: Inventory Search */}
        <div className="xl:col-span-3 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col h-[700px]">
          <h2 className="font-black text-gray-900 mb-4 text-lg">Inventory</h2>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text" placeholder="Search items..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {filteredProducts.map(product => (
              <div key={product.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-colors group cursor-pointer" onClick={() => addItem(product)}>
                <div>
                  <p className="text-sm font-bold text-gray-900 line-clamp-1">{product.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{currencySymbol}{parseFloat(product.price).toFixed(2)} • Stock: {product.stock_quantity}</p>
                </div>
                <button className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-1 rounded-md shadow-sm">
                  <Plus size={16}/>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* MIDDLE: Quotation Builder */}
        <div className="xl:col-span-6 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col h-[700px]">
          <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
            <h2 className="font-black text-gray-900 text-lg flex items-center gap-2"><Calculator className="text-blue-600"/> Quote Items</h2>
            <button onClick={() => setQuoteItems([])} className="text-sm font-bold text-red-500 hover:text-red-600 bg-red-50 px-3 py-1.5 rounded-lg transition-colors">Clear All</button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {quoteItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <FileText size={48} className="mb-4 opacity-50"/>
                <p className="font-bold">No items added</p>
                <p className="text-sm">Click products on the left to start building.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-100 text-xs font-black text-gray-400 uppercase tracking-wider">
                    <th className="pb-3">Item Description</th>
                    <th className="pb-3 w-24">Unit Price</th>
                    <th className="pb-3 w-20">Qty</th>
                    <th className="pb-3 text-right">Total</th>
                    <th className="pb-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {quoteItems.map(item => (
                    <tr key={item.product_id} className="border-b border-gray-50">
                      <td className="py-3 pr-4 font-bold text-gray-900">{item.name}</td>
                      <td className="py-3 pr-2">
                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                          <span className="pl-2 text-xs font-bold text-gray-400">{currencySymbol}</span>
                          <input type="number" min="0" step="0.01" value={item.price} onChange={(e) => updateItem(item.product_id, 'price', parseFloat(e.target.value) || 0)} className="w-full bg-transparent p-1.5 text-sm font-bold outline-none" />
                        </div>
                      </td>
                      <td className="py-3 pr-2">
                        <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(item.product_id, 'quantity', parseInt(e.target.value) || 1)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-1.5 text-center font-bold outline-none focus:border-blue-500" />
                      </td>
                      <td className="py-3 font-black text-gray-900 text-right">{currencySymbol}{(item.price * item.quantity).toFixed(2)}</td>
                      <td className="py-3 text-right">
                        <button onClick={() => removeItem(item.product_id)} className="text-red-400 hover:text-red-600 transition-colors p-1"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* RIGHT: Customer & Summary */}
        <div className="xl:col-span-3 space-y-6 flex flex-col h-[700px]">

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex-shrink-0">
            <h2 className="font-black text-gray-900 mb-4 text-lg">Client Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Client Name / Company</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input type="text" placeholder="e.g. John Doe" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Phone (Optional)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input type="text" placeholder="e.g. 071 234 5678" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-3xl p-6 shadow-sm flex flex-col flex-1">
            <h2 className="font-black text-white mb-6 text-lg border-b border-gray-800 pb-4">Quote Summary</h2>

            <div className="space-y-4 text-sm font-medium text-gray-400 mb-6 flex-1">
              <div className="flex justify-between items-center">
                <span>Subtotal ({quoteItems.length} items)</span>
                <span className="text-white">{currencySymbol}{subTotal.toFixed(2)}</span>
              </div>

              <div>
                <label className="flex justify-between items-center mb-1.5">
                  <span className="flex items-center gap-1"><Tag size={14}/> Custom Discount</span>
                  <span className="text-rose-400">-{currencySymbol}{(discountAmount || 0).toFixed(2)}</span>
                </label>
                <input
                  type="number" min="0" step="0.01"
                  value={discountAmount || ''} onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2 outline-none focus:border-blue-500 transition-colors" placeholder="0.00"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-800 mb-6">
              <div className="flex justify-between items-end">
                <span className="text-gray-400 font-bold uppercase text-xs tracking-wider">Final Estimate</span>
                <span className="text-3xl font-black text-white">{currencySymbol}{Math.max(0, finalTotal).toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleGeneratePDF}
              disabled={generating || quoteItems.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-black flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? <Loader2 size={20} className="animate-spin" /> : <DownloadCloud size={20} />}
              Generate Official PDF
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}