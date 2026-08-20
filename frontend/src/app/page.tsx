"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  Search, 
  ShoppingBag, 
  TrendingUp, 
  Truck, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Plus, 
  Minus, 
  ArrowRight,
  Zap,
  Star,
  ChevronRight,
  Package,
  Layers,
  Sparkles,
  Store,
  Check
} from "lucide-react";
import HeaderAuthButton from "@/components/HeaderAuthButton";
import CartDrawer from "@/components/CartDrawer";
import { useCart, CartProduct } from "@/context/CartContext";

const CATEGORY_TILES = [
  { id: "Напитки", name: "Напитки & Води", count: "32+ марки", img: "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=500&q=80" },
  { id: "Снаксове", name: "Чипс & Ядки", count: "24+ марки", img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&q=80" },
  { id: "Шоколади", name: "Шоколади & Вафли", count: "40+ марки", img: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&q=80" },
  { id: "Кафе & Чай", name: "Кафе & Топли напитки", count: "18+ марки", img: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&q=80" },
];

const RECENT_PURCHASES = [
  { store: "Супермаркет „Надежда 4“", city: "гр. София", item: "10 стека Coca-Cola 330ml", time: "преди 2 мин." },
  { store: "Минимаркет „Детелина“", city: "гр. Пловдив", item: "6 стека Chio Паприка 140g", time: "преди 5 мин." },
  { store: "Денонощен магазин „Авангард“", city: "гр. Варна", item: "8 стека Red Bull 250ml", time: "преди 8 мин." },
  { store: "Хранителни стоки „Централ“", city: "гр. Бургас", item: "15 стека Milka Alpine Milk", time: "преди 12 мин." },
];

export default function HomePage() {
  const { items: cartItems, addToCart, setIsCartOpen } = useCart();
  
  const [products, setProducts] = useState<CartProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addedAnimation, setAddedAnimation] = useState<string | null>(null);

  // Жив таймер за FOMO промо банера
  const [timeLeft, setTimeLeft] = useState({ hours: 14, minutes: 32, seconds: 45 });
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 24, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Social Proof попъп за увеличаване на продажбите
  const [toastIndex, setToastIndex] = useState(0);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const initialDelay = setTimeout(() => setShowToast(true), 3000);
    const interval = setInterval(() => {
      setShowToast(false);
      setTimeout(() => {
        setToastIndex((prev) => (prev + 1) % RECENT_PURCHASES.length);
        setShowToast(true);
      }, 1500);
    }, 12000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, []);

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
    const fetchProducts = async () => {
      setLoading(true);
      const baseUrl = getApiBaseUrl();
      try {
        const res = await fetch(`${baseUrl}/api/products`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data);
        }
      } catch (e) {
        console.error("Грешка при зареждане на каталога:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const totalCartCases = cartItems.reduce((sum, item) => sum + item.quantityCases, 0);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = selectedCategory === "all" || p.category.toLowerCase().includes(selectedCategory.toLowerCase());
      const matchesSearch = 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode.includes(searchTerm);
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchTerm]);

  const handleQtyChange = (productId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[productId] || 1;
      const updated = Math.max(1, current + delta);
      return { ...prev, [productId]: updated };
    });
  };

  const handleAdd = (product: CartProduct) => {
    const cases = quantities[product.id] || 1;
    addToCart(product, cases);
    setAddedAnimation(product.id);
    setTimeout(() => setAddedAnimation(null), 1200);
  };

  return (
    <div className="min-h-screen bg-[#FCFCFC] text-slate-800 antialiased selection:bg-amber-700 selection:text-white">
      
      {/* 1. TOP ANNOUNCEMENT BAR */}
      <div className="bg-[#1A1A1A] text-white text-[11px] font-semibold py-2 px-4 text-center tracking-wide flex items-center justify-center gap-2">
        <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-black text-[10px] uppercase">B2B Промо</span>
        <span>Безплатна палетна доставка до вашия обект за заявки над 300 лв. &bull; Net 60 условия</span>
      </div>

      {/* 2. НАВИГАЦИОНЕН ХЕДЪР */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between gap-6">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white font-black text-xl shadow-md shadow-amber-600/20 group-hover:scale-105 transition-all">
              O
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-slate-900">
                OPTOM<span className="text-amber-600">.BG</span>
              </span>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest -mt-1">Директни доставки на едро</p>
            </div>
          </Link>

          {/* Търсене */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Търси продукт, марка, вносител или баркод..."
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-600 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
            </div>
          </div>

          {/* Бутони за профил и количка */}
          <div className="flex items-center gap-3">
            <HeaderAuthButton />

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer hover:scale-105"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Количка</span>
              {totalCartCases > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[11px] font-black flex items-center justify-center shadow">
                  {totalCartCases}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 3. HERO СЕКЦИЯ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <div className="relative rounded-3xl bg-[#F4F1EA] border border-amber-900/10 overflow-hidden min-h-[420px] flex flex-col md:flex-row items-center justify-between p-8 sm:p-14 shadow-sm">
          
          <div className="max-w-xl z-10 space-y-5 text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-900 text-xs font-bold uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 fill-amber-600 text-amber-600" /> Официален B2B Портал
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
              Зареждай рафтовете с <span className="text-amber-700">директни цени</span> от производител
            </h1>
            <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed">
              Свързваме супермаркети, квартални магазини и заведения директно с официалните фабрики. Поръчвай стекове с отложено плащане и гарантиран търговски марж.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button 
                onClick={() => {
                  const el = document.getElementById("catalog-section");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-6 py-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-amber-600/25 flex items-center gap-2 transition-all cursor-pointer hover:gap-3"
              >
                Разгледай каталога <ArrowRight className="w-4 h-4" />
              </button>
              <Link
                href="/supplier"
                className="px-5 py-3.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold transition-all"
              >
                Вход за Производители &rarr;
              </Link>
            </div>
          </div>

          <div className="relative mt-8 md:mt-0 max-w-md w-full flex justify-center">
            <img 
              src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80" 
              alt="B2B Supply" 
              className="rounded-2xl shadow-2xl object-cover aspect-4/3 w-full border-4 border-white transform md:rotate-2 hover:rotate-0 transition-transform duration-300"
            />
          </div>
        </div>
      </section>

      {/* 4. BROWSE THE RANGE (Категории) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-10">
        <div className="text-center max-w-lg mx-auto mb-8 space-y-1">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Категории за зареждане</h2>
          <p className="text-xs text-slate-500">Изберете категория за филтриране на офертите на едро</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {CATEGORY_TILES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <div 
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(isSelected ? "all" : cat.id);
                  document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth" });
                }}
                className={`group cursor-pointer rounded-2xl overflow-hidden bg-white border transition-all duration-300 p-3 flex flex-col items-center text-center ${
                  isSelected 
                    ? "border-amber-600 shadow-md ring-2 ring-amber-500/20" 
                    : "border-slate-100 hover:border-slate-300 shadow-xs hover:shadow-md"
                }`}
              >
                <div className="w-full aspect-4/3 rounded-xl overflow-hidden bg-slate-100 mb-3">
                  <img 
                    src={cat.img} 
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                  />
                </div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors">{cat.name}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{cat.count}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. FLASH DEAL BANNER С ЖИВ ТАЙМЕР */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
        <div className="rounded-3xl bg-[#111827] text-white p-8 sm:p-12 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl">
          <div className="space-y-4 max-w-lg">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-[10px] tracking-wider uppercase">
              Седмична B2B Кампания
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              Ексклузивен марж до 35% за стекове безалкохолни & енергийни
            </h2>
            <p className="text-xs text-slate-400">
              Специални заводски квоти за магазини. Офертата важи до изчерпване на промоционалните количества.
            </p>

            {/* Жив брояч */}
            <div className="flex items-center gap-3 pt-2">
              <div className="bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2 text-center min-w-[60px]">
                <span className="text-xl font-black font-mono text-amber-400">{String(timeLeft.hours).padStart(2, '0')}</span>
                <p className="text-[9px] uppercase text-slate-400">Часа</p>
              </div>
              <span className="text-xl font-bold text-slate-600">:</span>
              <div className="bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2 text-center min-w-[60px]">
                <span className="text-xl font-black font-mono text-amber-400">{String(timeLeft.minutes).padStart(2, '0')}</span>
                <p className="text-[9px] uppercase text-slate-400">Мин</p>
              </div>
              <span className="text-xl font-bold text-slate-600">:</span>
              <div className="bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2 text-center min-w-[60px]">
                <span className="text-xl font-black font-mono text-amber-400">{String(timeLeft.seconds).padStart(2, '0')}</span>
                <p className="text-[9px] uppercase text-slate-400">Сек</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <img 
              src="https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=600&q=80" 
              alt="Promo Pack" 
              className="w-72 h-72 object-cover rounded-2xl border-4 border-slate-800 shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* 6. КАТАЛОГ С ПРОДУКТИ */}
      <section id="catalog-section" className="max-w-7xl mx-auto px-4 sm:px-8 py-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Каталог на едро</span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              {selectedCategory === "all" ? "Всички налични артикули" : selectedCategory}
            </h2>
          </div>
          {selectedCategory !== "all" && (
            <button
              onClick={() => setSelectedCategory("all")}
              className="text-xs font-bold text-amber-700 hover:underline cursor-pointer"
            >
              Покажи всички артикули &rarr;
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs text-slate-500 font-semibold">Зареждане на каталога с цени...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-slate-100 p-8 shadow-xs">
            <Package className="w-12 h-12 stroke-1 mx-auto text-slate-300 mb-3" />
            <h3 className="text-sm font-bold text-slate-800">Няма намерени артикули</h3>
            <p className="text-xs text-slate-400 mt-1">Опитайте с друго търсене или изчистете избраната категория.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((p) => {
              const qty = quantities[p.id] || 1;
              const retailTotalPerCase = p.rrpPrice * p.unitsPerCase;
              const profitPerCase = Math.max(0, retailTotalPerCase - p.casePrice);
              const marginPercent = retailTotalPerCase > 0 ? Math.round((profitPerCase / retailTotalPerCase) * 100) : 0;
              const unitWholesale = p.casePrice / (p.unitsPerCase || 1);

              return (
                <div 
                  key={p.id}
                  className="group bg-white rounded-2xl border border-slate-200/80 hover:border-amber-600/50 transition-all duration-200 shadow-xs hover:shadow-xl flex flex-col justify-between overflow-hidden"
                >
                  <div>
                    {/* Снимка с марж бадж */}
                    <div className="relative aspect-square bg-[#FBFBFB] p-4 flex items-center justify-center overflow-hidden border-b border-slate-100">
                      <img 
                        src={p.imageUrl} 
                        alt={p.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      
                      {/* Марж бадж */}
                      <span className="absolute top-3 right-3 bg-emerald-600 text-white font-black text-[10px] px-2 py-0.5 rounded-md shadow-sm">
                        +{marginPercent}% Марж
                      </span>

                      {/* Етикет за производител */}
                      <span className="absolute bottom-3 left-3 bg-white/95 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200">
                        {p.supplierName}
                      </span>
                    </div>

                    {/* Данни за артикула */}
                    <div className="p-4 space-y-3">
                      <h3 className="text-xs font-bold text-slate-900 line-clamp-2 h-8 leading-snug">
                        {p.name}
                      </h3>

                      {/* Ценова табличка */}
                      <div className="bg-slate-50 rounded-xl p-2.5 space-y-1 text-xs border border-slate-100">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 text-[11px]">Стек ({p.unitsPerCase} бр.):</span>
                          <span className="font-black text-slate-900 font-mono text-sm">{p.casePrice.toFixed(2)} лв.</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-400">Едрова за 1 бр.:</span>
                          <span className="font-semibold text-slate-600 font-mono">{unitWholesale.toFixed(2)} лв.</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-200/60">
                          <span className="text-slate-400">Препор. цена:</span>
                          <span className="font-bold text-emerald-700 font-mono">{p.rrpPrice.toFixed(2)} лв.</span>
                        </div>
                      </div>

                      {/* Чиста печалба */}
                      <div className="flex items-center justify-between text-[11px] text-emerald-700 font-bold px-1">
                        <span>Печалба от стек:</span>
                        <span className="font-mono">+{profitPerCase.toFixed(2)} лв.</span>
                      </div>
                    </div>
                  </div>

                  {/* Контрол за количество + Добавяне */}
                  <div className="p-4 pt-0">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                        <button
                          onClick={() => handleQtyChange(p.id, -1)}
                          className="w-6 h-6 flex items-center justify-center rounded text-slate-600 hover:bg-white transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold font-mono text-slate-900">{qty}</span>
                        <button
                          onClick={() => handleQtyChange(p.id, 1)}
                          className="w-6 h-6 flex items-center justify-center rounded text-slate-600 hover:bg-white transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => handleAdd(p)}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          addedAnimation === p.id
                            ? "bg-emerald-600 text-white"
                            : "bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
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
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 7. TRUST BANNER FOOTER */}
      <section className="bg-white border-t border-slate-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
            <div className="flex items-start gap-4 justify-center md:justify-start">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Бърза палетна логистика</h4>
                <p className="text-xs text-slate-500 mt-1">Доставки в цяла България директно до рафта на обекта в рамките на 24-48 часа.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 justify-center md:justify-start">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">100% Оригинални продукти</h4>
                <p className="text-xs text-slate-500 mt-1">Директно от официалните производители и вносители със сертификати за качество.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 justify-center md:justify-start">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Автоматични ДДС фактури</h4>
                <p className="text-xs text-slate-500 mt-1">Моментално генериране на електронни фактури по ЗДДС с възможност за Net 60 отсрочка.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#111827] text-white py-12 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-slate-800 pb-8 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white font-bold text-sm">
              O
            </div>
            <div>
              <span className="font-bold text-white text-sm">OPTOM.BG</span>
              <p className="text-[10px] text-slate-400">Национален маркетплейс за търговия на едро</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-slate-400">
            <Link href="/supplier" className="hover:text-white transition-colors">Портал за доставчици</Link>
            <Link href="/orders" className="hover:text-white transition-colors">Моите фактури</Link>
            <span>Всички цени са без включен ДДС</span>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 text-center text-slate-500 text-[11px]">
          &copy; 2026 OPTOM.BG. Всички права запазени.
        </div>
      </footer>

      {/* 8. LIVE SOCIAL PROOF TOAST (Доказано повишава поръчките) */}
      {showToast && (
        <div className="fixed bottom-6 left-6 z-50 bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xl max-w-xs flex items-center gap-3 animate-in slide-in-from-bottom duration-300">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-slate-900 truncate">
              {RECENT_PURCHASES[toastIndex].store}
            </p>
            <p className="text-[10px] text-slate-500 truncate">
              Зареди {RECENT_PURCHASES[toastIndex].item}
            </p>
            <span className="text-[9px] text-slate-400">{RECENT_PURCHASES[toastIndex].city} &bull; {RECENT_PURCHASES[toastIndex].time}</span>
          </div>
        </div>
      )}

      <CartDrawer />
    </div>
  );
}
