"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useCartStore } from "@/store/useCartStore";
import CartDrawer from "@/components/CartDrawer";
import { ShoppingCart, Package } from "lucide-react";

interface Product {
  id: number;
  name: string;
  sku: string;
  price: string | number;
  web_allocated_stock: number;
  images?: { url: string; is_primary: boolean }[];
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const { addItem, items } = useCartStore();
  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    api.get("/web/products")
      .then(res => { if (res.data?.success) setProducts(res.data.products || []); })
      .catch(err => console.error("Error:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <nav className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xl font-black text-blue-600">
            <Package /> OmniStore
          </div>

          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ShoppingCart size={24} className="text-gray-700" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-white">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 mt-10">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Latest Arrivals</h1>
          <p className="text-gray-500 mt-2">Available for immediate web delivery.</p>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading products...</p>
        ) : products.length === 0 ? (
          <p className="text-gray-500">No products available. Allocate stock from POS!</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col group hover:shadow-md transition-all"
              >
                <div className="aspect-square rounded-xl bg-gray-50 mb-4 overflow-hidden relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    /* THE FIX IS HERE! It searches for the primary image first! */
                    src={product.images?.find((img) => img.is_primary)?.url || product.images?.[0]?.url || "https://placehold.co/400x400?text=No+Image"}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2 bg-white/90 px-2 py-1 rounded text-xs font-bold text-gray-700 shadow-sm">
                    {product.web_allocated_stock} in stock
                  </div>
                </div>

                <h3 className="font-bold text-gray-900 text-lg line-clamp-1">{product.name}</h3>
                <p className="text-gray-500 text-sm mb-4">SKU: {product.sku}</p>

                <div className="mt-auto flex items-center justify-between">
                  <span className="text-xl font-black text-blue-600">${parseFloat(product.price.toString()).toFixed(2)}</span>
                  <button
                    onClick={() => addItem(product)}
                    className="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors active:scale-95"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}