"use client";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Package, UploadCloud, CheckCircle } from "lucide-react";

// 1. Define what a Product looks like so TypeScript is happy!
interface Product {
  id: number;
  name: string;
  sku: string;
}

export default function AdminPage() {
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // 2. We replaced 'any' with our strict 'Product' type here
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");

  // Load products when the page opens
  useEffect(() => {
    api.get("/web/products")
      .then(res => { if (res.data?.success) setProducts(res.data.products || []); })
      .catch(err => console.error("Error loading products:", err));
  }, []);

  const handleFullUploadProcess = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedProductId) {
      alert("Please select a product first!");
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setSuccessMsg("");

    const formData = new FormData();
    formData.append("image", file);

    try {
      // 1. Send file to Cloudinary
      const uploadRes = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (uploadRes.data.success) {
        const imageUrl = uploadRes.data.imageUrl;

        // 2. Tell the database to link the new URL to the selected product
        const linkRes = await api.post("/upload/link", {
          productId: parseInt(selectedProductId),
          imageUrl: imageUrl
        });

        if (linkRes.data.success) {
          setSuccessMsg("🎉 Image uploaded and linked to product perfectly!");
        }
      }
    } catch (error) {
      console.error("Process failed", error);
      alert("Upload failed. Check your backend terminal for errors.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-10">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2 text-gray-800">
          <Package className="text-blue-600" />
          OmniStore Content Manager
        </h1>

        {/* Product Selector */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-700 mb-2">1. Select a Product</label>
          <select
            className="w-full p-3 border border-gray-300 rounded-xl bg-gray-50"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
          >
            <option value="">-- Choose a product to update --</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>
            ))}
          </select>
        </div>

        {/* Upload Area */}
        <label className="block text-sm font-bold text-gray-700 mb-2">2. Upload New Image</label>
        <div className="border-2 border-dashed border-gray-300 bg-gray-50 rounded-xl p-10 text-center transition-colors hover:bg-gray-100">
          {successMsg ? (
            <div className="space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-200 font-bold flex items-center justify-center gap-2">
                <CheckCircle size={24} /> {successMsg}
              </div>
              <button
                onClick={() => { setSuccessMsg(""); setSelectedProductId(""); }}
                className="text-blue-600 text-sm font-semibold hover:underline"
              >
                Update another product
              </button>
            </div>
          ) : (
            <div className="space-y-4 flex flex-col items-center opacity-100">
              <UploadCloud size={48} className={selectedProductId ? "text-blue-500" : "text-gray-300"} />

              <label className={`px-6 py-3 rounded-xl font-bold cursor-pointer transition-all ${
                !selectedProductId ? 'bg-gray-300 text-gray-500 cursor-not-allowed' :
                uploading ? 'bg-blue-400 text-white cursor-wait' :
                'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
              }`}>
                {uploading ? "Processing..." : "Select & Upload Image"}
                <input
                  type="file" accept="image/*" className="hidden"
                  onChange={handleFullUploadProcess}
                  disabled={uploading || !selectedProductId}
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}