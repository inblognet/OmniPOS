"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { useSettingsStore } from "@/store/useSettingsStore"; // 🔥 Imported the global store
import { Boxes, Plus, Trash2, Save, Edit2, UploadCloud, X, Eye, EyeOff, AlignLeft, Layers } from "lucide-react";

interface Product {
  id: number;
  name: string;
  sku: string;
  price: string | number;
  web_allocated_stock: number;
  category: string;
  description: string;
  is_active: boolean;
  images?: { url: string; is_primary: boolean }[];
}

interface EditFormState {
  id: number;
  name: string;
  price: string | number;
  stock: number;
  description: string;
  is_active: boolean;
  file: File | null;
}

export default function AdminInventory() {
  // 🔥 Fetch the dynamic currency symbol
  const currencySymbol = useSettingsStore((state) => state.currencySymbol);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View Mode State (Default is 'grouped' to hide duplicates)
  const [viewMode, setViewMode] = useState<"grouped" | "all">("grouped");

  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [newProduct, setNewProduct] = useState({ name: "", sku: "", price: "", stock: "", category: "", description: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const fetchProducts = async () => {
    try {
      const res = await api.get("/web/admin/products");
      if (res.data.success) setProducts(res.data.products || []);
    } catch (err) {
      console.error("Failed to fetch inventory", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("name", newProduct.name);
    formData.append("sku", newProduct.sku);
    formData.append("price", newProduct.price.toString());
    formData.append("web_allocated_stock", newProduct.stock.toString());
    formData.append("category", newProduct.category);
    formData.append("description", newProduct.description);
    if (imageFile) formData.append("image", imageFile);

    try {
      const res = await api.post("/web/admin/products", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (res.data.success) {
        setNewProduct({ name: "", sku: "", price: "", stock: "", category: "", description: "" });
        setImageFile(null);
        fetchProducts();
      }
    } catch (err) {
      alert("Failed to add product.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProduct = async () => {
    if (!editForm) return;
    setIsUpdating(true);

    const formData = new FormData();
    formData.append("name", editForm.name);
    formData.append("price", editForm.price.toString());
    formData.append("web_allocated_stock", editForm.stock.toString());
    formData.append("description", editForm.description);
    formData.append("is_active", String(editForm.is_active));

    if (editForm.file) formData.append("image", editForm.file);

    try {
      const res = await api.put(`/web/admin/products/${editForm.id}`, formData);
      if (res.data.success) {
        setEditForm(null);
        fetchProducts();
      }
    } catch (err) {
      alert("Failed to update product.");
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleVisibility = async (product: Product) => {
    const formData = new FormData();
    formData.append("name", product.name);
    formData.append("price", product.price.toString());
    formData.append("web_allocated_stock", product.web_allocated_stock.toString());
    formData.append("description", product.description || "");
    formData.append("is_active", String(!product.is_active));

    try {
      await api.put(`/web/admin/products/${product.id}`, formData);
      fetchProducts();
    } catch (err) {
      alert("Failed to toggle visibility.");
    }
  };

  const deleteProduct = async (id: number) => {
    if (!confirm("Delete this product permanently?")) return;
    try {
      const res = await api.delete(`/web/admin/products/${id}`);
      if (res.data.success) setProducts(products.filter(p => p.id !== id));
    } catch (err) {
      alert("Cannot delete product.");
    }
  };

  const getImageUrl = (product: Product) => {
    return product.images?.find((img) => img.is_primary)?.url || product.images?.[0]?.url || "https://placehold.co/100x100?text=No+Img";
  };

  // Filter logic for deduplicating products by name
  const displayedProducts = viewMode === "grouped"
    ? products.filter((product, index, self) =>
        index === self.findIndex((p) => p.name === product.name)
      )
    : products;

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-7xl mx-auto px-4">

        <div className="mb-8">
          <h1 className="text-4xl font-black text-gray-900 flex items-center gap-3">
            <Boxes className="text-blue-600" size={40} />
            Inventory Manager
          </h1>
          <p className="text-gray-500 mt-2 text-lg">Add new products, write descriptions, and toggle store visibility.</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* Add Product Form */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 sticky top-10">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Plus size={20} className="text-blue-600"/> Add Product
              </h2>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Product Name</label>
                  <input required type="text" className="w-full bg-gray-50 px-4 py-3 rounded-xl focus:ring-2 outline-none" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">SKU</label>
                    <input required type="text" className="w-full bg-gray-50 px-4 py-3 rounded-xl focus:ring-2 outline-none" value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                    <input required type="text" placeholder="e.g. Shirts" className="w-full bg-gray-50 px-4 py-3 rounded-xl focus:ring-2 outline-none" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    {/* 🔥 Swapped hardcoded $ for currencySymbol */}
                    <label className="block text-sm font-bold text-gray-700 mb-1">Price ({currencySymbol})</label>
                    <input required type="number" step="0.01" className="w-full bg-gray-50 px-4 py-3 rounded-xl focus:ring-2 outline-none" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Stock Qty</label>
                    <input required type="number" className="w-full bg-gray-50 px-4 py-3 rounded-xl focus:ring-2 outline-none" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-1"><AlignLeft size={14}/> Description</label>
                  <textarea
                    required rows={3}
                    className="w-full bg-gray-50 px-4 py-3 rounded-xl focus:ring-2 outline-none resize-none"
                    value={newProduct.description}
                    onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Product Image</label>
                  <label className={`flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-all ${imageFile ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-gray-50 border-gray-300 text-gray-500 hover:bg-gray-100"}`}>
                    <UploadCloud size={20} />
                    <span className="font-bold text-sm truncate">{imageFile ? imageFile.name : "Choose local image..."}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setImageFile(e.target.files[0]); }} />
                  </label>
                </div>

                <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg cursor-pointer mt-4">
                  {isSubmitting ? "Uploading..." : "Create Product"}
                </button>
              </form>
            </div>
          </div>

          {/* Product Catalog Table */}
          <div className="xl:col-span-2">

            {/* View Mode Toggle */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4 gap-4">
              <div className="bg-gray-200/60 p-1 rounded-xl inline-flex border border-gray-200">
                <button
                  onClick={() => setViewMode("grouped")}
                  className={`px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                    viewMode === "grouped" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-900 hover:bg-gray-200"
                  }`}
                >
                  <Boxes size={16} /> Unique Products
                </button>
                <button
                  onClick={() => setViewMode("all")}
                  className={`px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                    viewMode === "all" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-900 hover:bg-gray-200"
                  }`}
                >
                  <Layers size={16} /> All Items (Bulk)
                </button>
              </div>
              <div className="text-sm font-bold text-gray-400">
                Showing {displayedProducts.length} items
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500 uppercase tracking-wider">
                      <th className="p-4 font-bold">Product Details</th>
                      <th className="p-4 font-bold">Category & SKU</th>
                      <th className="p-4 font-bold">Price & Stock</th>
                      <th className="p-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr><td colSpan={4} className="p-10 text-center text-gray-400 font-bold animate-pulse">Loading Inventory...</td></tr>
                    ) : displayedProducts.length === 0 ? (
                      <tr><td colSpan={4} className="p-10 text-center text-gray-400 font-bold">No products found.</td></tr>
                    ) : displayedProducts.map(product => {
                      const imgUrl = getImageUrl(product);
                      const isEditing = editForm?.id === product.id;

                      return (
                        <tr key={product.id} className={`hover:bg-gray-50 transition-colors ${!product.is_active && !isEditing ? 'opacity-60 grayscale-[0.5]' : ''}`}>

                          <td className="p-4 flex items-start gap-4">
                            {/* Image */}
                            {isEditing ? (
                              <div className="relative group w-14 h-14 flex-shrink-0 cursor-pointer">
                                <label className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                  <UploadCloud size={20} className="text-white" />
                                  <input type="file" accept="image/*" className="hidden" onChange={e => setEditForm({ ...editForm!, file: e.target.files?.[0] || null })} />
                                </label>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={editForm.file ? URL.createObjectURL(editForm.file) : imgUrl} alt="" className="w-14 h-14 rounded-lg object-cover bg-gray-100" />
                              </div>
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={imgUrl} alt="" className="w-14 h-14 rounded-lg flex-shrink-0 object-cover bg-gray-100" />
                            )}

                            {/* Name & Description */}
                            <div className="flex-1 w-full max-w-[200px]">
                              {isEditing ? (
                                <div className="space-y-2">
                                  <input type="text" className="border-2 rounded-lg px-2 py-1 outline-none focus:border-blue-500 w-full font-bold" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                                  <textarea rows={2} className="border-2 rounded-lg px-2 py-1 outline-none focus:border-blue-500 w-full text-xs resize-none" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} placeholder="Description..." />
                                </div>
                              ) : (
                                <div>
                                  <span className="font-bold text-gray-900 flex items-center gap-2">
                                    <span className="line-clamp-1">{product.name}</span>
                                    {!product.is_active && <span className="px-2 py-0.5 rounded text-[10px] font-black bg-gray-200 text-gray-500 uppercase tracking-wider">Hidden</span>}
                                  </span>
                                  <span className="text-xs text-gray-500 line-clamp-2 mt-1">{product.description || "No description"}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="p-4 align-top">
                            <div className="text-sm font-bold text-gray-700">{product.category || 'Uncategorized'}</div>
                            <div className="text-xs text-gray-400 uppercase">{product.sku}</div>
                          </td>

                          <td className="p-4 align-top">
                            {isEditing ? (
                              <div className="space-y-2">
                                {/* 🔥 Swapped hardcoded $ for currencySymbol in edit mode */}
                                <div className="flex items-center gap-1"><span className="text-gray-400 text-xs font-bold">{currencySymbol}</span><input type="number" step="0.01" className="w-16 border-2 rounded-lg px-1 py-1 outline-none focus:border-blue-500 text-sm font-bold" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} /></div>
                                <div className="flex items-center gap-1"><span className="text-gray-400 text-xs font-bold">Qty</span><input type="number" className="w-16 border-2 rounded-lg px-1 py-1 outline-none focus:border-blue-500 text-sm" value={editForm.stock} onChange={e => setEditForm({...editForm, stock: parseInt(e.target.value) || 0})} /></div>
                              </div>
                            ) : (
                              <div>
                                {/* 🔥 Swapped hardcoded $ for currencySymbol in display mode */}
                                <div className="font-black text-gray-900">{currencySymbol}{parseFloat(product.price.toString()).toFixed(2)}</div>
                                <div className={`text-xs font-bold mt-1 ${product.web_allocated_stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {product.web_allocated_stock} in stock
                                </div>
                              </div>
                            )}
                          </td>

                          <td className="p-4 text-right whitespace-nowrap align-top">
                            {isEditing ? (
                              <>
                                <button disabled={isUpdating} onClick={handleUpdateProduct} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors inline-block cursor-pointer disabled:opacity-50"><Save size={18} /></button>
                                <button disabled={isUpdating} onClick={() => setEditForm(null)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors inline-block ml-1 cursor-pointer"><X size={18} /></button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => toggleVisibility(product)}
                                  className={`p-2 rounded-lg transition-colors inline-block cursor-pointer mr-1 ${product.is_active ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-400 hover:bg-gray-200'}`}
                                  title={product.is_active ? "Hide on Storefront" : "Show on Storefront"}
                                >
                                  {product.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
                                </button>

                                <button
                                  onClick={() => setEditForm({ id: product.id, name: product.name, price: product.price, stock: product.web_allocated_stock, description: product.description || "", is_active: product.is_active, file: null })}
                                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-block cursor-pointer"
                                ><Edit2 size={18} /></button>

                                <button onClick={() => deleteProduct(product.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-block ml-1 cursor-pointer"><Trash2 size={18} /></button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}