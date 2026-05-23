'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ShoppingCart, Heart, Filter, X } from 'lucide-react';
import api from '@/lib/api';
import { useCartStore } from '@/store/useCartStore';
import { useWishlistStore } from '@/store/useWishlistStore';
import { useUserStore } from '@/store/useUserStore';
import MobileLayout from '@/components/layout/MobileLayout';
import toast from 'react-hot-toast';

interface Product {
  id: number;
  name: string;
  price: number;
  web_allocated_stock: number;
  category: string;
  description: string;
  images: { url: string; is_primary: boolean }[];
}

export default function ProductsPage() {
  const router = useRouter();
  const { user } = useUserStore();
  const { addItem } = useCartStore();
  const { items: wishlist, toggleWishlist } = useWishlistStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/mobile/products');
      if (res.data.success) {
        setProducts(res.data.products);
        setFilteredProducts(res.data.products);
        
        // Extract unique categories
        const uniqueCategories = [...new Set(res.data.products.map((p: Product) => p.category).filter(Boolean))];
        setCategories(uniqueCategories);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = [...products];
    
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    
    setFilteredProducts(filtered);
  }, [searchQuery, selectedCategory, products]);

  const handleAddToCart = async (product: Product) => {
    if (product.web_allocated_stock <= 0) {
      toast.error('Out of stock!');
      return;
    }
    
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.images?.[0]?.url || '',
      quantity: 1
    });
    toast.success('Added to cart!');
  };

  const handleWishlist = async (productId: number) => {
    if (!user) {
      toast.error('Please login to save to wishlist');
      router.push('/login');
      return;
    }
    await toggleWishlist(user.id, productId);
    toast.success('Wishlist updated');
  };

  const getImageUrl = (product: Product) => {
    return product.images?.find(img => img.is_primary)?.url || 
           product.images?.[0]?.url || 
           'https://placehold.co/400x400?text=No+Image';
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="pb-20">
        {/* Header */}
        <div className="bg-white sticky top-0 z-10 px-4 py-3 border-b border-gray-100">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 bg-gray-50 rounded-xl border border-gray-200"
            >
              <Filter size={20} />
            </button>
          </div>
          
          {/* Filters */}
          {showFilters && categories.length > 0 && (
            <div className="mt-3">
              <div className="flex gap-2 overflow-x-auto pb-2">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
                    selectedCategory === '' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  All
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
                      selectedCategory === cat 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Products Grid */}
        <div className="px-4 py-4">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filteredProducts.map((product) => {
                const isInWishlist = wishlist.some(w => w.id === product.id);
                const imageUrl = getImageUrl(product);
                const isOutOfStock = product.web_allocated_stock <= 0;
                
                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100"
                  >
                    <div 
                      className="relative aspect-square bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/product/${product.id}`)}
                    >
                      <img 
                        src={imageUrl} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=No+Image';
                        }}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWishlist(product.id);
                        }}
                        className="absolute top-2 right-2 p-2 bg-white/90 rounded-full shadow-sm"
                      >
                        <Heart 
                          size={18} 
                          className={isInWishlist ? 'fill-red-500 text-red-500' : 'text-gray-400'}
                        />
                      </button>
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">Out of Stock</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-3">
                      <p className="text-xs text-gray-500 mb-1">{product.category || 'General'}</p>
                      <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-2">
                        {product.name}
                      </h3>
                      <div className="flex justify-between items-center">
                        <p className="text-lg font-bold text-blue-600">
                          ${product.price.toFixed(2)}
                        </p>
                        <button
                          onClick={() => handleAddToCart(product)}
                          disabled={isOutOfStock}
                          className="p-2 bg-blue-600 text-white rounded-xl disabled:opacity-50 disabled:bg-gray-400"
                        >
                          <ShoppingCart size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
