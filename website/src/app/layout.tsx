import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";
import GlobalCart from "@/components/GlobalCart";
import ThemeProvider from "@/components/ThemeProvider"; // 🔥 NEW: Import the engine!
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OmniStore | Your All-in-One Shop",
  description: "Official web storefront for OmniPOS systems.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">

        {/* 🔥 The Magical Bridge: Injects your database theme globally! */}
        <ThemeProvider />

        <Navbar />

        <main className="flex-grow">
          {children}
        </main>

        {/* The cart now lives here, accessible from anywhere! */}
        <GlobalCart />
      </body>
    </html>
  );
}