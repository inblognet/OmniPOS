"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Banner {
  id: number;
  image_url: string;
  title: string;
  subtitle: string;
  link_url: string;
}

export default function HeroCarousel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/web/carousel")
      .then((res) => {
        if (res.data.success) setBanners(res.data.banners);
      })
      .catch((err) => console.error("Carousel error:", err))
      .finally(() => setLoading(false));
  }, []);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev === banners.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
  };

  if (loading || banners.length === 0) return null;

  return (
    <div className="relative w-full h-[500px] overflow-hidden bg-gray-200 rounded-3xl mb-12 group">
      {/* Slides */}
      <div
        className="flex h-full transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {banners.map((banner) => (
          <div key={banner.id} className="min-w-full h-full relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={banner.image_url}
              alt={banner.title}
              className="w-full h-full object-cover"
            />
            {/* Overlay Text */}
            <div className="absolute inset-0 bg-black/40 flex flex-col justify-center px-20">
              <h2 className="text-white text-6xl font-black max-w-2xl leading-tight mb-4 drop-shadow-lg">
                {banner.title}
              </h2>
              <p className="text-white/90 text-xl max-w-xl font-medium drop-shadow-md">
                {banner.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {banners.length > 1 && (
        <>
          <button onClick={prevSlide} className="absolute left-5 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-md p-3 rounded-full text-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer">
            <ChevronLeft size={30} />
          </button>
          <button onClick={nextSlide} className="absolute right-5 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-md p-3 rounded-full text-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer">
            <ChevronRight size={30} />
          </button>
        </>
      )}

      {/* Dots */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
        {banners.map((_, i) => (
          <div key={i} className={`h-2 rounded-full transition-all ${currentIndex === i ? "bg-white w-8" : "bg-white/50 w-2"}`} />
        ))}
      </div>
    </div>
  );
}