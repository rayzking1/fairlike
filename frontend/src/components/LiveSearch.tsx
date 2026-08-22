"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, X, ShoppingBag, Loader2, Package, ScanBarcode, Check } from "lucide-react";
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
            setScannerNotification(`Намерен: ${matched.name}`);
          }
          setTimeout(() => setScannerNotification(null), 3000);
        } else {
          setScannerNotification(`Няма намерен артикул`);
          setTimeout(() => setScannerNotification(null), 3000);
        }
      }
    } catch (err) {
      console.error("Грешка при скенер:", err);
    }
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-lg">
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 h-3.5 w-3.5 text-[#737373] pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setIsOpen(true)}
          placeholder="Търси продукт, марка или баркод..."
          className="w-full pl-9 pr-22 py-2 bg-[#FAF9F7] hover:bg-[#F2F0EB] focus:bg-white text-[#121212] placeholder:text-[#737373] text-xs rounded-md border border-[#EBE8E3] focus:border-[#121212] transition-all outline-none font-medium"
        />

        <div className="absolute right-2 flex items-center gap-1">
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); setResults([]); setIsOpen(false); }}
              className="p-1 rounded text-neutral-400 hover:text-[#121212] cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Изискан монохромен бутон за скенер */}
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            title="Сканирай баркод с камерата"
            className="px-2 py-1 bg-white border border-[#EBE8E3] hover:border-[#121212] text-[#121212] rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
          >
            <ScanBarcode className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Скенер</span>
          </button>
        </div>
      </div>

      {scannerNotification && (
        <div className="absolute top-full left-0 right-0 mt-2 p-2.5 bg-[#121212] text-white rounded-md text-xs font-semibold shadow-lg flex items-center gap-2 z-50 animate-in fade-in">
          <Check className="w-3.5 h-3.5 stroke-[3]" />
          <span className="truncate">{scannerNotification}</span>
        </div>
      )}

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-[#EBE8E3] overflow-hidden z-50 animate-in fade-in duration-100">
          <div className="p-2.5 border-b border-[#EBE8E3] bg-[#FAF9F7] flex items-center justify-between text-xs text-[#737373] font-medium px-3">
            <span>Резултати ({results.length})</span>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#121212]" />}
          </div>

          <div className="max-h-[320px] overflow-y-auto divide-y divide-[#F2F0EB]">
            {results.length > 0 ? (
              results.map((item) => (
                <div
                  key={item.id}
                  className="p-3 hover:bg-[#FAF9F7] flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-md bg-[#FAF9F7] overflow-hidden shrink-0 border border-[#EBE8E3] p-1 flex items-center justify-center">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
                      ) : (
                        <Package className="h-4 w-4 text-neutral-300" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-[#121212] truncate">
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#737373]">
                        <span>{item.supplierName}</span>
                        <span>•</span>
                        <span>{item.unitsPerCase} бр./стек</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-bold text-[#121212] font-mono">
                        {user ? `${item.casePrice.toFixed(2)} лв.` : "B2B цена"}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleAddToCart(e, item)}
                      className="p-1.5 bg-[#121212] hover:bg-neutral-800 text-white rounded-md transition-all cursor-pointer"
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-[#737373]">
                {!loading && "Няма намерени артикули."}
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
