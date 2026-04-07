"use client";
import { useCartStore } from "@/store/useCartStore";
import CartDrawer from "./CartDrawer";

export default function GlobalCart() {
  const { isOpen, closeCart } = useCartStore();

  // This listens to the global store and passes the props down to your existing drawer!
  return <CartDrawer isOpen={isOpen} onClose={closeCart} />;
}