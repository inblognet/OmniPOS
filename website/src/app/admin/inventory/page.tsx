"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { useSettingsStore } from "@/store/useSettingsStore";
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
  sku: string;
  category: string;
  price: string | number;
  stock: number;
  description: string;
  is_active: boolean;
  file: File | null;
}

export default function AdminInventory() {
  const currencySymbol = useSettingsStore((state) => state.currencySymbol);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      await api.post("/web/admin/products", formData);
      setNewProduct({ name: "", sku: "", price: "", stock: "", category: "", description: "" });
      setImageFile(null);
      fetchProducts();
    } catch (err) { alert("Failed to add product."); } finally { setIsSubmitting(false); }
  };

  const handleUpdateProduct = async () => {
    if (!editForm) return;
    setIsUpdating(true);

    const formData = new FormData();
    formData.append("name", editForm.name);
    formData.append("sku", editForm.sku);
    formData.append("category", editForm.category);
    formData.append("price", editForm.price.toString());
    formData.append("web_allocated_stock", editForm.stock.toString());
    formData.append("description", editForm.description);
    formData.append("is_active", String(editForm.is_active));
    if (editForm.file) formData.append("image", editForm.file);

    try {
      await api.put(`/web/admin/products/${editForm.id}`, formData);
      setEditForm(null);
      fetchProducts();
    } catch (err) { alert("Failed to update product."); } finally { setIsUpdating(false); }
  };

  const toggleVisibility = async (product: Product) => {
    const formData = new FormData();
    formData.append("name", product.name);
    formData.append("sku", product.sku);
    formData.append("category", product.category);
    formData.append("price", product.price.toString());
    formData.append("web_allocated_stock", product.web_allocated_stock.toString());
    formData.append("description", product.description || "");
    formData.append("is_active", String(!product.is_active));

    try {
      await api.put(`/web/admin/products/${product.id}`, formData);
      fetchProducts();
    } catch (err) { alert("Failed to toggle visibility."); }
  };

  const deleteProduct = async (id: number) => {
    if (!confirm("Delete permanently?")) return;
    try {
      await api.delete(`/web/admin/products/${id}`);
      fetchProducts();
    } catch (err) { alert("Cannot delete."); }
  };

  const getImageUrl = (product: Product) => product.images?.find((img) => img.is_primary)?.url || product.images?.[0]?.url || "https://placehold.co/100x100?text=No+Img";

  const displayedProducts = viewMode === "grouped" ? products.filter((p, i, self) => i === self.findIndex((s) => s.name === p.name)) : products;

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-4xl font-black mb-8">Inventory Manager</h1>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-1">
            <form onSubmit={handleAddProduct} className="bg-white rounded-3xl p-6 space-y-4">
                <input required placeholder="Name" className="w-full bg-gray-50 p-3 rounded-xl" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                    <input required placeholder="SKU" className="w-full bg-gray-50 p-3 rounded-xl" value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} />
                    <input required placeholder="Category" className="w-full bg-gray-50 p-3 rounded-xl" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <input required type="number" step="0.01" placeholder="Price" className="w-full bg-gray-50 p-3 rounded-xl" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                    <input required type="number" placeholder="Stock" className="w-full bg-gray-50 p-3 rounded-xl" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} />
                </div>
                <textarea required rows={3} placeholder="Description" className="w-full bg-gray-50 p-3 rounded-xl" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
                <label className="flex items-center justify-center border-2 border-dashed p-3 rounded-xl cursor-pointer">
                    <span className="text-sm font-bold truncate">{imageFile ? imageFile.name : "Choose Image"}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setImageFile(e.target.files[0]); }} />
                </label>
                <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white font-bold p-4 rounded-xl">{isSubmitting ? "Uploading..." : "Create Product"}</button>
            </form>
          </div>

          <div className="xl:col-span-2">
            <div className="bg-white rounded-3xl overflow-hidden">
              <table className="w-full text-left">
                <thead><tr className="bg-gray-50 text-sm uppercase"><th className="p-4">Details</th><th className="p-4">Category/SKU</th><th className="p-4">Price/Stock</th><th className="p-4 text-right">Actions</th></tr></thead>
                <tbody>
                  {displayedProducts.map(product => {
                    const isEditing = editForm?.id === product.id;
                    return (
                      <tr key={product.id}>
                        <td className="p-4 flex items-center gap-4">
                            {isEditing ? <input type="file" onChange={e => setEditForm({...editForm!, file: e.target.files?.[0] || null})} /> : <img src={getImageUrl(product)} className="w-12 h-12 rounded-lg object-cover" />}
                            {isEditing ? <input className="border" value={editForm.name} onChange={e => setEditForm({...editForm!, name: e.target.value})} /> : <span className="font-bold">{product.name}</span>}
                        </td>
                        <td className="p-4">{isEditing ? <><input className="border w-full" value={editForm.category} onChange={e => setEditForm({...editForm!, category: e.target.value})} /><input className="border w-full" value={editForm.sku} onChange={e => setEditForm({...editForm!, sku: e.target.value})} /></> : <>{product.category} / {product.sku}</>}</td>
                        <td className="p-4">{isEditing ? <><input className="border w-16" value={editForm.price} onChange={e => setEditForm({...editForm!, price: e.target.value})} /><input className="border w-16" value={editForm.stock} onChange={e => setEditForm({...editForm!, stock: parseInt(e.target.value)})} /></> : <>{currencySymbol}{product.price} / {product.web_allocated_stock}</>}</td>
                        <td className="p-4 text-right">{isEditing ? <div className="flex justify-end gap-2"><button onClick={handleUpdateProduct}><Save size={18}/></button><button onClick={() => setEditForm(null)}><X size={18}/></button></div> : <button onClick={() => setEditForm({id: product.id, name: product.name, sku: product.sku, category: product.category, price: product.price, stock: product.web_allocated_stock, description: product.description || "", is_active: product.is_active, file: null})}><Edit2 size={18}/></button>}</td>
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
  );
}