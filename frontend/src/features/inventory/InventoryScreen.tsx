// cspell:ignore dexie IMEI qrcode react-barcode bcid Barcodes Uncategorized
import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Product, Category, ProductBatch } from '../../db/db';
import { useInventoryLogic } from '../../hooks/useInventoryLogic';
import { PRESETS, BusinessType, InventoryPreset } from '../../config/inventoryConfig';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import {
  Search, Plus, Edit, Trash2, X, Save,
  Tag, DollarSign, Box, Layers, AlertTriangle, CheckCircle, Ban, RefreshCw, FolderTree, ChevronDown, Settings, Calendar,
  Scan, QrCode, Printer, CheckSquare, Square, PackagePlus, RotateCcw,
  Activity, AlertOctagon, LayoutGrid, Archive, FileText
} from 'lucide-react';
import { useCurrency } from '../../hooks/useCurrency';

const InventoryScreen: React.FC = () => {
  const currency = useCurrency();
  const { config, reportDamage, checkExpiries } = useInventoryLogic();

  useEffect(() => {
    checkExpiries();
  }, [config.features.expiryTracking]);

  // --- Data Queries ---
  const products = useLiveQuery(() => db.products.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];

  // --- UI State ---
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'pricing' | 'inventory' | 'settings'>('basic');
  const [editingId, setEditingId] = useState<number | null>(null);

  // --- Config Selector State ---
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedPresetKey, setSelectedPresetKey] = useState<BusinessType>('General_Retail');
  const [featureOverrides, setFeatureOverrides] = useState<any>({});

  // --- Category Management State ---
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<number | null>(null);

  // --- Damage Reporting State ---
  const [showDamageModal, setShowDamageModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [damageQty, setDamageQty] = useState(1);
  const [damageNote, setDamageNote] = useState('');

  // --- Barcode Management State ---
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [barcodeCategoryFilter, setBarcodeCategoryFilter] = useState('');
  const [selectedBarcodeIds, setSelectedBarcodeIds] = useState<number[]>([]);
  const [viewingCode, setViewingCode] = useState<{ id: number, type: 'barcode' | 'qr', value: string, name: string } | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // ✅ Size and Type Settings for Batch Printing
  const [printCardSize, setPrintCardSize] = useState<number>(200);
  const [printType, setPrintType] = useState<'barcode' | 'qr'>('barcode');

  // --- ✅ NEW: Stat Modal State ---
  const [activeStatModal, setActiveStatModal] = useState<'products' | 'categories' | 'stock' | 'expired' | 'damaged' | null>(null);

  // --- Form State ---
  const [formData, setFormData] = useState<Product>({
    name: '', sku: '', barcode: '', category: '', brand: '', type: 'Stock', variantGroup: '', variantName: '',
    stockIssueDate: '', stockExpiryDate: '', batchNumber: '', serialNumber: '',
    costPrice: 0, price: 0, wholesalePrice: 0, minSellingPrice: 0,
    isTaxIncluded: false, allowDiscount: true, unit: config.defaultUnit || 'pcs', fractionalAllowed: false,
    stock: 0, reorderLevel: 5, maxStockLevel: 100, isActive: true, allowNegativeStock: false,
    totalQty: 0, damagedQty: 0, expiredQty: 0,
    batches: [],
    createdAt: '', updatedAt: ''
  });

  // --- Batch Entry State ---
  const [newBatch, setNewBatch] = useState<ProductBatch>({
      id: '', batchNumber: '', quantity: 0, issueDate: '', expiryDate: ''
  });
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);

  // --- Dashboard Metrics Calculation ---
  const totalProducts = products.length;
  const totalCategories = categories.length;
  const totalDamagedItems = products.reduce((acc, p) => acc + (p.damagedQty || 0), 0);
  const totalStockOnHand = products.reduce((acc, p) => acc + (p.stock || 0), 0);

  // Calculate Expired Items from Batches
  const expiredBatchesList = products.flatMap(p =>
      (p.batches || [])
      .filter(b => b.expiryDate && new Date(b.expiryDate) < new Date())
      .map(b => ({ productName: p.name, ...b }))
  );
  const totalExpiredItems = expiredBatchesList.reduce((acc, b) => acc + b.quantity, 0);

  // Filter Logic
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode.includes(search)
  );

  const barcodeFilteredProducts = products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(barcodeSearch.toLowerCase()) ||
                            p.sku?.toLowerCase().includes(barcodeSearch.toLowerCase()) ||
                            p.barcode.toLowerCase().includes(barcodeSearch.toLowerCase());
      const matchesCategory = barcodeCategoryFilter ? p.category.includes(barcodeCategoryFilter) : true;
      return matchesSearch && matchesCategory && p.barcode;
  });

  // --- Helpers ---
  const handleAutoGenerateIdentifiers = () => {
    const randomSku = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const randomBarcode = Math.floor(10000000 + Math.random() * 90000000).toString();
    setFormData(prev => ({ ...prev, sku: `ITEM-${randomSku}`, barcode: randomBarcode }));
  };

  const handleBatchPrint = () => {
      const itemsToPrint = products.filter(p => selectedBarcodeIds.includes(p.id!));
      if (itemsToPrint.length === 0 && viewingCode) { handlePrintSingle(); return; }
      if (itemsToPrint.length === 0) return alert("Select at least one item to print.");

      const printWindow = window.open('', '', 'height=800,width=1000');
      if(printWindow) {
          printWindow.document.write('<html><head><title>Print Labels</title>');
          printWindow.document.write(`
            <style>
              body { font-family: sans-serif; padding: 20px; }
              .grid { display: grid; grid-template-columns: repeat(auto-fit, ${printCardSize}px); gap: 20px; justify-content: start; }
              .card { border: 1px solid #ccc; padding: 10px; text-align: center; page-break-inside: avoid; border-radius: 8px; display: flex; flex-direction: column; justify-content: space-between; height: ${printCardSize * 1.3}px; box-sizing: border-box; background-color: white; }
              .name { font-size: 14px; font-weight: bold; margin-bottom: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
              .barcode-container { flex-grow: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; }
              .price { font-size: 16px; font-weight: bold; margin-top: 10px; }
              svg, img { max-width: 100%; height: auto; }
            </style>
          `);
          printWindow.document.write('</head><body><h2>Product Labels</h2><div class="grid">');

          itemsToPrint.forEach(item => {
             const bcid = printType === 'barcode' ? 'code128' : 'qrcode';
             const scale = Math.max(2, printCardSize / 80).toFixed(1);
             printWindow.document.write(`<div class="card"><div class="name">${item.name}</div><div class="barcode-container"><img src="https://bwipjs-api.metafloor.com/?bcid=${bcid}&text=${item.barcode}&scale=${scale}&includetext" alt="${item.barcode}" /></div><div class="price">${currency}${item.price.toFixed(2)}</div></div>`);
          });

          printWindow.document.write('</div></body></html>');
          printWindow.document.close();
          setTimeout(() => printWindow.print(), 500);
      }
  };

  const handlePrintSingle = () => {
      if (printRef.current && viewingCode) {
          const content = printRef.current.innerHTML;
          const printWindow = window.open('', '', 'height=600,width=800');
          if(printWindow) {
              printWindow.document.write('<html><head><title>Print Code</title><style>body{display:flex;justify-content:center;align-items:center;height:100vh;}</style></head><body>');
              printWindow.document.write(content);
              printWindow.document.write('</body></html>');
              printWindow.document.close();
              printWindow.print();
          }
      }
  };

  const toggleBarcodeSelection = (id: number) => {
      setSelectedBarcodeIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectAllBarcodes = () => {
      if (selectedBarcodeIds.length === barcodeFilteredProducts.length) setSelectedBarcodeIds([]);
      else setSelectedBarcodeIds(barcodeFilteredProducts.map(p => p.id!));
  };

  const getStockStatus = (item: Product) => {
    if (item.type !== 'Stock') return { label: 'N/A', color: 'bg-transparent text-gray-500 border-gray-400' };
    const hasExpiredBatch = item.batches?.some(b => b.expiryDate && new Date(b.expiryDate) < new Date());
    if (hasExpiredBatch) return { label: 'Has Expired Stock', color: 'bg-transparent text-orange-600 border-orange-200' };

    if (config.features.expiryTracking && item.stockExpiryDate) {
        const today = new Date();
        const expiry = new Date(item.stockExpiryDate);
        const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 3600 * 24));
        if (daysLeft < 0) return { label: 'EXPIRED', color: 'bg-transparent text-red-600 border-red-200' };
        if (daysLeft < 7) return { label: `Expiring (${daysLeft}d)`, color: 'bg-transparent text-orange-600 border-orange-200' };
    }

    if (item.stock <= 0) return { label: 'Out of Stock', color: 'bg-transparent text-red-600 border-red-200' };
    if (item.stock <= (item.reorderLevel || 5)) return { label: 'Low Stock', color: 'bg-transparent text-yellow-600 border-yellow-400' };
    return { label: 'In Stock', color: 'bg-transparent text-green-600 border-green-400' };
  };

  const handleOpenConfig = async () => {
    const currentSettings = await db.businessSettings.get(1);
    const currentOverrides = await db.inventoryOverrides.get(1);
    if (currentSettings) setSelectedPresetKey(currentSettings.businessType);
    if (currentOverrides?.overrideJson?.features) setFeatureOverrides(currentOverrides.overrideJson.features);
    setShowConfigModal(true);
  };

  const handleSaveConfig = async () => {
    await db.transaction('rw', db.businessSettings, db.inventoryOverrides, async () => {
        await db.businessSettings.put({ id: 1, businessType: selectedPresetKey, storeName: 'My Store', createdAt: new Date().toISOString() });
        await db.inventoryOverrides.put({ id: 1, overrideJson: { features: featureOverrides as any } });
    });
    window.location.reload();
  };

  const toggleFeatureOverride = (key: string) => {
      setFeatureOverrides((prev: any) => ({
          ...prev,
          [key]: prev[key] === undefined ? !(PRESETS[selectedPresetKey].features as any)[key] : !prev[key]
      }));
  };

  const handleSaveBatch = () => {
      if(newBatch.quantity <= 0) return alert("Quantity must be greater than 0");
      if(!newBatch.expiryDate && config.features.expiryTracking) return alert("Expiry date is required.");

      let updatedBatches = [...(formData.batches || [])];
      if (editingBatchId) {
          updatedBatches = updatedBatches.map(b => b.id === editingBatchId ? { ...newBatch, id: editingBatchId } : b);
          setEditingBatchId(null);
      } else {
          updatedBatches.push({ ...newBatch, id: Date.now().toString(), batchNumber: newBatch.batchNumber || `B-${Date.now().toString().slice(-4)}` });
      }

      const totalStock = updatedBatches.reduce((acc, b) => acc + b.quantity, 0);
      const earliestExpiry = updatedBatches.length > 0 ? updatedBatches.reduce((earliest, b) => (b.expiryDate && new Date(b.expiryDate) < new Date(earliest) ? b.expiryDate : earliest), updatedBatches[0].expiryDate || '') : '';

      setFormData(prev => ({ ...prev, batches: updatedBatches, stock: totalStock, stockExpiryDate: earliestExpiry }));
      setNewBatch({ id: '', batchNumber: '', quantity: 0, issueDate: '', expiryDate: '' });
  };

  const startEditBatch = (batch: ProductBatch) => { setNewBatch({ ...batch }); setEditingBatchId(batch.id); };
  const cancelEditBatch = () => { setNewBatch({ id: '', batchNumber: '', quantity: 0, issueDate: '', expiryDate: '' }); setEditingBatchId(null); };
  const removeBatch = (batchId: string) => {
      if(editingBatchId === batchId) cancelEditBatch();
      const updatedBatches = formData.batches?.filter(b => b.id !== batchId) || [];
      const totalStock = updatedBatches.reduce((acc, b) => acc + b.quantity, 0);
      setFormData(prev => ({ ...prev, batches: updatedBatches, stock: totalStock }));
  };

  const openCreateModal = () => {
    setEditingId(null); setActiveTab('basic');
    const initialStock = config.features.expiryTracking ? 0 : 0;
    setFormData({ name: '', sku: '', barcode: '', category: '', brand: '', type: 'Stock', variantGroup: '', variantName: '', stockIssueDate: '', stockExpiryDate: '', batchNumber: '', serialNumber: '', costPrice: 0, price: 0, wholesalePrice: 0, minSellingPrice: 0, isTaxIncluded: false, allowDiscount: true, unit: config.defaultUnit || 'pcs', fractionalAllowed: false, stock: initialStock, reorderLevel: 5, maxStockLevel: 100, isActive: true, allowNegativeStock: false, totalQty: 0, damagedQty: 0, expiredQty: 0, batches: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    setNewBatch({ id: '', batchNumber: '', quantity: 0, issueDate: '', expiryDate: '' }); setEditingBatchId(null); setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingId(product.id!); setActiveTab('basic');
    setFormData({ ...product, batches: product.batches || [] });
    setNewBatch({ id: '', batchNumber: '', quantity: 0, issueDate: '', expiryDate: '' }); setEditingBatchId(null); setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return alert("Name and Price are required.");
    let finalStock = parseFloat(formData.stock.toString());
    if (config.features.expiryTracking) {
        finalStock = (formData.batches || []).reduce((acc, b) => acc + b.quantity, 0);
    }
    const payload = { ...formData, updatedAt: new Date().toISOString(), price: parseFloat(formData.price.toString()), costPrice: parseFloat(formData.costPrice.toString()), wholesalePrice: formData.wholesalePrice ? parseFloat(formData.wholesalePrice.toString()) : 0, minSellingPrice: formData.minSellingPrice ? parseFloat(formData.minSellingPrice.toString()) : 0, stock: finalStock, reorderLevel: parseFloat((formData.reorderLevel || 0).toString()), batches: formData.batches };
    try { if (editingId) await db.products.update(editingId, payload); else await db.products.add(payload); setShowModal(false); } catch (error) { console.error("Failed to save product:", error); }
  };

  const handleDelete = async (id: number) => { if (window.confirm("Are you sure you want to delete this product?")) await db.products.delete(id); };
  const handleAddCategory = async () => { if (!newCatName.trim()) return; if (editingCatId) { await db.categories.update(editingCatId, { name: newCatName }); setEditingCatId(null); } else { await db.categories.add({ name: newCatName }); } setNewCatName(''); };
  const handleDeleteCategory = async (id: number) => { if(window.confirm("Delete this category?")) await db.categories.delete(id); };
  const handleDeleteAllCategories = async () => { if (window.prompt("Type 'DELETE' to confirm:") === "DELETE") await db.categories.clear(); };
  const startEditCategory = (cat: Category) => { setNewCatName(cat.name); setEditingCatId(cat.id!); };

  const toggleCategorySelection = (catName: string) => {
    const currentCats = formData.category ? formData.category.split(',').map(s => s.trim()).filter(Boolean) : [];
    let newCats = currentCats.includes(catName) ? currentCats.filter(c => c !== catName) : [...currentCats, catName];
    setFormData({ ...formData, category: newCats.join(', ') });
  };

  const handleConfirmDamage = async () => {
    if (selectedProduct && selectedProduct.id) {
        await reportDamage(selectedProduct.id, damageQty, damageNote);
        setShowDamageModal(false); setDamageQty(1); setDamageNote(''); setSelectedProduct(null);
    }
  };

  const isBarcodeFeatureEnabled = (featureOverrides as any).barcodeGeneration ?? false;

  return (
    <div className="h-full flex flex-col bg-gray-50 p-6 overflow-y-auto">

      {/* --- HEADER --- */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Box className="text-blue-600" /> Inventory Management
            <span className="text-xs font-normal bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">{config.name}</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage stock, pricing, and details.</p>
        </div>
        <div className="flex gap-2">
            <button onClick={handleOpenConfig} className="bg-white text-gray-700 border border-gray-300 px-4 py-2.5 rounded-xl font-bold shadow-sm hover:bg-gray-50 flex items-center gap-2 transition-all"><Settings size={18} /> Configure Shop</button>
            <button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-200 flex items-center gap-2 transition-all active:scale-95"><Plus size={20} /> Add Product</button>
        </div>
      </div>

      {/* --- ✅ NEW: DASHBOARD GRID OVERVIEW --- */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
         <div onClick={() => setActiveStatModal('products')} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-all hover:border-blue-300">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Products</div>
            <div className="text-2xl font-bold text-blue-600 flex items-center gap-2"><Archive size={24}/> {totalProducts}</div>
         </div>
         <div onClick={() => setActiveStatModal('categories')} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-all hover:border-purple-300">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Categories</div>
            <div className="text-2xl font-bold text-purple-600 flex items-center gap-2"><LayoutGrid size={24}/> {totalCategories}</div>
         </div>
         <div onClick={() => setActiveStatModal('stock')} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-all hover:border-green-300">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Stock On Hand</div>
            <div className="text-2xl font-bold text-green-600 flex items-center gap-2"><Activity size={24}/> {totalStockOnHand}</div>
         </div>
         <div onClick={() => setActiveStatModal('expired')} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-all hover:border-orange-300">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">All Expired Items Total</div>
            <div className="text-2xl font-bold text-orange-600 flex items-center gap-2"><Calendar size={24}/> {totalExpiredItems}</div>
         </div>
         <div onClick={() => setActiveStatModal('damaged')} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-all hover:border-red-300">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">All Damage Item Count</div>
            <div className="text-2xl font-bold text-red-600 flex items-center gap-2"><AlertOctagon size={24}/> {totalDamagedItems}</div>
         </div>
      </div>

      {/* --- TOOLBAR --- */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Search by name, sku, or barcode..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 transition-all" />
        </div>
      </div>

      {/* --- PRODUCT TABLE --- */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col mb-8">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Product Info</th>
                <th className="px-6 py-4">Categories</th>
                {config.fields.brand.visible && <th className="px-6 py-4">Brand</th>}
                <th className="px-6 py-4 text-right">Price</th>
                <th className="px-6 py-4 text-center">Stock</th>
                {config.features.expiryTracking && <th className="px-6 py-4 text-center text-orange-600">Expiry</th>}
                {config.features.damageTracking && <th className="px-6 py-4 text-center text-red-600">Damaged</th>}
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.length === 0 ? <tr><td colSpan={10} className="px-6 py-12 text-center text-gray-400">No products found.</td></tr> : filteredProducts.map((p) => {
                  const status = getStockStatus(p);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-all group">
                      <td className="px-6 py-4"><div className="font-bold text-gray-800">{p.name}</div><div className="text-xs text-gray-400 font-mono mt-0.5">{config.fields.sku.visible && <span>SKU: {p.sku || '-'}</span>} {config.fields.barcode.visible && <span className="ml-1">| Bar: {p.barcode}</span>}</div></td>
                      <td className="px-6 py-4"><div className="flex flex-wrap gap-1">{p.category ? p.category.split(',').map((cat, idx) => <span key={idx} className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-100">{cat.trim()}</span>) : <span className="text-xs text-gray-400">Uncategorized</span>}</div></td>
                      {config.fields.brand.visible && <td className="px-6 py-4 text-gray-600">{p.brand || '-'}</td>}
                      <td className="px-6 py-4 text-right font-bold text-gray-800">{currency}{p.price.toFixed(2)}</td>
                      <td className="px-6 py-4 text-center"><span className={`px-3 py-1 rounded-full text-sm font-bold border border-blue-200 bg-transparent text-blue-600`}>{p.stock} {p.unit}</span></td>
                      {config.features.expiryTracking && <td className="px-6 py-4 text-center text-xs">{p.stockExpiryDate ? <div className="flex items-center justify-center gap-1 text-orange-600 font-mono"><Calendar size={12} /> <span>{new Date(p.stockExpiryDate).toLocaleDateString()}</span></div> : <span className="text-gray-400">-</span>}</td>}
                      {config.features.damageTracking && <td className="px-6 py-4 text-center">{p.damagedQty && p.damagedQty > 0 ? <span className="text-red-600 font-bold bg-red-50 px-2 py-1 rounded text-xs border border-red-100">{p.damagedQty}</span> : <span className="text-gray-400">-</span>}</td>}
                      <td className="px-6 py-4 text-center"><span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border ${status.color}`}>{status.label}</span></td>
                      <td className="px-6 py-4 text-right"><div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {config.features.damageTracking && <button onClick={() => { setSelectedProduct(p); setShowDamageModal(true); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><AlertTriangle size={16} /></button>}
                        <button onClick={() => openEditModal(p)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={16} /></button>
                        <button onClick={() => handleDelete(p.id!)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                      </div></td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><FolderTree size={20} className="text-purple-600" /> Category Management</h2>
                <div className="flex gap-2">
                    <input type="text" placeholder="New Category" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
                    <button onClick={handleAddCategory} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">{editingCatId ? 'Update' : 'Add'}</button>
                    <button onClick={handleDeleteAllCategories} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"><Trash2 size={14} /></button>
                    {editingCatId && <button onClick={() => { setEditingCatId(null); setNewCatName(''); }} className="text-gray-500 text-sm hover:underline">Cancel</button>}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                {categories.map(cat => (
                    <div key={cat.id} className="group flex justify-between items-center bg-white border border-gray-200 hover:border-purple-300 hover:shadow-sm px-3 py-2 rounded-lg transition-all cursor-pointer">
                        <span className="font-medium text-gray-700 text-sm truncate">{cat.name}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEditCategory(cat)} className="text-blue-500 hover:text-blue-700"><Edit size={12}/></button>
                            <button onClick={() => handleDeleteCategory(cat.id!)} className="text-red-500 hover:text-red-700"><Trash2 size={12}/></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {(isBarcodeFeatureEnabled || config.features.serialTracking) && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col h-full">
               <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Scan size={20} className="text-blue-600" /> Product Identifiers</h2>
                  <div className="flex gap-2 items-center">
                      <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-200"><span className="text-xs text-gray-500">Size (px):</span><input type="number" min="100" max="500" value={printCardSize} onChange={(e) => setPrintCardSize(Number(e.target.value))} className="w-14 text-xs bg-transparent outline-none font-bold text-right" /></div>
                      <select value={printType} onChange={(e) => setPrintType(e.target.value as 'barcode' | 'qr')} className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none font-bold text-gray-700 h-[26px]"><option value="barcode">Barcode</option><option value="qr">QR Code</option></select>
                      <button onClick={selectAllBarcodes} className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200 text-gray-600">{selectedBarcodeIds.length === barcodeFilteredProducts.length ? 'Deselect All' : 'Select All'}</button>
                      <button onClick={handleBatchPrint} className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold flex items-center gap-1 hover:bg-blue-700"><Printer size={12}/> Print ({selectedBarcodeIds.length})</button>
                  </div>
               </div>
               <div className="flex gap-2 mb-3">
                   <div className="relative flex-1"><Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"/><input type="text" placeholder="Filter..." value={barcodeSearch} onChange={(e) => setBarcodeSearch(e.target.value)} className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"/></div>
                   <select value={barcodeCategoryFilter} onChange={(e) => setBarcodeCategoryFilter(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none bg-white text-gray-600"><option value="">All Categories</option>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
               </div>
               <div className="flex-1 flex gap-4 overflow-hidden h-64">
                  <div className="w-1/2 border-r border-gray-100 pr-4 overflow-y-auto">
                    {barcodeFilteredProducts.length === 0 ? <div className="text-center text-xs text-gray-400 mt-10">No items found.</div> :
                        barcodeFilteredProducts.map(p => (
                        <div key={p.id} onClick={() => setViewingCode({ id: p.id!, type: viewingCode?.id === p.id && viewingCode?.type === 'qr' ? 'qr' : 'barcode', value: p.barcode, name: p.name })} className={`flex justify-between items-center p-2 border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${viewingCode?.id === p.id ? 'bg-blue-50' : ''}`}>
                            <div className="flex items-center gap-2 overflow-hidden">
                                <button onClick={(e) => { e.stopPropagation(); toggleBarcodeSelection(p.id!); }}>{selectedBarcodeIds.includes(p.id!) ? <CheckSquare size={16} className="text-blue-600"/> : <Square size={16} className="text-gray-300"/>}</button>
                                <div className="truncate"><div className="font-medium text-sm text-gray-800 truncate">{p.name}</div><div className="text-xs font-mono text-gray-500">{p.barcode}</div></div>
                            </div>
                            <div className="flex gap-1 shrink-0"><button onClick={(e) => { e.stopPropagation(); setViewingCode({ id: p.id!, type: 'barcode', value: p.barcode, name: p.name }); }} className="p-1.5 bg-white border border-gray-200 rounded hover:text-blue-600"><Scan size={12}/></button><button onClick={(e) => { e.stopPropagation(); setViewingCode({ id: p.id!, type: 'qr', value: p.barcode, name: p.name }); }} className="p-1.5 bg-white border border-gray-200 rounded hover:text-purple-600"><QrCode size={12}/></button></div>
                        </div>
                        ))}
                  </div>
                  <div className="w-1/2 flex flex-col items-center justify-center p-4 bg-gray-50 rounded-xl relative">
                      {viewingCode ? (
                        <div className="text-center w-full">
                            <h3 className="font-bold text-gray-700 mb-4 text-sm uppercase">{viewingCode.type === 'barcode' ? 'Barcode' : 'QR Code'}</h3>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 inline-block mb-4" ref={printRef}>{viewingCode.type === 'barcode' ? <Barcode value={viewingCode.value} width={1.5} height={50} fontSize={14} /> : <QRCodeSVG value={viewingCode.value} size={120} level={"H"} includeMargin={true}/>}<div className="mt-2 text-sm font-bold text-gray-800">{viewingCode.name}</div></div>
                            <button onClick={handlePrintSingle} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"><Printer size={16}/> Print</button>
                        </div>
                      ) : ( <div className="text-center text-gray-400"><Scan size={32} className="mx-auto mb-2 opacity-50"/><p className="text-xs">Select an item to preview.</p></div> )}
                  </div>
               </div>
          </div>
        )}
      </div>

      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Settings className="text-blue-600"/> Shop Configuration</h2><button onClick={() => setShowConfigModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button></div>
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Business Type (Preset)</label>
                        <select value={selectedPresetKey} onChange={(e) => setSelectedPresetKey(e.target.value as BusinessType)} className="w-full p-3 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500">
                            {['Computer_Shop', 'Grocery_Store', 'Pharmacy', 'Clothing_Store', 'Restaurant', 'Beauty_Salon', 'Hardware_Store', 'General_Retail'].map((key) => ( <option key={key} value={key}>{key.replace('_', ' ')}</option> ))}
                        </select>
                    </div>
                    <div className="border-t border-gray-100 my-4"></div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-700 mb-3">Feature Overrides</h3>
                        <div className="grid grid-cols-1 gap-3">
                            <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"><span className="text-sm font-medium text-gray-700">Batch Management & Expiry Tracking</span><input type="checkbox" checked={featureOverrides.expiryTracking ?? PRESETS[selectedPresetKey].features.expiryTracking} onChange={() => toggleFeatureOverride('expiryTracking')} className="w-5 h-5 text-blue-600 rounded" /></label>
                            <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"><span className="text-sm font-medium text-gray-700">Damage Control System</span><input type="checkbox" checked={featureOverrides.damageTracking ?? PRESETS[selectedPresetKey].features.damageTracking} onChange={() => toggleFeatureOverride('damageTracking')} className="w-5 h-5 text-blue-600 rounded" /></label>
                            <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"><span className="text-sm font-medium text-gray-700">Serial Number / IMEI Tracking</span><input type="checkbox" checked={featureOverrides.serialTracking ?? PRESETS[selectedPresetKey].features.serialTracking} onChange={() => toggleFeatureOverride('serialTracking')} className="w-5 h-5 text-blue-600 rounded" /></label>
                            <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"><span className="text-sm font-medium text-gray-700">Barcode & QR Features</span><input type="checkbox" checked={featureOverrides.barcodeGeneration ?? false} onChange={() => toggleFeatureOverride('barcodeGeneration')} className="w-5 h-5 text-blue-600 rounded" /></label>
                        </div>
                    </div>
                    <button onClick={handleSaveConfig} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md mt-4">Save & Apply Changes</button>
                </div>
            </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50"><h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">{editingId ? 'Edit Product' : 'New Product'}</h2><button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><X size={20} /></button></div>
            <div className="flex border-b border-gray-200 px-6 bg-white">{[{id: 'basic', label: 'Basic Info', icon: Tag}, {id: 'pricing', label: 'Pricing & Tax', icon: DollarSign}, {id: 'inventory', label: 'Inventory & Stock', icon: Box}, {id: 'settings', label: 'Rules & Settings', icon: Layers}].map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}><tab.icon size={16} /> {tab.label}</button>))}</div>
            <div className="flex-1 overflow-y-auto p-8 bg-white">
              <form onSubmit={handleSave} className="space-y-8">
                {activeTab === 'basic' && (
                  <div className="grid grid-cols-2 gap-6">
                      <div className="col-span-2"><label className="block text-xs font-bold text-gray-500 mb-1">Product Name *</label><input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium" /></div>

                      {/* ✅ THE FIX: Single button to generate BOTH SKU and Barcode */}
                      {config.fields.sku.visible && <div><label className="block text-xs font-bold text-gray-500 mb-1">SKU</label><div className="flex gap-2"><input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full p-3 border rounded-lg outline-none font-mono text-sm" placeholder="AUTO-001" /><button type="button" onClick={handleAutoGenerateIdentifiers} className="px-3 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-600 transition-colors"><RefreshCw size={18}/></button></div></div>}

                      {config.fields.barcode.visible && (<div><label className="block text-xs font-bold text-gray-500 mb-1">Barcode/QR</label><div className="flex gap-2"><input type="text" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} className="w-full p-3 border rounded-lg outline-none font-mono text-sm" placeholder="Scan or enter code..." /></div></div>)}
                      {config.features.serialTracking && config.fields.serialNumber.visible && <div className="col-span-2"><label className="block text-xs font-bold text-purple-600 uppercase mb-1">Serial Number / IMEI</label><input type="text" value={formData.serialNumber} onChange={e => setFormData({...formData, serialNumber: e.target.value})} className="w-full p-3 border border-purple-200 bg-purple-50 text-purple-900 rounded-lg outline-none font-mono text-sm" /></div>}
                      <div className="col-span-2 relative"><label className="block text-xs font-bold text-gray-500 mb-1">Categories</label><div className="w-full p-3 border rounded-lg bg-white flex justify-between" onClick={() => setShowCatDropdown(!showCatDropdown)}><span className="text-sm">{formData.category || "Select Categories..."}</span><ChevronDown size={16} /></div>{showCatDropdown && <div className="absolute z-20 mt-1 bg-white border rounded-xl shadow-xl p-2 max-h-48 overflow-y-auto">{categories.map(cat => <div key={cat.id} onClick={() => toggleCategorySelection(cat.name)} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"><input type="checkbox" checked={formData.category?.includes(cat.name)} readOnly /><span className="text-sm font-medium text-gray-700">{cat.name}</span></div>)}</div>}{showCatDropdown && <div className="fixed inset-0 z-10" onClick={() => setShowCatDropdown(false)}></div>}</div>
                      {config.fields.brand.visible && <div><label className="block text-xs font-bold text-gray-500 mb-1">Brand</label><input type="text" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="w-full p-3 border rounded-lg" /></div>}
                      <div className="col-span-2"><label className="block text-xs font-bold text-gray-500 mb-1">Product Type</label><select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="w-full p-3 border rounded-lg bg-white outline-none"><option value="Stock">Stock Item</option><option value="Non-Stock">Non-Stock Item</option><option value="Service">Service</option></select></div>
                  </div>
                )}
                {activeTab === 'pricing' && (
                  <div className="grid grid-cols-2 gap-6">
                      <div><label className="block text-xs font-bold text-gray-500 mb-1">Selling Price *</label><input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} className="w-full p-3 border rounded-lg" /></div>
                      <div><label className="block text-xs font-bold text-gray-500 mb-1">Cost Price</label><input type="number" value={formData.costPrice} onChange={e => setFormData({...formData, costPrice: parseFloat(e.target.value)})} className="w-full p-3 border rounded-lg" /></div>
                      <div><label className="block text-xs font-bold text-gray-500 mb-1">Wholesale Price</label><input type="number" value={formData.wholesalePrice} onChange={e => setFormData({...formData, wholesalePrice: parseFloat(e.target.value)})} className="w-full p-3 border rounded-lg" /></div>
                      <div><label className="block text-xs font-bold text-gray-500 mb-1">Min. Selling Price</label><input type="number" value={formData.minSellingPrice} onChange={e => setFormData({...formData, minSellingPrice: parseFloat(e.target.value)})} className="w-full p-3 border rounded-lg" /></div>
                      <div className="col-span-2 p-4 border border-gray-200 rounded-xl bg-transparent"><h3 className="font-bold text-gray-700 text-sm mb-3">Tax & Discounts</h3><div className="flex items-center gap-6"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.isTaxIncluded} onChange={e => setFormData({...formData, isTaxIncluded: e.target.checked})} className="w-5 h-5 text-blue-600 rounded" /><span className="text-sm text-gray-700">Tax Included</span></label><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.allowDiscount} onChange={e => setFormData({...formData, allowDiscount: e.target.checked})} className="w-5 h-5 text-blue-600 rounded" /><span className="text-sm text-gray-700">Allow Discounts</span></label></div></div>
                  </div>
                )}
                {activeTab === 'inventory' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div><label className="block text-xs font-bold text-gray-500 mb-1">Total Stock</label><input type="number" value={formData.stock} readOnly={config.features.expiryTracking} onChange={e => setFormData({...formData, stock: parseFloat(e.target.value)})} className={`w-full p-3 border rounded-lg font-bold text-lg ${config.features.expiryTracking ? 'bg-gray-100 cursor-not-allowed' : 'text-blue-600'}`} /></div>
                        <div><label className="block text-xs font-bold text-gray-500 mb-1">Unit</label><input type="text" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full p-3 border rounded-lg" /></div>
                        <div><label className="block text-xs font-bold text-gray-500 mb-1">Reorder Level</label><input type="number" value={formData.reorderLevel} onChange={e => setFormData({...formData, reorderLevel: parseFloat(e.target.value)})} className="w-full p-3 border rounded-lg" /></div>
                        <div><label className="block text-xs font-bold text-gray-500 mb-1">Max Stock Level</label><input type="number" value={formData.maxStockLevel} onChange={e => setFormData({...formData, maxStockLevel: parseFloat(e.target.value)})} className="w-full p-3 border rounded-lg" /></div>
                    </div>
                    {config.features.expiryTracking && (<div className="border border-orange-200 rounded-xl p-4 bg-orange-50/50"><h3 className="text-sm font-bold text-orange-700 flex items-center gap-2 mb-3"><PackagePlus size={16}/> Batch Management (Expiry Tracking)</h3><div className="grid grid-cols-4 gap-2 mb-4 items-end"><div><label className="text-[10px] uppercase font-bold text-gray-500">Batch #</label><input type="text" value={newBatch.batchNumber} onChange={e => setNewBatch({...newBatch, batchNumber: e.target.value})} className="w-full p-2 border rounded text-sm bg-white" placeholder="Auto" /></div><div><label className="text-[10px] uppercase font-bold text-gray-500">Quantity</label><input type="number" value={newBatch.quantity} onChange={e => setNewBatch({...newBatch, quantity: parseFloat(e.target.value)})} className="w-full p-2 border rounded text-sm bg-white" /></div><div><label className="text-[10px] uppercase font-bold text-gray-500">Expiry</label><input type="datetime-local" value={newBatch.expiryDate} onChange={e => setNewBatch({...newBatch, expiryDate: e.target.value})} className="w-full p-2 border rounded text-sm bg-white" /></div>{editingBatchId ? (<div className="flex gap-1"><button type="button" onClick={handleSaveBatch} className="bg-green-600 text-white p-2 rounded text-xs font-bold flex-1">Update</button><button type="button" onClick={cancelEditBatch} className="bg-gray-400 text-white p-2 rounded text-xs font-bold hover:bg-gray-500"><X size={14}/></button></div>) : (<button type="button" onClick={handleSaveBatch} className="bg-orange-600 text-white p-2 rounded text-sm font-bold h-[38px]">Add Batch</button>)}</div><div className="bg-white border border-gray-200 rounded-lg overflow-hidden"><table className="w-full text-left text-sm"><thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr><th className="p-2">Batch</th><th className="p-2">Qty</th><th className="p-2">Expiry</th><th className="p-2 text-right">Actions</th></tr></thead><tbody className="divide-y divide-gray-100">{formData.batches?.map(b => (<tr key={b.id} className={editingBatchId === b.id ? 'bg-orange-50' : ''}><td className="p-2 font-mono text-gray-600">{b.batchNumber}</td><td className="p-2 font-bold">{b.quantity}</td><td className={`p-2 ${new Date(b.expiryDate!) < new Date() ? 'text-red-600 font-bold' : 'text-gray-600'}`}>{b.expiryDate ? new Date(b.expiryDate).toLocaleString() : '-'} {new Date(b.expiryDate!) < new Date() && '(Exp)'}</td><td className="p-2 text-right"><button type="button" onClick={() => startEditBatch(b)} className="text-blue-500 mr-2"><Edit size={14}/></button><button type="button" onClick={() => removeBatch(b.id)} className="text-red-500"><Trash2 size={14}/></button></td></tr>)) }{(!formData.batches || formData.batches.length === 0) && <tr><td colSpan={4} className="p-4 text-center text-gray-400 text-xs">No batches added. Stock is 0.</td></tr>}</tbody></table></div></div>)}
                  </div>
                )}
                {activeTab === 'settings' && (
                  <div className="space-y-4">
                    <div className="p-4 border border-gray-200 rounded-xl flex items-center justify-between"><div className="flex items-center gap-3">{formData.isActive ? <CheckCircle className="text-green-600"/> : <Ban className="text-red-600"/>}<div><h4 className="font-bold text-gray-700">{formData.isActive ? 'Product is Active' : 'Product is Inactive'}</h4><p className="text-xs text-gray-500">Inactive products hidden.</p></div></div><input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-5 h-5 text-blue-600" /></div>
                    <div className="p-4 border border-gray-200 rounded-xl flex items-center justify-between"><div><h4 className="font-bold text-gray-700">Allow Negative Stock</h4><p className="text-xs text-gray-500">Sell even if stock is 0.</p></div><input type="checkbox" checked={formData.allowNegativeStock} onChange={e => setFormData({...formData, allowNegativeStock: e.target.checked})} className="w-5 h-5 text-blue-600" /></div>
                  </div>
                )}
              </form>
            </div>
            <div className="px-8 py-5 bg-white border-t border-gray-200 flex justify-end gap-3"><button onClick={() => setShowModal(false)} className="px-6 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl">Cancel</button><button onClick={handleSave} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg"><Save size={20}/> Save Product</button></div>
          </div>
        </div>
      )}

      {/* --- DAMAGE REPORT MODAL --- */}
      {showDamageModal && selectedProduct && config.features.damageTracking && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
             <div className="bg-white border border-gray-200 rounded-xl p-6 w-96 shadow-2xl">
                 <h2 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2"><AlertTriangle /> Report Damage</h2>
                 <p className="text-gray-600 text-sm mb-4">Isolating damaged stock for <strong>{selectedProduct.name}</strong>.</p>
                 <div className="space-y-4">
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Quantity</label><input type="number" value={damageQty} onChange={e => setDamageQty(parseInt(e.target.value))} className="w-full border border-gray-300 p-2 rounded mt-1 outline-none focus:ring-2 focus:ring-red-500" /></div>
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Reason / Note</label><textarea value={damageNote} onChange={e => setDamageNote(e.target.value)} className="w-full border border-gray-300 p-2 rounded mt-1 outline-none focus:ring-2 focus:ring-red-500" placeholder="e.g. Broken during shipping" /></div>
                    <div className="flex gap-2 pt-2">
                        <button onClick={handleConfirmDamage} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg transition-colors">Confirm</button>
                        <button onClick={() => setShowDamageModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-2 rounded-lg transition-colors">Cancel</button>
                    </div>
                 </div>
             </div>
         </div>
      )}

      {/* --- ✅ NEW: STAT DETAIL MODAL (Dynamic Content based on activeStatModal) --- */}
      {activeStatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800 capitalize flex items-center gap-2">
                {activeStatModal === 'products' && <><Archive className="text-blue-600"/> Total Products</>}
                {activeStatModal === 'categories' && <><LayoutGrid className="text-purple-600"/> Categories List</>}
                {activeStatModal === 'stock' && <><Activity className="text-green-600"/> Current Stock Levels</>}
                {activeStatModal === 'expired' && <><Calendar className="text-orange-600"/> Expired Items Report</>}
                {activeStatModal === 'damaged' && <><AlertOctagon className="text-red-600"/> Damaged Items Report</>}
              </h2>
              <button onClick={() => setActiveStatModal(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><X size={20}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-0">
               <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase sticky top-0 shadow-sm">
                    <tr>
                      {activeStatModal === 'products' && <><th className="p-4">Name</th><th className="p-4">Category</th><th className="p-4 text-right">Price</th><th className="p-4 text-center">Status</th></>}
                      {activeStatModal === 'categories' && <><th className="p-4">Category Name</th><th className="p-4 text-right">Items Count</th></>}
                      {activeStatModal === 'stock' && <><th className="p-4">Product Name</th><th className="p-4 text-right">Available Qty</th></>}
                      {activeStatModal === 'expired' && <><th className="p-4">Product Name</th><th className="p-4">Batch Number</th><th className="p-4 text-center">Expiry Date</th><th className="p-4 text-right">Expired Qty</th></>}
                      {activeStatModal === 'damaged' && <><th className="p-4">Product Name</th><th className="p-4">Date/Time</th><th className="p-4">Reason / Note</th><th className="p-4 text-right">Damaged Qty</th></>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {activeStatModal === 'products' && products.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="p-4 font-medium">{p.name}</td>
                        <td className="p-4 text-gray-500">{p.category || '-'}</td>
                        <td className="p-4 text-right font-mono">{currency}{p.price}</td>
                        <td className="p-4 text-center">{p.isActive ? <span className="text-green-600 text-xs font-bold px-2 py-1 bg-green-50 rounded">Active</span> : <span className="text-gray-400 text-xs">Inactive</span>}</td>
                      </tr>
                    ))}

                    {activeStatModal === 'categories' && categories.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="p-4 font-bold text-gray-700">{c.name}</td>
                        <td className="p-4 text-right text-gray-500">{products.filter(p => p.category?.includes(c.name)).length} items</td>
                      </tr>
                    ))}

                    {activeStatModal === 'stock' && products.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="p-4 font-medium">{p.name}</td>
                        <td className={`p-4 text-right font-bold ${p.stock <= (p.reorderLevel || 0) ? 'text-red-600' : 'text-green-600'}`}>{p.stock} {p.unit}</td>
                      </tr>
                    ))}

                    {activeStatModal === 'expired' && expiredBatchesList.length > 0 ? expiredBatchesList.map((item, idx) => (
                      <tr key={idx} className="hover:bg-orange-50">
                        <td className="p-4 font-medium">{item.productName}</td>
                        <td className="p-4 font-mono text-gray-500">{item.batchNumber}</td>
                        <td className="p-4 text-center text-red-600 font-bold">{new Date(item.expiryDate!).toLocaleDateString()}</td>
                        <td className="p-4 text-right font-bold">{item.quantity}</td>
                      </tr>
                    )) : activeStatModal === 'expired' && <tr><td colSpan={4} className="p-8 text-center text-gray-400">No expired items found.</td></tr>}

                    {activeStatModal === 'damaged' && products.filter(p => p.damagedQty && p.damagedQty > 0).length > 0 ? products.filter(p => p.damagedQty && p.damagedQty > 0).map(p => (
                       <tr key={p.id} className="hover:bg-red-50">
                          <td className="p-4 font-medium">{p.name}</td>
                          {/* Note: Standard inventory usually needs a separate log table for date/reason. Showing placeholder for now based on current data structure */}
                          <td className="p-4 text-gray-500 text-xs">{new Date().toLocaleDateString()} <span className="italic">(Latest)</span></td>
                          <td className="p-4 text-gray-600 italic">{damageNote || "Reported via Inventory"}</td>
                          <td className="p-4 text-right font-bold text-red-600">{p.damagedQty}</td>
                       </tr>
                    )) : activeStatModal === 'damaged' && <tr><td colSpan={4} className="p-8 text-center text-gray-400">No damaged items reported.</td></tr>}

                  </tbody>
               </table>
            </div>
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 text-right">
              <button onClick={() => setActiveStatModal(null)} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default InventoryScreen;