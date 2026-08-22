"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

export interface CartProduct {
  id: string;
  name: string;
  category: string;
  barcode: string;
  supplierName: string;
  supplierMinimum: number;
  unitsPerCase: number;
  casePrice: number;
  rrpPrice: number;
  imageUrl: string;
}

export interface CartItem {
  product: CartProduct;
  quantityCases: number;
}

interface CartContextType {
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  items: CartItem[];
  addToCart: (product: CartProduct, cases?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  cartTotal: number;
  vatAmount: number;
  grandTotal: number;
  estimatedTotalProfit: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);

  const storageKey = user?.email ? `optom_cart_${user.email.toLowerCase()}` : "optom_cart_guest";

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setItems(saved ? JSON.parse(saved) : []);
    } catch (e) {
      setItems([]);
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (e) {}
  }, [items, storageKey]);

  const addToCart = (product: CartProduct, cases: number = 1) => {
    setItems((prev) => {
      const existing = prev.find((it) => it.product.id === product.id);
      if (existing) {
        return prev.map((it) =>
          it.product.id === product.id
            ? { ...it, quantityCases: it.quantityCases + cases }
            : it
        );
      }
      return [...prev, { product, quantityCases: cases }];
    });
    setIsCartOpen(true);
  };

  useEffect(() => {
    const handleGlobalAddToCart = (event: Event) => {
      const customEvent = event as CustomEvent<CartProduct>;
      if (customEvent.detail) {
        addToCart(customEvent.detail, 1);
      }
    };
    window.addEventListener("optom:add-to-cart", handleGlobalAddToCart);
    return () => window.removeEventListener("optom:add-to-cart", handleGlobalAddToCart);
  }, []);

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((prev) =>
      prev.map((it) =>
        it.product.id === productId ? { ...it, quantityCases: quantity } : it
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setItems((prev) => prev.filter((it) => it.product.id !== productId));
  };

  const clearCart = () => {
    setItems([]);
  };

  const cartTotal = items.reduce((sum, it) => sum + it.quantityCases * it.product.casePrice, 0);
  const vatAmount = cartTotal * 0.20;
  const grandTotal = cartTotal + vatAmount;
  const estimatedTotalProfit = items.reduce((sum, it) => {
    const revenue = it.product.rrpPrice * it.product.unitsPerCase;
    const profit = Math.max(0, revenue - it.product.casePrice);
    return sum + profit * it.quantityCases;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        isCartOpen,
        setIsCartOpen,
        items,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        cartTotal,
        vatAmount,
        grandTotal,
        estimatedTotalProfit,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}
