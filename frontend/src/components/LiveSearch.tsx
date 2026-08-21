"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, X, ShoppingCart, Loader2, Package, Tag } from "lucide-react";
import Image from "next/image";

interface Product {
  id: string;
  name: string;
  category: string;
  barcode: string;
  supplierName: string;
  unitsPerCase: number;
  casePrice: number;
  rrpPrice: number;
  imageUrl?: string;
  inStock?: boolean;
}

interface LiveSearchProps {
  onAddToCart?: (product: Product) => void;
  onSelectProduct?: (product: Product) => void;
}

export const LiveSearch: React.FC<LiveSearchProps> = ({ onAddToCart, onSelectProduct }) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  // 1. Зареждане на каталога
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        setLoading(true);
        const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "https://fairlike.onrender.com";
        const res = await fetch(`${baseUrl}/api/products`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data);
        }
      } catch (err) {
        console.error("Грешка при зареждане на търсачката:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, []);

  // 2. Филтриране в реално време
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setFiltered([]);
      setIsOpen(false);
      return;
    }

    const matches = products.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const brand = (p.supplierName || "").toLowerCase();
      const barcode = (p.barcode || "").toLowerCase();
      const category = (p.category || "").toLowerCase();
      return name.includes(q) || brand.includes(q) || barcode.includes(q) || category.includes(q);
    });

    setFiltered(matches.slice(0, 8)); // Топ 8 резултата за компактност
    setIsOpen(true);
  }, [query, products]);

  // 3. Затваряне при Click Outside или Esc
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleClear = () => {
    setQuery("");
    setFiltered([]);
    setIsOpen(false);
  };

  const handleAdd = (e: React.MouseEvent, p: Product) => {
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(p);
    } else {
      // Dispatch глобален custom event за добавяне в количката
      const event = new CustomEvent("optom:add-to-cart", { detail: p });
      window.dispatchEvent(event);
    }
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-xl">
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setIsOpen(true)}
          placeholder="Търси продукт, баркод, марка (напр. Coca-Cola, 380...)"
          className="w-full pl-10 pr-10 py-2 bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-slate-900 placeholder:text-slate-400 text-sm rounded-xl border border-transparent focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Падащо меню с резултати */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in-0 zoom-in-95 duration-150">
          <div className="p-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500 font-medium px-3">
            <span>Резултати за търсене ({filtered.length})</span>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />}
          </div>

          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {filtered.length > 0 ? (
              filtered.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (onSelectProduct) onSelectProduct(item);
                    setIsOpen(false);
                  }}
                  className="p-3 hover:bg-slate-50 flex items-center justify-between gap-3 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-11 h-11 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200/60">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-300">
                          <Package className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="font-medium text-slate-700">{item.supplierName}</span>
                        <span>•</span>
                        <span>{item.unitsPerCase} бр./стек</span>
                        {item.barcode && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-slate-400">{item.barcode}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900">
                        {item.casePrice?.toFixed(2)} лв.
                      </div>
                      <div className="text-[11px] text-slate-400">без ДДС / стек</div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleAdd(e, item)}
                      className="p-2 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white rounded-xl transition-all shadow-sm active:scale-95"
                      title="Добави стек в поръчката"
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <p className="text-sm font-medium text-slate-900">Няма открити артикули</p>
                <p className="text-xs text-slate-400 mt-1">Опитайте с друго име, категория или баркод.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveSearch;
