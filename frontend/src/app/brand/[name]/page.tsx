"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ChevronLeft, 
  Building2, 
  MapPin, 
  ShieldCheck, 
  Star, 
  Package, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Check, 
  Lock,
  Truck,
  Sparkles
} from "lucide-react";
import HeaderAuthButton from "@/components/HeaderAuthButton";
import CartDrawer from "@/components/CartDrawer";
import { useCart, CartProduct } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

export default function BrandPage() {
  const params = useParams();
  const router = useRouter();
  const rawBrandName = params?.name ? decodeURIComponent(params.name as string) : "";

  const { items: cartItems, addToCart, setIsCartOpen } = useCart();
  const { user, setIsAuthOpen } = useAuth();

  const [products, setProducts] = useState<CartProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addedAnimation, setAddedAnimation] = useState<string | null>(null);

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
    const fetchBrandProducts = async () => {
      setLoading(true);
      const baseUrl = getApiBaseUrl();
      try {
        const res = await fetch(`${baseUrl}/api/products`);
        if (res.ok) {
          const data: CartProduct[] = await res.json();
          const filtered = data.filter(
            (p) => p.supplierName.toLowerCase() === rawBrandName.toLowerCase()
          );
          setProducts(filtered);
        }
      } catch (err) {
        console.error("Грешка при зареждане на бранда:", err);
      } finally {
        setLoading(false);
      }
    };

    if (rawBrandName) {
      fetchBrandProducts();
    }
  }, [rawBrandName]);

  const brandMinimum = products[0]?.supplierMinimum || 50.0;
  const totalCartCases = cartItems.reduce((sum, item) => sum + item.quantityCases, 0);

  const handleQtyChange = (productId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[productId] || 1;
      const updated = Math.max(1, current + delta);
      return { ...prev, [productId]: updated };
    });
  };

  const handleAddOrAuth = (product: CartProduct) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    const cases = quantities[product.id] || 1;
    addToCart(product, cases);
    setAddedAnimation(product.id);
    setTimeout(() => setAddedAnimation(null), 1200);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased">
      {/* Хедър */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Link 
              href="/"
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Каталог
            </Link>
            <div className="h-4 w-px bg-slate-200" />
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center text-white font-black text-sm">
                O
              </div>
              <span className="text-xl font-black tracking-tight text-slate-950">
                OPTOM<span className="text-emerald-600">.BG</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <HeaderAuthButton />
            <button
              onClick={() => (user ? setIsCartOpen(true) : setIsAuthOpen(true))}
              className="relative flex items-center gap-2 px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              {user ? <ShoppingBag className="w-4 h-4" /> : <Lock className="w-4 h-4 text-emerald-400" />}
              <span className="hidden sm:inline">Количка</span>
              {user && totalCartCases > 0 && (
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 text-[11px] font-black flex items-center justify-center shadow">
                  {totalCartCases}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Brand Hero Banner */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-3xl font-black shadow-lg">
                {rawBrandName.charAt(0) || "B"}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-950">{rawBrandName}</h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200">
                    <ShieldCheck className="w-3 h-3" /> Проверен Доставчик
                  </span>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-3">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> България</span>
                  <span>&bull;</span>
                  <span>Официален дистрибуционен център</span>
                </p>
              </div>
            </div>

            {/* Бранд условия (MOQ & Delivery) */}
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl">
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-slate-400">Минимум за поръчка</p>
                <p className="text-sm font-black text-slate-900">{brandMinimum.toFixed(2)} лв.</p>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-slate-400">Логистика</p>
                <p className="text-sm font-black text-emerald-600">24-48ч палетна</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Каталог на бранда */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-10">
        <div className="mb-6">
          <h2 className="text-lg font-black text-slate-950">Портфолио на производителя ({products.length} артикула)</h2>
          <p className="text-xs text-slate-500">Всички налични стекове с директни заводски квоти</p>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-3 border-slate-950 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs text-slate-500 font-semibold">Зареждане на артикулите...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8">
            <Package className="w-12 h-12 stroke-1 mx-auto text-slate-300 mb-3" />
            <h3 className="text-sm font-bold text-slate-800">Няма намерени продукти за този бранд</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((p) => {
              const qty = quantities[p.id] || 1;
              const retailTotalPerCase = p.rrpPrice * p.unitsPerCase;
              const profitPerCase = Math.max(0, retailTotalPerCase - p.casePrice);
              const marginPercent = retailTotalPerCase > 0 ? Math.round((profitPerCase / retailTotalPerCase) * 100) : 0;
              const unitWholesale = p.casePrice / (p.unitsPerCase || 1);

              return (
                <div 
                  key={p.id}
                  className="group bg-white rounded-2xl border border-slate-200 hover:border-slate-950 transition-all duration-200 shadow-xs hover:shadow-xl flex flex-col justify-between overflow-hidden"
                >
                  <div>
                    <div className="relative aspect-square bg-[#FAFAFA] p-4 flex items-center justify-center overflow-hidden border-b border-slate-100">
                      <img 
                        src={p.imageUrl} 
                        alt={p.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      {user ? (
                        <span className="absolute top-3 right-3 bg-emerald-600 text-white font-black text-[10px] px-2 py-0.5 rounded-md shadow-sm">
                          +{marginPercent}% Марж
                        </span>
                      ) : (
                        <span className="absolute top-3 right-3 bg-slate-900 text-white font-bold text-[9px] px-2 py-0.5 rounded-md shadow-sm flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5 text-emerald-400" /> B2B Марж
                        </span>
                      )}
                    </div>

                    <div className="p-4 space-y-3">
                      <div>
                        <h3 className="text-xs font-bold text-slate-950 line-clamp-2 h-8 leading-snug">
                          {p.name}
                        </h3>
                        {!user && (
                          <p className="text-[11px] text-slate-500 mt-1 font-medium">
                            Опаковка: Стек от {p.unitsPerCase} бр.
                          </p>
                        )}
                      </div>

                      {user && (
                        <>
                          <div className="bg-slate-50 rounded-xl p-2.5 space-y-1 text-xs border border-slate-100">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 text-[11px]">Стек ({p.unitsPerCase} бр.):</span>
                              <span className="font-black text-slate-950 font-mono text-sm">{p.casePrice.toFixed(2)} лв.</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-slate-400">Едрова за 1 бр.:</span>
                              <span className="font-semibold text-slate-600 font-mono">{unitWholesale.toFixed(2)} лв.</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-200">
                              <span className="text-slate-400">Препор. цена:</span>
                              <span className="font-bold text-emerald-700 font-mono">{p.rrpPrice.toFixed(2)} лв.</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-emerald-700 font-bold px-1">
                            <span>Печалба от стек:</span>
                            <span className="font-mono font-black">+{profitPerCase.toFixed(2)} лв.</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    {user ? (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                          <button
                            onClick={() => handleQtyChange(p.id, -1)}
                            className="w-6 h-6 flex items-center justify-center rounded text-slate-600 hover:bg-white transition-colors cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold font-mono text-slate-900">{qty}</span>
                          <button
                            onClick={() => handleQtyChange(p.id, 1)}
                            className="w-6 h-6 flex items-center justify-center rounded text-slate-600 hover:bg-white transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <button
                          onClick={() => handleAddOrAuth(p)}
                          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                            addedAnimation === p.id
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-950 hover:bg-slate-800 text-white shadow-sm"
                          }`}
                        >
                          {addedAnimation === p.id ? (
                            <>
                              <Check className="w-4 h-4 stroke-[3]" /> Добавено
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="w-3.5 h-3.5" /> Добави {(qty * p.casePrice).toFixed(2)} лв.
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsAuthOpen(true)}
                        className="w-full py-2.5 px-3 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Показване на цените</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <CartDrawer />
    </div>
  );
}
