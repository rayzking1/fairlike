"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, X, ShoppingCart, Loader2, Package } from "lucide-react";

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

export default function LiveSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Debounce търсене директно към Backend API
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "https://fairlike.onrender.com";
        const res = await fetch(`${baseUrl}/api/products/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setIsOpen(true);
        }
      } catch (err) {
        console.error("Грешка при Live Search:", err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Затваряне при Click Outside или Esc
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

  const handleAddToCart = (e: React.MouseEvent, item: Product) => {
    e.stopPropagation();
    // Dispatch към глобалната количка
    window.dispatchEvent(new CustomEvent("optom:add-to-cart", { detail: item }));
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-lg">
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setIsOpen(true)}
          placeholder="Търси продукт, марка, баркод..."
          className="w-full pl-10 pr-10 py-2 bg-slate-100/90 hover:bg-slate-100 focus:bg-white text-slate-900 placeholder:text-slate-400 text-sm rounded-xl border border-transparent focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); setResults([]); setIsOpen(false); }}
            className="absolute right-3 p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in-0 duration-150">
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between text-xs text-slate-500 font-medium px-3">
            <span>Резултати от търсенето ({results.length})</span>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />}
          </div>

          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {results.length > 0 ? (
              results.map((item) => (
                <div
                  key={item.id}
                  className="p-3 hover:bg-slate-50 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200/60">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-300">
                          <Package className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-slate-900 truncate">
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span className="font-medium text-slate-700">{item.supplierName}</span>
                        <span>•</span>
                        <span>{item.unitsPerCase} бр./стек</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900">
                        {item.casePrice ? `${item.casePrice.toFixed(2)} лв.` : "-"}
                      </div>
                      <div className="text-[10px] text-slate-400">без ДДС</div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleAddToCart(e, item)}
                      className="p-2 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white rounded-xl transition-all active:scale-95"
                      title="Добави стек в поръчката"
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">
                {!loading && "Няма намерени артикули по това търсене."}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
