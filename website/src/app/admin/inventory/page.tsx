"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Boxes, Plus, Trash2, Save, Edit2 } from "lucide-react";

interface Product {
  id: number;
  name: string;
  sku: string;
  price: string | number;
  web_allocated_stock: number;
  category: string;
  images?: { url: string; is_primary: boolean }[];
}

export default function AdminInventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // New Product Form State
  const [newProduct, setNewProduct] = useState({ name: "", sku: "", price: "", stock: "", category: "", image_url: "" });

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
    try {
      const res = await api.post("/web/admin/products", {
        name: newProduct.name,
        sku: newProduct.sku,
        price: parseFloat(newProduct.price),
        web_allocated_stock: parseInt(newProduct.stock),
        category: newProduct.category,
        image_url: newProduct.image_url
      });
      if (res.data.success) {
        alert("Product Added!");
        setNewProduct({ name: "", sku: "", price: "", stock: "", category: "", image_url: "" });
        fetchProducts(); // Refresh list
      }
    } catch (err) {
      alert("Failed to add product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateProduct = async (id: number, stock: number, price: string | number) => {
    try {
      const res = await api.put(`/web/admin/products/${id}`, { web_allocated_stock: stock, price: parseFloat(price.toString()) });
      if (res.data.success) {
        setEditingId(null);
        fetchProducts(); // Refresh to see changes
      }
    } catch (err) {
      alert("Failed to update product");
    }
  };

  const deleteProduct = async (id: number) => {
    if (!confirm("Delete this product permanently? (This will fail if customers have already ordered it!)")) return;
    try {
      const res = await api.delete(`/web/admin/products/${id}`);
      if (res.data.success) {
        setProducts(products.filter(p => p.id !== id));
      }
    } catch (err) {
      alert("Cannot delete product. It is likely tied to existing order history.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-7xl mx-auto px-4">

        <div className="mb-8">
          <h1 className="text-4xl font-black text-gray-900 flex items-center gap-3">
            <Boxes className="text-blue-600" size={40} />
            Inventory Manager
          </h1>
          <p className="text-gray-500 mt-2 text-lg">Add new products and manage stock levels.</p>
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
                    <label className="block text-sm font-bold text-gray-700 mb-1">Price ($)</label>
                    <input required type="number" step="0.01" className="w-full bg-gray-50 px-4 py-3 rounded-xl focus:ring-2 outline-none" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Stock Qty</label>
                    <input required type="number" className="w-full bg-gray-50 px-4 py-3 rounded-xl focus:ring-2 outline-none" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Image URL</label>
                  <input type="text" placeholder="https://..." className="w-full bg-gray-50 px-4 py-3 rounded-xl focus:ring-2 outline-none" value={newProduct.image_url} onChange={e => setNewProduct({...newProduct, image_url: e.target.value})} />
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg cursor-pointer">
                  {isSubmitting ? "Saving..." : "Create Product"}
                </button>
              </form>
            </div>
          </div>

          {/* Product Catalog Table */}
          <div className="xl:col-span-2">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500 uppercase tracking-wider">
                      <th className="p-4 font-bold">Product</th>
                      <th className="p-4 font-bold">Category & SKU</th>
                      <th className="p-4 font-bold">Price</th>
                      <th className="p-4 font-bold">Stock</th>
                      <th className="p-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr><td colSpan={5} className="p-10 text-center text-gray-400 font-bold animate-pulse">Loading Inventory...</td></tr>
                    ) : products.length === 0 ? (
                      <tr><td colSpan={5} className="p-10 text-center text-gray-400 font-bold">No products found.</td></tr>
                    ) : products.map(product => {
                      const imgUrl = product.images?.[0]?.url || "https://placehold.co/100x100?text=No+Img";
                      const isEditing = editingId === product.id;

                      return (
                        <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-4 flex items-center gap-4">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={imgUrl} alt="" className="w-12 h-12 rounded-lg object-cover bg-gray-100" />
                            <span className="font-bold text-gray-900">{product.name}</span>
                          </td>
                          <td className="p-4">
                            <div className="text-sm font-bold text-gray-700">{product.category || 'Uncategorized'}</div>
                            <div className="text-xs text-gray-400 uppercase">{product.sku}</div>
                          </td>
                          <td className="p-4 font-bold text-gray-900">
                            {isEditing ? (
                              <input type="number" step="0.01" defaultValue={product.price} id={`price-${product.id}`} className="w-20 border-2 rounded-lg px-2 py-1 outline-none focus:border-blue-500" />
                            ) : `$${parseFloat(product.price.toString()).toFixed(2)}`}
                          </td>
                          <td className="p-4">
                            {isEditing ? (
                              <input type="number" defaultValue={product.web_allocated_stock} id={`stock-${product.id}`} className="w-20 border-2 rounded-lg px-2 py-1 outline-none focus:border-blue-500" />
                            ) : (
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${product.web_allocated_stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {product.web_allocated_stock} in stock
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            {isEditing ? (
                              <button
                                onClick={() => {
                                  const newStock = parseInt((document.getElementById(`stock-${product.id}`) as HTMLInputElement).value);
                                  const newPrice = parseFloat((document.getElementById(`price-${product.id}`) as HTMLInputElement).value);
                                  updateProduct(product.id, newStock, newPrice);
                                }}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors inline-block cursor-pointer"
                              >
                                <Save size={18} />
                              </button>
                            ) : (
                              <button onClick={() => setEditingId(product.id)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-block cursor-pointer">
                                <Edit2 size={18} />
                              </button>
                            )}
                            <button onClick={() => deleteProduct(product.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-block ml-2 cursor-pointer">
                              <Trash2 size={18} />
                            </button>
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