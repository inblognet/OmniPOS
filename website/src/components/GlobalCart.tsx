"use client";
import { useCartStore } from "@/store/useCartStore";
import { usePathname } from "next/navigation"; // 1. Added usePathname import
import CartDrawer from "./CartDrawer";

export default function GlobalCart() {
  const { isOpen, closeCart } = useCartStore();
  const pathname = usePathname(); // 2. Get the current URL

  // 3. Hide the cart drawer completely if we are on the admin page!
  if (pathname.startsWith("/admin")) {
    return null;
  }

  // This listens to the global store and passes the props down to your existing drawer!
  return <CartDrawer isOpen={isOpen} onClose={closeCart} />;
}