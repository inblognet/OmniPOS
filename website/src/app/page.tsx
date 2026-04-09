"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useCartStore } from "@/store/useCartStore";
import { ShoppingCart, Search } from "lucide-react";
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
  id: string; // <-- Changed to string to match your Neon database
  name: string;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null); // <-- Changed to string

  const { addItem } = useCartStore();

  // 1. Fetch Categories once on load
  useEffect(() => {
    api.get("/web/categories").then(res => setCategories(res.data.categories || []));
  }, []);

  // 2. Fetch Products whenever search or category changes (ESLint fix applied)
  useEffect(() => {
    const fetchFilteredProducts = async () => {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true);

      try {
        const params = new URLSearchParams();
        if (searchTerm) params.append("search", searchTerm);
        if (selectedCategory) params.append("category", selectedCategory); // Removed .toString() since it's already a string!

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

  const getImageUrl = (product: Product) => {
    return product.images?.find((img) => img.is_primary)?.url ||
           product.images?.[0]?.url ||
           "https://placehold.co/400x400?text=No+Image";
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <main className="max-w-7xl mx-auto px-4 pt-10">
        <HeroCarousel />

        {/* --- SEARCH & FILTER BAR --- */}
        <div className="flex flex-col md:flex-row gap-4 mb-12 items-center">
          <div className="relative flex-grow w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search for products or SKUs..."
              className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-6 py-4 rounded-2xl font-bold whitespace-nowrap transition-all cursor-pointer ${!selectedCategory ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-6 py-4 rounded-2xl font-bold whitespace-nowrap transition-all cursor-pointer ${selectedCategory === cat.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-10">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            {searchTerm ? `Results for "${searchTerm}"` : selectedCategory ? "Category Results" : "Latest Arrivals"}
          </h1>
          {!searchTerm && !selectedCategory && (
            <p className="text-gray-500 mt-2 text-lg">Available for immediate web delivery.</p>
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
                <div className="aspect-square rounded-2xl bg-gray-50 mb-5 overflow-hidden relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getImageUrl(product)}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-gray-700 shadow-sm border border-gray-100">
                    {product.web_allocated_stock} in stock
                  </div>
                </div>

                <h3 className="font-bold text-gray-900 text-xl mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">{product.name}</h3>
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-4">SKU: {product.sku}</p>

                <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-50">
                  <span className="text-2xl font-black text-gray-900">${parseFloat(product.price.toString()).toFixed(2)}</span>
                  <button
                    onClick={() => addItem({
                      id: product.id,
                      name: product.name,
                      price: parseFloat(product.price.toString()),
                      imageUrl: getImageUrl(product),
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