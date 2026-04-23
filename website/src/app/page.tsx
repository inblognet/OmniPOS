"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import axios from "axios";
import { useUserStore } from "@/store/useUserStore";
import { useCartStore } from "@/store/useCartStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useWishlistStore } from "@/store/useWishlistStore";
import { useToastStore } from "@/store/useToastStore";
import { ShoppingCart, Search, LayoutGrid, CheckCircle2, SlidersHorizontal, ChevronDown, Tag, Heart, X, Gift, Loader2 } from "lucide-react";
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
  id: number;
  code: string;
  discount_percentage: number;
  description: string;
  image_url: string | null;
  expire_date_time: string | null;
  claim_status: 'CLAIMED' | 'USED' | null;
}

export default function Home() {
  const router = useRouter();
  const { user } = useUserStore();
  const currencySymbol = useSettingsStore((state) => state.currencySymbol);

  const { addToast } = useToastStore();
  const { addItem } = useCartStore();
  const { productIds: wishlistIds, toggleWishlist } = useWishlistStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Voucher Modal States
  const [publicVouchers, setPublicVouchers] = useState<Voucher[]>([]);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const [loading, setLoading] = useState(true);

  // Sidebar Filter States
  const [filterSearch, setFilterSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    // Fetch Categories
    api.get("/web/categories").then(res => setCategories(res.data.categories || []));

    // Fetch Public Vouchers & check if modal should pop up
    const fetchVouchers = async () => {
      try {
        const res = await api.get("/web/vouchers/public", {
          params: { customerId: user?.id || null }
        });
        if (res.data.success && res.data.vouchers) {
          const vouchers: Voucher[] = res.data.vouchers;
          setPublicVouchers(vouchers);

          // Pop up if there is at least one unclaimed voucher
          const hasUnclaimed = vouchers.some(v => v.claim_status === null);
          if (hasUnclaimed) {
            setShowVoucherModal(true);
          }
        }
      } catch (error: unknown) {
        console.error("Failed to load vouchers", error);
      }
    };
    fetchVouchers();

    // Fetch ALL active products once
    const fetchAllProducts = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/web/products`);
        setProducts(res.data.products || []);
      } catch (error: unknown) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllProducts();
  }, [user]);

  const getProductImageUrl = (product: Product) => {
    return product.images?.find((img) => img.is_primary)?.url ||
           product.images?.[0]?.url ||
           "https://placehold.co/400x400?text=No+Image";
  };

  // Claim Voucher Logic
  const handleClaimVoucher = async (voucher: Voucher) => {
    if (!user) {
      addToast("Please login to claim this voucher!", "warning");
      router.push('/login');
      return;
    }

    setClaiming(true);
    try {
      const res = await api.post('/web/vouchers/claim', {
        customerId: user.id,
        voucherId: voucher.id
      });

      if (res.data.success) {
        setShowVoucherModal(false);
        const { items: cartItems } = useCartStore.getState();
        const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

        if (cartCount > 0) {
          // 🔥 MAGIC REDIRECT: We attach the code to the URL!
          addToast("Voucher claimed! Applying to checkout...", "success");
          router.push(`/checkout?voucher=${voucher.code}`);
        } else {
          addToast("Voucher claimed successfully! Add products to your cart to use it.", "success");
        }
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        addToast(error.response?.data?.message || "Failed to claim voucher", "error");
      } else {
        addToast("Failed to claim voucher", "error");
      }
    } finally {
      setClaiming(false);
    }
  };

  const handleCategoryClick = (categoryId: string | null) => {
    setFilterCategory(categoryId);
    document.getElementById("all-products-section")?.scrollIntoView({ behavior: "smooth" });
  };

  const clearFilters = () => {
    setFilterSearch("");
    setFilterCategory(null);
    setMinPrice("");
    setMaxPrice("");
    setSortBy("newest");
  };

  const handleWishlistToggle = async (e: React.MouseEvent, productId: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      addToast("Please login to save items to your wishlist.", "warning");
      router.push('/login');
      return;
    }

    const isAdded = await toggleWishlist(user.id, productId);
    if (isAdded) {
      addToast("Item saved to wishlist!", "success");
    } else {
      addToast("Item removed from wishlist", "info");
    }
  };

  const latestArrivals = products.slice(0, 4);

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
      return 0;
    });

  const ProductCard = ({ product }: { product: Product }) => {
    const isInWishlist = wishlistIds.includes(product.id);

    return (
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative">

        <button
          onClick={(e) => handleWishlistToggle(e, product.id)}
          className="absolute top-8 right-8 z-10 p-2.5 bg-white/90 backdrop-blur-md rounded-full shadow-sm border border-gray-100 hover:scale-110 active:scale-95 transition-all"
        >
          <Heart size={18} className={isInWishlist ? "fill-rose-500 text-rose-500" : "text-gray-400"} />
        </button>

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
            onClick={() => {
              addItem({
                id: product.id,
                name: product.name,
                price: parseFloat(product.price.toString()),
                imageUrl: getProductImageUrl(product),
                quantity: 1
              });
              addToast(`${product.name} added to cart!`, "success");
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-xl transition-all active:scale-90 cursor-pointer flex items-center justify-center"
          >
            <ShoppingCart size={18} />
          </button>
        </div>
      </div>
    );
  };

  const unclaimedVoucher = publicVouchers.find(v => v.claim_status === null);

  return (
    <div className="min-h-screen bg-gray-50 pb-20 relative">
      <main className="max-w-[1400px] mx-auto px-4 pt-10">

        <HeroCarousel />

        {/* --- 1. VISUAL CATEGORY GRID --- */}
        <div className="mb-16 mt-8">
          <h2 className="text-3xl font-black text-gray-900 text-center mb-6">Shop By Category</h2>

          <div className="flex gap-6 overflow-x-auto pt-4 pb-8 px-4 snap-x hide-scrollbar justify-start md:justify-center">
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


        {/* --- 3. ALL PRODUCTS SECTION --- */}
        <div id="all-products-section" className="pt-8 scroll-mt-10">
          <div className="mb-4 lg:mb-8 border-b border-gray-200 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Explore All Products</h2>

            <button
              onClick={() => document.getElementById('mobile-filter-center')?.scrollIntoView({ behavior: 'smooth' })}
              className="lg:hidden flex items-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors px-4 py-2.5 rounded-xl border border-blue-100 self-start sm:self-auto"
            >
              <SlidersHorizontal size={16} /> Jump to Filters
            </button>
          </div>

          <div className="flex flex-col-reverse lg:flex-row gap-8 items-start">

            {/* FILTER SIDEBAR */}
            <aside id="mobile-filter-center" className="w-full lg:w-72 flex-shrink-0 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 lg:sticky lg:top-24 z-10 scroll-mt-24">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <SlidersHorizontal size={20} className="text-blue-600"/> Filters
                </h3>
                <button onClick={clearFilters} className="text-xs font-bold text-gray-400 hover:text-blue-600 transition-colors">Clear All</button>
              </div>

              <div className="space-y-8">
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

      {/* 🔥 THE HOMEPAGE VOUCHER POP-UP MODAL */}
      {showVoucherModal && unclaimedVoucher && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-300">

            <button
              onClick={() => setShowVoucherModal(false)}
              className="absolute top-4 right-4 z-10 bg-black/20 hover:bg-black/40 text-white rounded-full p-1.5 backdrop-blur-md transition-colors"
            >
              <X size={20} />
            </button>

            {unclaimedVoucher.image_url ? (
              <div className="h-48 w-full bg-gray-100 relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={unclaimedVoucher.image_url} alt="Promo" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent flex items-end p-6">
                  <h2 className="text-3xl font-black text-white tracking-tight">Don&apos;t miss out on this deal!</h2>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-8 flex items-end h-40 relative overflow-hidden">
                <Gift size={120} className="absolute -top-4 -right-4 text-white/10" />
                <h2 className="text-3xl font-black text-white tracking-tight z-10">Don&apos;t miss out on this deal!</h2>
              </div>
            )}

            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center gap-2 bg-rose-50 text-rose-600 px-4 py-1.5 rounded-full font-black tracking-widest uppercase mb-4 text-sm border border-rose-100">
                <Tag size={16} /> {unclaimedVoucher.discount_percentage}% OFF
              </div>

              <h3 className="text-2xl font-black text-gray-900 mb-2">{unclaimedVoucher.description}</h3>
              <p className="text-gray-500 font-medium mb-6">Grab your special discount by applying this voucher today.</p>

              <button
                onClick={() => handleClaimVoucher(unclaimedVoucher)}
                disabled={claiming}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl flex justify-center items-center gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50"
              >
                {claiming ? <Loader2 size={24} className="animate-spin" /> : "Claim It Now"}
              </button>

              <button
                onClick={() => setShowVoucherModal(false)}
                className="mt-4 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
              >
                No Thanks
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}