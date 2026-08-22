"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

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
  hasTieredDiscount?: boolean;
  has_tiered_discount?: boolean;
  tier1Qty?: number;
  tier1_qty?: number;
  tier1Discount?: number;
  tier1_discount?: number;
  tier2Qty?: number;
  tier2_qty?: number;
  tier2Discount?: number;
  tier2_discount?: number;
}

export interface CartItem {
  product: CartProduct;
  quantityCases: number;
}

export function getTieredPrice(product: CartProduct, cases: number): { effectivePrice: number; discountPercent: number } {
  if (!product || !product.casePrice) {
    return { effectivePrice: 0, discountPercent: 0 };
  }

  const isEnabled = product.hasTieredDiscount !== false && product.has_tiered_discount !== false;
  if (!isEnabled) {
    return { effectivePrice: product.casePrice, discountPercent: 0 };
  }

  const t2Qty = Number(product.tier2Qty ?? product.tier2_qty ?? 10);
  const t2Disc = Number(product.tier2Discount ?? product.tier2_discount ?? 10.0);
  const t1Qty = Number(product.tier1Qty ?? product.tier1_qty ?? 5);
  const t1Disc = Number(product.tier1Discount ?? product.tier1_discount ?? 5.0);

  if (cases >= t2Qty && t2Disc > 0) {
    const discounted = product.casePrice * (1 - t2Disc / 100);
    return { effectivePrice: Math.round(discounted * 100) / 100, discountPercent: t2Disc };
  } else if (cases >= t1Qty && t1Disc > 0) {
    const discounted = product.casePrice * (1 - t1Disc / 100);
    return { effectivePrice: Math.round(discounted * 100) / 100, discountPercent: t1Disc };
  }

  return { effectivePrice: product.casePrice, discountPercent: 0 };
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
  totalSavedFromTiers: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("optom_cart");
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Грешка при зареждане на количката:", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("optom_cart", JSON.stringify(items));
    } catch (e) {}
  }, [items]);

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

  const cartTotal = items.reduce((sum, it) => {
    const { effectivePrice } = getTieredPrice(it.product, it.quantityCases);
    return sum + it.quantityCases * effectivePrice;
  }, 0);

  const originalTotalNoDiscount = items.reduce((sum, it) => {
    return sum + it.quantityCases * it.product.casePrice;
  }, 0);

  const totalSavedFromTiers = Math.max(0, originalTotalNoDiscount - cartTotal);
  const vatAmount = +(cartTotal * 0.20).toFixed(2);
  const grandTotal = +(cartTotal + vatAmount).toFixed(2);

  const estimatedTotalProfit = items.reduce((sum, it) => {
    const { effectivePrice } = getTieredPrice(it.product, it.quantityCases);
    const revenuePerCase = it.product.rrpPrice * it.product.unitsPerCase;
    const profitPerCase = Math.max(0, revenuePerCase - effectivePrice);
    return sum + profitPerCase * it.quantityCases;
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
        totalSavedFromTiers,
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
