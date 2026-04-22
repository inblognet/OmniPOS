"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { useCartStore } from "@/store/useCartStore";
import { useSettingsStore } from "@/store/useSettingsStore"; // 🔥 Imported global settings store
import { ShoppingCart, Star, Box, Tag, Loader2, MessageSquare } from "lucide-react";

interface Product {
  id: number;
  name: string;
  sku: string;
  price: string | number;
  web_allocated_stock: number;
  category: string;
  description: string;
  images: { url: string; is_primary: boolean }[];
}

interface Review {
  id: number;
  customer_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export default function ProductPage() {
  const params = useParams();
  const productId = params.id;
  const { addItem } = useCartStore();

  // 🔥 Fetch dynamic currency symbol
  const currencySymbol = useSettingsStore((state) => state.currencySymbol);

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainImage, setMainImage] = useState<string>("");

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        const res = await api.get(`/web/products/${productId}`);
        if (res.data.success) {
          setProduct(res.data.product);
          setReviews(res.data.reviews || []);

          const primaryImg = res.data.product.images?.find((img: { url: string; is_primary: boolean }) => img.is_primary)?.url;
          const firstImg = res.data.product.images?.[0]?.url;
          setMainImage(primaryImg || firstImg || "https://placehold.co/600x600?text=No+Image");
        }
      } catch (error) {
        console.error("Failed to load product details", error);
      } finally {
        setLoading(false);
      }
    };

    if (productId) fetchProductDetails();
  }, [productId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 size={48} className="animate-spin text-blue-600" /></div>;
  }

  if (!product) {
    return <div className="min-h-screen flex items-center justify-center text-2xl font-bold text-gray-400">Product Not Found</div>;
  }

  // Calculate Average Rating
  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviews.length).toFixed(1)
    : "No ratings yet";

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">

        {/* Top Section: Images & Add to Cart */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">

            {/* Left: Image Gallery */}
            <div className="space-y-4">
              <div className="aspect-square bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mainImage} alt={product.name} className="w-full h-full object-cover" />
              </div>

              {/* Thumbnails */}
              {product.images && product.images.length > 1 && (
                <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setMainImage(img.url)}
                      className={`w-20 h-20 shrink-0 rounded-xl overflow-hidden border-2 transition-all ${mainImage === img.url ? 'border-blue-600 shadow-md' : 'border-transparent hover:border-gray-300'}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt="thumbnail" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Product Details */}
            <div className="flex flex-col">
              <div className="mb-2">
                <span className="text-sm font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full">
                  {product.category}
                </span>
              </div>

              <h1 className="text-4xl font-black text-gray-900 mb-4">{product.name}</h1>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-1 text-amber-400 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100">
                  <Star size={18} className="fill-amber-400" />
                  <span className="font-bold text-amber-900 text-sm">{averageRating}</span>
                </div>
                <p className="text-sm font-medium text-gray-500">{reviews.length} Reviews</p>
              </div>

              {/* 🔥 Swapped hardcoded $ for currencySymbol */}
              <p className="text-5xl font-black text-gray-900 mb-8">{currencySymbol}{parseFloat(product.price.toString()).toFixed(2)}</p>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 text-gray-600">
                  <Tag size={20} className="text-gray-400" />
                  <span className="font-medium">SKU: <span className="font-bold text-gray-900">{product.sku}</span></span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Box size={20} className="text-gray-400" />
                  <span className="font-medium">Availability:
                    <span className={`ml-2 font-bold ${product.web_allocated_stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {product.web_allocated_stock > 0 ? `${product.web_allocated_stock} In Stock` : 'Out of Stock'}
                    </span>
                  </span>
                </div>
              </div>

              <div className="mt-auto pt-8 border-t border-gray-100">
                {/* 🔥 Removed the shadow-lg and shadow-blue-200 classes here */}
                <button
                  disabled={product.web_allocated_stock <= 0}
                  onClick={() => addItem({
                    id: product.id,
                    name: product.name,
                    price: parseFloat(product.price.toString()),
                    imageUrl: mainImage,
                    quantity: 1
                  })}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95"
                >
                  <ShoppingCart size={24} />
                  {product.web_allocated_stock > 0 ? "Add to Cart" : "Out of Stock"}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Section: Description & Reviews */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Description */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <MessageSquare className="text-blue-600" /> Product Description
            </h2>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-gray-600 leading-relaxed whitespace-pre-wrap">
              {product.description || "No description provided for this product yet."}
            </div>
          </div>

          {/* Reviews List */}
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Star className="text-amber-400 fill-amber-400" /> Customer Reviews
            </h2>

            <div className="space-y-4">
              {reviews.length === 0 ? (
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center">
                  <Star size={40} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-gray-500 font-medium">No reviews yet. Buy this item and be the first!</p>
                </div>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-bold text-gray-900">{review.customer_name}</p>
                        <p className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={14} className={i < review.rating ? "fill-amber-400" : "text-gray-200"} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 italic">&quot;{review.comment}&quot;</p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}