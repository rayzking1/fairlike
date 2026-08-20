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
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);

  // Зареждане от localStorage при първоначално отваряне
  useEffect(() => {
    try {
      const saved = localStorage.getItem("optom_cart");
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Грешка при зареждане на количката от localStorage:", e);
    }
  }, []);

  // Запазване в localStorage при всяка промяна
  useEffect(() => {
    try {
      localStorage.setItem("optom_cart", JSON.stringify(items));
    } catch (e) {
      console.error("Грешка при запис на количката в localStorage:", e);
    }
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

  // Изчисления
  const cartTotal = items.reduce(
    (sum, it) => sum + it.quantityCases * it.product.casePrice,
    0
  );
  const vatAmount = cartTotal * 0.20;
  const grandTotal = cartTotal + vatAmount;

  // Прогнозен марж: (RRP * бройки в стек - цена на стек) * поръчани стекове
  const estimatedTotalProfit = items.reduce((sum, it) => {
    const revenuePerCase = it.product.rrpPrice * it.product.unitsPerCase;
    const profitPerCase = Math.max(0, revenuePerCase - it.product.casePrice);
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
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
