"use client";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Tags, Image as ImageIcon, Loader2, UploadCloud } from "lucide-react";

interface Category {
  id: string;
  name: string;
  image_url: string | null;
}

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      const res = await api.get("/web/categories");
      if (res.data.success) {
        setCategories(res.data.categories);
      }
    } catch (error) {
      console.error("Failed to load categories", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // --- NEW CLOUDINARY UPLOAD HANDLER ---
  const handleFileUpload = async (categoryName: string, file: File) => {
    setUploading(categoryName);

    // We must use FormData to send physical files over HTTP
    const formData = new FormData();
    formData.append("image", file);
    formData.append("category", categoryName);

    try {
      const res = await api.post("/web/admin/categories/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data.success) {
        fetchCategories(); // Refresh the grid to show the new Cloudinary image!
      }
    } catch (error) {
      alert("Failed to upload image. Please check your backend Cloudinary config.");
      console.error(error);
    } finally {
      setUploading(null);
    }
  };

  if (loading) {
    return <div className="p-8 text-gray-500 font-bold flex items-center gap-2"><Loader2 className="animate-spin" /> Loading categories...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
          <Tags className="text-blue-600" size={32} />
          Category Images
        </h1>
        <p className="text-gray-500 mt-2 font-medium">
          Upload local images for your categories. These are securely hosted on Cloudinary and displayed on your storefront.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => (
          <div key={cat.name} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">

            {/* Image Preview Area */}
            <div className="aspect-video bg-gray-50 flex flex-col items-center justify-center relative overflow-hidden border-b border-gray-100">
              {uploading === cat.name ? (
                <div className="flex flex-col items-center text-blue-600">
                  <Loader2 size={40} className="animate-spin mb-2" />
                  <span className="text-sm font-bold">Uploading...</span>
                </div>
              ) : cat.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
              ) : (
                <>
                  <ImageIcon size={48} className="text-gray-300 mb-2" />
                  <span className="text-sm font-bold text-gray-400">No Image Set</span>
                </>
              )}

              {/* Category Name Badge */}
              <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                <span className="font-black text-gray-900">{cat.name}</span>
              </div>
            </div>

            {/* Upload Controls */}
            <div className="p-4 bg-white mt-auto">
              {/* Hidden file input wrapped by a clean label button */}
              <label className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold transition-all cursor-pointer border-2 border-dashed ${
                uploading === cat.name
                  ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100 hover:border-blue-300"
              }`}>
                <UploadCloud size={18} />
                {cat.image_url ? "Replace Image" : "Upload Image"}

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading === cat.name}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(cat.name, file);
                    }
                    // Reset input so you can upload the same file again if needed
                    e.target.value = '';
                  }}
                />
              </label>
            </div>

          </div>
        ))}

        {categories.length === 0 && (
          <div className="col-span-full p-12 bg-white rounded-2xl border border-dashed border-gray-300 text-center">
            <Tags size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-900">No Categories Found</h3>
            <p className="text-gray-500">Add products with categories in your POS to see them appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}