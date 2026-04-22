"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useCartStore } from "@/store/useCartStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { ShoppingCart, Search, LayoutGrid, Ticket, Copy, CheckCircle2, SlidersHorizontal, ChevronDown, Tag } from "lucide-react";
import HeroCarousel from "@/components/HeroCarousel";

interface Product {
  id: number;
  name: string;
  sku: string;
  price: string | number;
  web_allocated_stock: number;
  category: string;
  images?: { url: string; is_primary: boolean }[];
}

interface Category {
  id: string;
  name: string;
  image_url?: string;
}

interface Voucher {
  code: string;
  discount_percentage: number;
  description: string;
}

export default function Home() {
  const currencySymbol = useSettingsStore((state) => state.currencySymbol);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [latestVoucher, setLatestVoucher] = useState<Voucher | null>(null);

  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Sidebar Filter States
  const [filterSearch, setFilterSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const { addItem } = useCartStore();

  useEffect(() => {
    // Fetch Categories
    api.get("/web/categories").then(res => setCategories(res.data.categories || []));

    // Fetch latest active voucher
    api.get("/web/vouchers/active").then(res => {
      if (res.data.success && res.data.vouchers && res.data.vouchers.length > 0) {
        setLatestVoucher(res.data.vouchers[0]);
      }
    }).catch(err => console.error("No active vouchers found"));

    // Fetch ALL active products once
    const fetchAllProducts = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/web/products`);
        setProducts(res.data.products || []);
      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllProducts();
  }, []);

  const getProductImageUrl = (product: Product) => {
    return product.images?.find((img) => img.is_primary)?.url ||
           product.images?.[0]?.url ||
           "https://placehold.co/400x400?text=No+Image";
  };

  const handleCopyCode = () => {
    if (!latestVoucher) return;
    navigator.clipboard.writeText(latestVoucher.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCategoryClick = (categoryId: string | null) => {
    setFilterCategory(categoryId);
    // Smooth scroll down to the All Products section
    document.getElementById("all-products-section")?.scrollIntoView({ behavior: "smooth" });
  };

  const clearFilters = () => {
    setFilterSearch("");
    setFilterCategory(null);
    setMinPrice("");
    setMaxPrice("");
    setSortBy("newest");
  };

  // --- Derived Data ---

  // 1. Latest Arrivals (Top 4 newest products)
  const latestArrivals = products.slice(0, 4);

  // 2. Filtered & Sorted Products (For the All Products Section)
  const filteredAndSortedProducts = products
    .filter(p => {
      const matchesSearch = filterSearch ? (p.name.toLowerCase().includes(filterSearch.toLowerCase()) || p.sku.toLowerCase().includes(filterSearch.toLowerCase())) : true;
      const matchesCategory = filterCategory ? p.category === filterCategory : true;
      const price = parseFloat(p.price.toString());
      const passesMin = minPrice ? price >= parseFloat(minPrice) : true;
      const passesMax = maxPrice ? price <= parseFloat(maxPrice) : true;

      return matchesSearch && matchesCategory && passesMin && passesMax;
    })
    .sort((a, b) => {
      const priceA = parseFloat(a.price.toString());
      const priceB = parseFloat(b.price.toString());
      if (sortBy === 'price_asc') return priceA - priceB;
      if (sortBy === 'price_desc') return priceB - priceA;
      return 0; // Default to newest
    });

  // Reusable Product Card Component
  const ProductCard = ({ product }: { product: Product }) => (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <Link href={`/product/${product.id}`} className="cursor-pointer block">
        <div className="aspect-square rounded-2xl bg-gray-50 mb-5 overflow-hidden relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getProductImageUrl(product)}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-green-600 shadow-sm border border-green-100">
            {product.web_allocated_stock} IN STOCK
          </div>
        </div>
        <p className="text-gray-400 text-xs font-black uppercase tracking-wider mb-1 line-clamp-1">{product.category}</p>
        <h3 className="font-bold text-gray-900 text-lg mb-4 line-clamp-2 group-hover:text-blue-600 transition-colors leading-tight">{product.name}</h3>
      </Link>
      <div className="mt-auto flex items-end justify-between pt-4 border-t border-gray-50">
        <div>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Price</p>
          <span className="text-2xl font-black text-gray-900">{currencySymbol}{parseFloat(product.price.toString()).toLocaleString()}</span>
        </div>
        <button
          onClick={() => addItem({
            id: product.id,
            name: product.name,
            price: parseFloat(product.price.toString()),
            imageUrl: getProductImageUrl(product),
            quantity: 1
          })}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-xl transition-all active:scale-90 cursor-pointer flex items-center justify-center"
        >
          <ShoppingCart size={18} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <main className="max-w-[1400px] mx-auto px-4 pt-10">

        <HeroCarousel />

        {/* PROMO BANNER (Shadow removed) */}
        {latestVoucher && (
          <div className="max-w-4xl mx-auto mb-12 bg-gradient-to-r from-amber-400 to-orange-500 rounded-3xl p-1 transform hover:scale-[1.01] transition-transform duration-300">
            <div className="bg-white/95 backdrop-blur-sm rounded-[22px] p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-orange-100 text-orange-600 p-3 rounded-2xl">
                  <Ticket size={28} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-lg flex items-center gap-2">
                    {latestVoucher.discount_percentage}% OFF SPECIAL
                  </h3>
                  <p className="text-sm font-medium text-gray-600 line-clamp-1">{latestVoucher.description}</p>
                </div>
              </div>

              <button
                onClick={handleCopyCode}
                className="shrink-0 flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-5 py-3 rounded-xl font-bold transition-all active:scale-95"
              >
                <span className="tracking-widest uppercase">{latestVoucher.code}</span>
                {copied ? <CheckCircle2 size={18} className="text-green-400" /> : <Copy size={18} className="text-gray-400" />}
              </button>
            </div>
          </div>
        )}

        {/* --- 1. VISUAL CATEGORY GRID --- */}
        <div className="mb-16">
          <h2 className="text-3xl font-black text-gray-900 text-center mb-6">Shop By Category</h2>

          <div className="flex gap-6 overflow-x-auto pt-4 pb-8 px-4 snap-x hide-scrollbar justify-start md:justify-center">
            {/* 'All Items' Default Button */}
            <div
              onClick={() => handleCategoryClick(null)}
              className={`snap-center shrink-0 flex flex-col items-center justify-start gap-3 cursor-pointer group w-28 ${!filterCategory ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
            >
              <div className={`w-24 h-24 rounded-2xl flex items-center justify-center transition-all duration-300 ${!filterCategory ? 'bg-blue-50 text-blue-600 shadow-md ring-4 ring-blue-600 ring-offset-2 scale-105' : 'bg-white text-gray-400 border border-gray-200 group-hover:border-blue-300 group-hover:text-blue-500 shadow-sm'}`}>
                <LayoutGrid size={32} />
              </div>
              <span className={`text-sm font-bold text-center transition-colors ${!filterCategory ? 'text-blue-600' : 'text-gray-600 group-hover:text-gray-900'}`}>
                All Items
              </span>
            </div>

            {/* Dynamic Category Cards */}
            {categories.map(cat => (
              <div
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className={`snap-center shrink-0 flex flex-col items-center justify-start gap-3 cursor-pointer group w-28 ${filterCategory === cat.id ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
              >
                <div className={`w-24 h-24 rounded-2xl overflow-hidden bg-white flex items-center justify-center transition-all duration-300 ${filterCategory === cat.id ? 'shadow-md ring-4 ring-blue-600 ring-offset-2 scale-105' : 'border border-gray-200 group-hover:border-blue-300 shadow-sm'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cat.image_url || `https://placehold.co/150x150?text=${encodeURIComponent(cat.name)}`}
                    alt={cat.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <span className={`text-sm font-bold text-center leading-tight transition-colors ${filterCategory === cat.id ? 'text-blue-600' : 'text-gray-600 group-hover:text-gray-900'}`}>
                  {cat.name}
                </span>
              </div>
            ))}
          </div>
          <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mt-2"></div>
        </div>

        {/* --- 2. LATEST ARRIVALS --- */}
        <div className="mb-16">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Latest Arrivals</h2>
              <p className="text-gray-500 mt-1 font-medium">Fresh stock available for immediate delivery.</p>
            </div>
          </div>

          {loading ? (
             <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {latestArrivals.map(product => <ProductCard key={`latest-${product.id}`} product={product} />)}
            </div>
          )}
        </div>


        {/* --- 3. ALL PRODUCTS SECTION (Sidebar + Grid) --- */}
        <div id="all-products-section" className="pt-8 scroll-mt-10">
          <div className="mb-4 lg:mb-8 border-b border-gray-200 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Explore All Products</h2>

            {/* Mobile "Jump to Filters" Button (Hidden on Desktop) */}
            <button
              onClick={() => document.getElementById('mobile-filter-center')?.scrollIntoView({ behavior: 'smooth' })}
              className="lg:hidden flex items-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors px-4 py-2.5 rounded-xl border border-blue-100 self-start sm:self-auto"
            >
              <SlidersHorizontal size={16} /> Jump to Filters
            </button>
          </div>

          {/* flex-col-reverse flips the layout purely on mobile! */}
          <div className="flex flex-col-reverse lg:flex-row gap-8 items-start">

            {/* THE FILTER SIDEBAR / MOBILE CONTROL CENTER */}
            <aside id="mobile-filter-center" className="w-full lg:w-72 flex-shrink-0 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 lg:sticky lg:top-24 z-10 scroll-mt-24">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <SlidersHorizontal size={20} className="text-blue-600"/> Filters
                </h3>
                <button onClick={clearFilters} className="text-xs font-bold text-gray-400 hover:text-blue-600 transition-colors">Clear All</button>
              </div>

              <div className="space-y-8">
                {/* Mini Search */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Search Catalog</h4>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Name, code..."
                      value={filterSearch}
                      onChange={(e) => setFilterSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Categories</h4>
                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">

                    <label className="flex items-center justify-between cursor-pointer group" onClick={() => setFilterCategory(null)}>
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${!filterCategory ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300 group-hover:border-blue-400'}`}>
                          {!filterCategory && <CheckCircle2 size={12} className="text-white" />}
                        </div>
                        <span className={`text-sm font-bold transition-colors ${!filterCategory ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-900'}`}>All Products</span>
                      </div>
                    </label>

                    {categories.map(cat => (
                      <label key={cat.id} className="flex items-center justify-between cursor-pointer group" onClick={() => setFilterCategory(cat.id)}>
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${filterCategory === cat.id ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300 group-hover:border-blue-400'}`}>
                            {filterCategory === cat.id && <CheckCircle2 size={12} className="text-white" />}
                          </div>
                          <span className={`text-sm font-bold transition-colors ${filterCategory === cat.id ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-900'}`}>{cat.name}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Price Range</h4>
                    <button onClick={() => {setMinPrice(""); setMaxPrice("");}} className="text-[10px] font-bold text-gray-400 hover:text-blue-600">Reset</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">{currencySymbol}</span>
                      <input type="number" placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)} className="w-full pl-7 pr-2 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <span className="text-gray-300 font-bold">-</span>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">{currencySymbol}</span>
                      <input type="number" placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="w-full pl-7 pr-2 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>

              </div>
            </aside>

            {/* FILTERED PRODUCT GRID */}
            <div className="flex-1 w-full">

              {/* Top Bar: Results Count & Sorting */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm font-bold text-gray-500">
                  Showing <span className="text-gray-900">{filteredAndSortedProducts.length}</span> Results
                </p>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-400">Sort by:</span>
                  <div className="relative group">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="appearance-none bg-gray-50 border border-gray-200 text-gray-900 text-sm font-bold rounded-xl pl-4 pr-10 py-2 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="newest">Newest Arrivals</option>
                      <option value="price_asc">Price: Low to High</option>
                      <option value="price_desc">Price: High to Low</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>
              </div>

              {/* Grid */}
              {loading ? (
                <div className="flex justify-center py-32 bg-white rounded-3xl border border-gray-100">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredAndSortedProducts.length === 0 ? (
                <div className="bg-white p-16 rounded-3xl text-center border border-dashed border-gray-200">
                  <Tag size={48} className="mx-auto text-gray-200 mb-4" />
                  <h3 className="text-xl font-black text-gray-900 mb-2">No products found</h3>
                  <p className="text-gray-500 font-medium">Try adjusting your filters or search terms.</p>
                  <button onClick={clearFilters} className="mt-6 px-6 py-2 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100 transition-colors">Clear All Filters</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredAndSortedProducts.map(product => <ProductCard key={`all-${product.id}`} product={product} />)}
                </div>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}