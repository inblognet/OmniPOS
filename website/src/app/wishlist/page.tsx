"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/useUserStore";
import { useWishlistStore, WishlistItem } from "@/store/useWishlistStore"; // 🔥 Imported WishlistItem type
import { useCartStore } from "@/store/useCartStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useToastStore } from "@/store/useToastStore";
import { Heart, ShoppingCart, Trash2, ArrowRight } from "lucide-react";

export default function WishlistPage() {
  const router = useRouter();
  const { user } = useUserStore();
  const { items, fetchWishlist, toggleWishlist } = useWishlistStore();
  const { addItem } = useCartStore();
  const currencySymbol = useSettingsStore((state) => state.currencySymbol);
  const { addToast } = useToastStore();

  useEffect(() => {
    if (!user) {
      router.push("/login");
    } else {
      fetchWishlist(user.id);
    }
  }, [user, router, fetchWishlist]);

  const handleRemove = async (productId: number) => {
    if (!user) return;
    await toggleWishlist(user.id, productId);
    addToast("Item removed from wishlist", "info");
  };

  // 🔥 Replaced 'any' with the strict 'WishlistItem' type
  const handleAddToCart = (product: WishlistItem) => {
    addItem({
      id: product.id,
      name: product.name,
      price: parseFloat(product.price.toString()),
      imageUrl: product.imageUrl,
      quantity: 1
    });
    addToast(`${product.name} added to cart!`, "success");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-10">
          <h1 className="text-4xl font-black text-gray-900 flex items-center gap-3">
            <Heart className="text-rose-500 fill-rose-500" size={40} />
            My Wishlist
          </h1>
          <p className="text-gray-500 mt-2 text-lg">Save your favorite items and buy them later.</p>
        </div>

        {items.length === 0 ? (
          <div className="bg-white p-16 rounded-3xl text-center border border-dashed border-gray-200">
            <Heart size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-gray-900">Your wishlist is empty</h3>
            <p className="text-gray-500 mt-2 mb-6">Found something you like? Tap the heart icon to save it here!</p>
            <Link href="/" className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors">
              Explore Products <ArrowRight size={18} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((product) => (
              <div key={product.id} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col group transition-all duration-300 hover:shadow-xl">
                <Link href={`/product/${product.id}`} className="block relative aspect-square rounded-2xl bg-gray-50 mb-4 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={product.imageUrl || "https://placehold.co/400x400?text=No+Image"} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  {product.web_allocated_stock <= 0 && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                      <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-lg">Out of Stock</span>
                    </div>
                  )}
                </Link>

                <p className="text-gray-400 text-xs font-black uppercase tracking-wider mb-1">{product.category}</p>
                <h3 className="font-bold text-gray-900 text-lg mb-4 line-clamp-2">{product.name}</h3>

                <div className="mt-auto flex items-end justify-between pt-4 border-t border-gray-50">
                  <div>
                    <span className="text-2xl font-black text-gray-900">{currencySymbol}{parseFloat(product.price.toString()).toLocaleString()}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleRemove(product.id)} className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors" title="Remove">
                      <Trash2 size={20} />
                    </button>
                    <button
                      disabled={product.web_allocated_stock <= 0}
                      onClick={() => handleAddToCart(product)}
                      className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:bg-gray-300 transition-colors shadow-md shadow-blue-100" title="Add to Cart"
                    >
                      <ShoppingCart size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}