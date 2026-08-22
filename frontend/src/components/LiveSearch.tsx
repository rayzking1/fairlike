"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, X, ShoppingCart, Loader2, Package, ScanBarcode, Check } from "lucide-react";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";
import { useCart, CartProduct } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

interface Product {
  id: string;
  name: string;
  category: string;
  barcode: string;
  supplierName: string;
  supplierMinimum?: number;
  unitsPerCase: number;
  casePrice: number;
  rrpPrice: number;
  imageUrl?: string;
  inStock?: boolean;
}

export default function LiveSearch() {
  const { addToCart } = useCart();
  const { user, setIsAuthOpen } = useAuth();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerNotification, setScannerNotification] = useState<string | null>(null);

  const searchRef = useRef<HTMLDivElement>(null);

  const getApiBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
    if (typeof window !== 'undefined') {
      const currentHost = window.location.hostname;
      if (currentHost.includes('-3000.app.github.dev')) {
        return `https://${currentHost.replace('-3000.app.github.dev', '-8000.app.github.dev')}`;
      }
    }
    return "https://fairlike.onrender.com";
  };

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
        const baseUrl = getApiBaseUrl();
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
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    const cartProd: CartProduct = {
      id: item.id,
      name: item.name,
      category: item.category,
      barcode: item.barcode,
      supplierName: item.supplierName || "Официален Дистрибутор",
      supplierMinimum: item.supplierMinimum || 50,
      unitsPerCase: item.unitsPerCase || 24,
      casePrice: item.casePrice,
      rrpPrice: item.rrpPrice,
      imageUrl: item.imageUrl || "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&q=80"
    };

    addToCart(cartProd, 1);
  };

  const handleBarcodeScan = async (scannedBarcode: string) => {
    const cleanedCode = scannedBarcode.trim();
    if (!cleanedCode) return;

    setQuery(cleanedCode);
    const baseUrl = getApiBaseUrl();

    try {
      const res = await fetch(`${baseUrl}/api/products/search?q=${encodeURIComponent(cleanedCode)}`);
      if (res.ok) {
        const foundList: Product[] = await res.json();
        const matched = foundList.find((p) => p.barcode === cleanedCode) || foundList[0];

        if (matched) {
          const cartProd: CartProduct = {
            id: matched.id,
            name: matched.name,
            category: matched.category,
            barcode: matched.barcode,
            supplierName: matched.supplierName || "Официален Дистрибутор",
            supplierMinimum: matched.supplierMinimum || 50,
            unitsPerCase: matched.unitsPerCase || 24,
            casePrice: matched.casePrice,
            rrpPrice: matched.rrpPrice,
            imageUrl: matched.imageUrl || "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&q=80"
          };

          if (user) {
            addToCart(cartProd, 1);
            setScannerNotification(`Добавен: ${matched.name}`);
          } else {
            setScannerNotification(`Намерен: ${matched.name} (Влезте за поръчка)`);
          }
          setTimeout(() => setScannerNotification(null), 3500);
        } else {
          setScannerNotification(`Няма артикул с баркод ${cleanedCode}`);
          setTimeout(() => setScannerNotification(null), 3500);
        }
      }
    } catch (err) {
      console.error("Грешка при търсене по баркод:", err);
    }
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
          className="w-full pl-10 pr-20 py-2 bg-slate-100/90 hover:bg-slate-100 focus:bg-white text-slate-900 placeholder:text-slate-400 text-xs rounded-xl border border-transparent focus:border-slate-950 transition-all outline-none"
        />

        <div className="absolute right-2.5 flex items-center gap-1">
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); setResults([]); setIsOpen(false); }}
              className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            title="Сканирай баркод с камерата"
            className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-emerald-700 transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
          >
            <ScanBarcode className="h-4 w-4 text-emerald-600" />
            <span className="text-[10px] font-bold hidden sm:inline">Скенер</span>
          </button>
        </div>
      </div>

      {scannerNotification && (
        <div className="absolute top-full left-0 right-0 mt-2 p-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xl flex items-center gap-2 z-50 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 stroke-[3]" />
          <span className="truncate">{scannerNotification}</span>
        </div>
      )}

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in-0 duration-150">
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between text-xs text-slate-500 font-medium px-3">
            <span>Резултати от търсенето ({results.length})</span>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-950" />}
          </div>

          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
            {results.length > 0 ? (
              results.map((item) => (
                <div
                  key={item.id}
                  className="p-3 hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200/60 p-1 flex items-center justify-center">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
                      ) : (
                        <Package className="h-4 w-4 text-slate-300" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-700">{item.supplierName}</span>
                        <span>•</span>
                        <span>{item.unitsPerCase} бр./стек</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-black text-slate-900 font-mono">
                        {user ? `${item.casePrice.toFixed(2)} лв.` : "B2B цена"}
                      </div>
                      <div className="text-[9px] text-slate-400">без ДДС</div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleAddToCart(e, item)}
                      className="p-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl transition-all cursor-pointer"
                      title="Добави стек в заявката"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
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

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScan}
      />
    </div>
  );
}
