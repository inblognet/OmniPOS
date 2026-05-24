"use client";

import React, { useEffect, useState } from 'react';
import { Search, Plus, Edit2, Trash2, Eye, EyeOff, Package, RefreshCw } from 'lucide-react';
import StaffMobileLayout from '@/components/staff/StaffLayout';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  stock: number;
  web_allocated_stock: number;
  category: string;
  is_active: boolean;
  images: { url: string }[];
}

export default function StaffProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    price: '',
    stock: '',
    category: '',
    description: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchTerm, products]);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/mobile/staff/products');
      if (res.data.success) {
        setProducts(res.data.products);
        setFilteredProducts(res.data.products);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredProducts(filtered);
  };

  const handleSaveProduct = async () => {
    if (!formData.name || !formData.price) {
      toast.error('Name and price are required');
      return;
    }
    
    const form = new FormData();
    form.append('name', formData.name);
    form.append('sku', formData.sku);
    form.append('price', formData.price);
    form.append('stock', formData.stock);
    form.append('category', formData.category);
    form.append('description', formData.description);
    if (imageFile) form.append('image', imageFile);
    
    try {
      let res;
      if (editingProduct) {
        res = await api.put(`/mobile/staff/products/${editingProduct.id}`, form);
      } else {
        res = await api.post('/mobile/staff/products', form);
      }
      
      if (res.data.success) {
        toast.success(editingProduct ? 'Product updated' : 'Product created');
        setShowModal(false);
        resetForm();
        fetchProducts();
      }
    } catch (error) {
      toast.error('Failed to save product');
    }
  };

  const toggleProductStatus = async (product: Product) => {
    try {
      const res = await api.put(`/mobile/staff/products/${product.id}/toggle`, {
        is_active: !product.is_active
      });
      if (res.data.success) {
        toast.success(`Product ${!product.is_active ? 'activated' : 'deactivated'}`);
        fetchProducts();
      }
    } catch (error) {
      toast.error('Failed to update product status');
    }
  };

  const deleteProduct = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await api.delete(`/mobile/staff/products/${id}`);
      if (res.data.success) {
        toast.success('Product deleted');
        fetchProducts();
      }
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', sku: '', price: '', stock: '', category: '', description: '' });
    setImageFile(null);
    setEditingProduct(null);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku || '',
      price: product.price.toString(),
      stock: product.stock.toString(),
      category: product.category || '',
      description: ''
    });
    setShowModal(true);
  };

  if (loading) {
    return (
      <StaffMobileLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </StaffMobileLayout>
    );
  }

  return (
    <StaffMobileLayout>
      <div>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Products</h1>
            <p className="text-sm text-gray-500">Manage your inventory</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="bg-blue-600 text-white p-2 rounded-xl"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Products List */}
        <div className="space-y-3">
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-400">
              <Package size={48} className="mx-auto mb-3 opacity-50" />
              <p>No products found</p>
            </div>
          ) : (
            filteredProducts.map((product) => (
              <div key={product.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden">
                    {product.images?.[0] ? (
                      <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package size={24} className="text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-gray-900">{product.name}</h3>
                        <p className="text-xs text-gray-500">SKU: {product.sku || 'N/A'}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => toggleProductStatus(product)}
                          className="p-1.5 rounded-lg hover:bg-gray-100"
                        >
                          {product.is_active ? <Eye size={16} className="text-green-600" /> : <EyeOff size={16} className="text-gray-400" />}
                        </button>
                        <button
                          onClick={() => openEditModal(product)}
                          className="p-1.5 rounded-lg hover:bg-gray-100"
                        >
                          <Edit2 size={16} className="text-blue-600" />
                        </button>
                        <button
                          onClick={() => deleteProduct(product.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100"
                        >
                          <Trash2 size={16} className="text-red-600" />
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <div>
                        <p className="text-lg font-bold text-blue-600">${product.price.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">Stock: {product.web_allocated_stock || product.stock || 0}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${product.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Product Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
            <div className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white p-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-lg font-bold">{editingProduct ? 'Edit Product' : 'New Product'}</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400">✕</button>
              </div>
              
              <div className="p-4 space-y-4">
                <input
                  type="text"
                  placeholder="Product Name *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="SKU"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 rounded-xl border border-gray-200"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    placeholder="Price *"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="px-4 py-2 bg-gray-50 rounded-xl border border-gray-200"
                  />
                  <input
                    type="number"
                    placeholder="Stock"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="px-4 py-2 bg-gray-50 rounded-xl border border-gray-200"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 rounded-xl border border-gray-200"
                />
                <textarea
                  placeholder="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-50 rounded-xl border border-gray-200 resize-none"
                />
                <label className="block">
                  <span className="text-sm text-gray-600">Product Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className="mt-1 w-full text-sm"
                  />
                </label>
                
                <button
                  onClick={handleSaveProduct}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold"
                >
                  {editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </StaffMobileLayout>
  );
}
