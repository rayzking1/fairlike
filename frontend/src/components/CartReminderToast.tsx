"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, CheckCircle2 } from "lucide-react";
import { useCart, getTieredPrice } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function CartReminderToast() {
  const { items, isCartOpen, setIsCartOpen } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const targetBrand = useMemo(() => {
    if (items.length === 0) return null;

    const groups: Record<string, { name: string, total: number, min: number, images: string[] }> = {};
    items.forEach(it => {
      const { effectivePrice } = getTieredPrice(it.product, it.quantityCases);
      const lineTotal = effectivePrice * it.quantityCases;
      const sName = it.product.supplierName || "Официален Дистрибутор";

      if (!groups[sName]) {
        groups[sName] = { name: sName, total: 0, min: it.product.supplierMinimum || 50, images: [] };
      }
      groups[sName].total += lineTotal;
      if (!groups[sName].images.includes(it.product.imageUrl)) {
        groups[sName].images.push(it.product.imageUrl);
      }
    });

    const sorted = Object.values(groups).sort((a, b) => b.total - a.total);
    return sorted[0];
  }, [items]);

  useEffect(() => {
    if (items.length > 0 && !isCartOpen && !isDismissed && user?.role === "retailer") {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3500);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [items, isCartOpen, isDismissed, user]);

  useEffect(() => {
    if (items.length === 0) {
      setIsVisible(false);
      setIsDismissed(false);
    }
  }, [items]);

  if (!isVisible || !targetBrand) return null;

  const isMet = targetBrand.total >= targetBrand.min;
  const progress = Math.min(100, (targetBrand.total / targetBrand.min) * 100);
  const remaining = Math.max(0, targetBrand.min - targetBrand.total);

  return (
    <div className="fixed bottom-0 md:bottom-6 left-0 md:left-auto md:right-6 w-full md:w-[380px] bg-white rounded-t-2xl md:rounded-2xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.15)] md:shadow-2xl border border-[#EBE8E3] z-40 animate-in slide-in-from-bottom-8 duration-300 p-5 flex flex-col text-[#121212]">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-[17px] font-bold tracking-tight">Продължавате ли с този бранд?</h3>
        <button
          onClick={() => {
            setIsVisible(false);
            setIsDismissed(true);
          }}
          className="text-[#737373] hover:text-[#121212] transition-colors p-1 -mr-1 -mt-1"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-3.5 mb-4">
        <div className="w-12 h-12 rounded-full bg-[#FAF9F7] border border-[#EBE8E3] flex items-center justify-center text-[#121212] font-serif font-bold text-lg shrink-0 shadow-xs">
          {targetBrand.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold truncate leading-tight">{targetBrand.name}</h4>
          <p className="text-[11px] text-[#737373] mt-0.5">Общо артикули: <span className="text-[#121212] font-mono font-medium">{targetBrand.total.toFixed(2)} лв.</span></p>

          <div className="mt-2">
            <div className="flex items-center justify-between text-[10px] text-[#525252] mb-1.5">
              {isMet ? (
                <span className="font-semibold text-[#121212] flex items-center gap-1">
                  {targetBrand.min.toFixed(2)} лв. минимум е достигнат
                </span>
              ) : (
                <span>Остават още <strong className="text-[#121212] font-mono">{remaining.toFixed(2)} лв.</strong> до минимум</span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-[#EBE8E3] h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isMet ? "bg-[#4A7D59]" : "bg-[#121212]"}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              {isMet && <CheckCircle2 className="w-3.5 h-3.5 text-[#4A7D59] shrink-0" />}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-5">
        {targetBrand.images.slice(0, 4).map((img, i) => (
          <div key={i} className="w-10 h-10 rounded-md bg-[#FAF9F7] border border-[#EBE8E3] p-1 flex items-center justify-center overflow-hidden">
            <img src={img} alt="Thumb" className="max-w-full max-h-full object-contain" />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2.5">
        <button
          onClick={() => {
            setIsVisible(false);
            setIsDismissed(true);
            router.push(`/brand/${encodeURIComponent(targetBrand.name)}`);
          }}
          className="w-full py-2.5 bg-white border border-[#D5D1C8] hover:bg-[#FAF9F7] text-[#121212] rounded-md text-xs font-semibold transition-all shadow-2xs"
        >
          Към каталога на бранда
        </button>
        <button
          onClick={() => {
            setIsVisible(false);
            setIsCartOpen(true);
          }}
          className="w-full py-2.5 bg-[#262626] hover:bg-[#121212] text-white rounded-md text-xs font-semibold transition-all shadow-xs"
        >
          Виж количката
        </button>
      </div>
    </div>
  );
}
