"use client";
import { useEffect, useState } from "react";
import Link from "next/link"; // 🔥 FIX: Imported Link
import api from "@/lib/api";
import { useCartStore } from "@/store/useCartStore";
import { ShoppingCart, Search, LayoutGrid } from "lucide-react";
import HeroCarousel from "@/components/HeroCarousel";

interface Product {
  id: number;
  name: string;
  sku: string;
  price: string | number;
  web_allocated_stock: number;
  images?: { url: string; is_primary: boolean }[];
}

interface Category {
  id: string;
  name: string;
  image_url?: string;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { addItem } = useCartStore();

  useEffect(() => {
    api.get("/web/categories").then(res => setCategories(res.data.categories || []));
  }, []);

  useEffect(() => {
    const fetchFilteredProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchTerm) params.append("search", searchTerm);
        if (selectedCategory) params.append("category", selectedCategory);

        const res = await api.get(`/web/products?${params.toString()}`);
        setProducts(res.data.products || []);
      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFilteredProducts();
  }, [searchTerm, selectedCategory]);

  const getProductImageUrl = (product: Product) => {
    return product.images?.find((img) => img.is_primary)?.url ||
           product.images?.[0]?.url ||
           "https://placehold.co/400x400?text=No+Image";
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <main className="max-w-7xl mx-auto px-4 pt-10">
        <HeroCarousel />

        {/* --- SEARCH BAR --- */}
        <div className="relative w-full max-w-2xl mx-auto mb-12">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search for products or SKUs..."
            className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* --- VISUAL CATEGORY GRID --- */}
        {!searchTerm && (
          <div className="mb-16">
            <h2 className="text-3xl font-black text-gray-900 text-center mb-6">Shop By Category</h2>

            <div className="flex gap-6 overflow-x-auto pt-4 pb-8 px-4 snap-x hide-scrollbar justify-start md:justify-center">

              {/* 'All Items' Default Button */}
              <div
                onClick={() => setSelectedCategory(null)}
                className={`snap-center shrink-0 flex flex-col items-center justify-start gap-3 cursor-pointer group w-28 ${!selectedCategory ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
              >
                <div className={`w-24 h-24 rounded-2xl flex items-center justify-center transition-all duration-300 ${!selectedCategory ? 'bg-blue-50 text-blue-600 shadow-md ring-4 ring-blue-600 ring-offset-2 scale-105' : 'bg-white text-gray-400 border border-gray-200 group-hover:border-blue-300 group-hover:text-blue-500 shadow-sm'}`}>
                  <LayoutGrid size={32} />
                </div>
                <span className={`text-sm font-bold text-center transition-colors ${!selectedCategory ? 'text-blue-600' : 'text-gray-600 group-hover:text-gray-900'}`}>
                  All Items
                </span>
              </div>

              {/* Dynamic Category Cards */}
              {categories.map(cat => (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`snap-center shrink-0 flex flex-col items-center justify-start gap-3 cursor-pointer group w-28 ${selectedCategory === cat.id ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
                >
                  <div className={`w-24 h-24 rounded-2xl overflow-hidden bg-white flex items-center justify-center transition-all duration-300 ${selectedCategory === cat.id ? 'shadow-md ring-4 ring-blue-600 ring-offset-2 scale-105' : 'border border-gray-200 group-hover:border-blue-300 shadow-sm'}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cat.image_url || `https://placehold.co/150x150?text=${encodeURIComponent(cat.name)}`}
                      alt={cat.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  <span className={`text-sm font-bold text-center leading-tight transition-colors ${selectedCategory === cat.id ? 'text-blue-600' : 'text-gray-600 group-hover:text-gray-900'}`}>
                    {cat.name}
                  </span>
                </div>
              ))}
            </div>

            <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mt-2"></div>
          </div>
        )}

        {/* --- PRODUCT GRID HEADER --- */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            {searchTerm ? `Results for "${searchTerm}"` : selectedCategory ? `${selectedCategory} Products` : "Latest Arrivals"}
          </h1>
          {!searchTerm && !selectedCategory && (
            <p className="text-gray-500 mt-1 font-medium">Available for immediate web delivery.</p>
          )}
        </div>

        {/* --- PRODUCT GRID --- */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl text-center border border-dashed border-gray-200">
            <p className="text-gray-500 font-medium">No products found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">

                {/* 🔥 FIX: Wrapped Image and Title in a Link */}
                <Link href={`/product/${product.id}`} className="cursor-pointer block">
                  <div className="aspect-square rounded-2xl bg-gray-50 mb-5 overflow-hidden relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getProductImageUrl(product)}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-gray-700 shadow-sm border border-gray-100">
                      {product.web_allocated_stock} in stock
                    </div>
                  </div>

                  <h3 className="font-bold text-gray-900 text-xl mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">{product.name}</h3>
                </Link>

                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-4">SKU: {product.sku}</p>

                <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-50">
                  <span className="text-2xl font-black text-gray-900">${parseFloat(product.price.toString()).toFixed(2)}</span>
                  <button
                    onClick={() => addItem({
                      id: product.id,
                      name: product.name,
                      price: parseFloat(product.price.toString()),
                      imageUrl: getProductImageUrl(product),
                      quantity: 1
                    })}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-2xl transition-all active:scale-90 shadow-lg shadow-blue-100 cursor-pointer"
                  >
                    <ShoppingCart size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}