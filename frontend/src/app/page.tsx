"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  Search, 
  ShoppingBag, 
  TrendingUp, 
  Truck, 
  ShieldCheck, 
  CheckCircle2, 
  Plus, 
  Minus, 
  ArrowRight,
  Zap,
  Package,
  Sparkles,
  Store,
  Check,
  CreditCard,
  Building2
} from "lucide-react";
import HeaderAuthButton from "@/components/HeaderAuthButton";
import CartDrawer from "@/components/CartDrawer";
import { useCart, CartProduct } from "@/context/CartContext";

const CATEGORY_TILES = [
  { id: "Напитки", name: "Безалкохолни & Енергийни", count: "32+ бранда", img: "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=500&q=80" },
  { id: "Снаксове", name: "Чипс, Ядки & Солети", count: "24+ бранда", img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&q=80" },
  { id: "Шоколади", name: "Шоколади & Вафли", count: "40+ бранда", img: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&q=80" },
  { id: "Кафе & Чай", name: "Кафе & Топли напитки", count: "18+ бранда", img: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&q=80" },
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

  // FOMO таймер за кампания
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

  // Social proof известия
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
    }, 14000);

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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased selection:bg-slate-900 selection:text-white">
      
      {/* 1. TOP ANNOUNCEMENT BAR */}
      <div className="bg-slate-950 text-white text-[11px] font-semibold py-2.5 px-4 text-center tracking-wide flex items-center justify-center gap-2 border-b border-slate-800">
        <span className="bg-white text-slate-950 px-2 py-0.5 rounded font-extrabold text-[10px] uppercase tracking-wider">B2B Платформа</span>
        <span>Директни заводски цени на стекове &bull; Безплатна палетна доставка над 300 лв. &bull; Net 60 условия</span>
      </div>

      {/* 2. НАВИГАЦИЯ (ЧИСТ MONOCHROME СТИЛ) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between gap-6">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-white font-black text-xl shadow-md group-hover:bg-slate-800 transition-all">
              O
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-slate-950">
                OPTOM<span className="text-emerald-600">.BG</span>
              </span>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest -mt-1">B2B FMCG Маркетплейс</p>
            </div>
          </Link>

          {/* Търсачка */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Търси продукт, марка, вносител или баркод..."
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-950 focus:bg-white focus:ring-2 focus:ring-slate-950/10 transition-all"
              />
            </div>
          </div>

          {/* Профил и Количка */}
          <div className="flex items-center gap-3">
            <HeaderAuthButton />

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer hover:scale-105"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Количка</span>
              {totalCartCases > 0 && (
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 text-[11px] font-black flex items-center justify-center shadow">
                  {totalCartCases}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 3. HERO СЕКЦИЯ - FMCG ПАКЕТИРАНИ СТОКИ & СКЛАД */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <div className="relative rounded-3xl bg-white border border-slate-200/80 overflow-hidden min-h-[440px] flex flex-col md:flex-row items-center justify-between p-8 sm:p-14 shadow-sm">
          
          <div className="max-w-xl z-10 space-y-5 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold tracking-wide">
              <Zap className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" /> Официален B2B Портал за презареждане
            </div>
            
            <h1 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight leading-[1.15]">
              Зареждай обекта с <span className="bg-gradient-to-r from-slate-950 via-slate-800 to-slate-700 bg-clip-text text-transparent underline decoration-emerald-500 decoration-4">заводски цени</span> на едро
            </h1>
            
            <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed">
              Директна дистрибуция на стекове с напитки, пакетирани храни, снаксове и кафе. Без прекупвачи, с автоматични ДДС фактури и отложено плащане Net 60 дни.
            </p>
            
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button 
                onClick={() => {
                  const el = document.getElementById("catalog-section");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-6 py-3.5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-lg shadow-slate-950/20 flex items-center gap-2 transition-all cursor-pointer hover:gap-3"
              >
                Разгледай каталога <ArrowRight className="w-4 h-4" />
              </button>
              
              <Link
                href="/supplier"
                className="px-5 py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Building2 className="w-4 h-4 text-slate-600" />
                Вход за Производители &rarr;
              </Link>
            </div>
          </div>

          {/* FMCG Складова визия вместо зеленчуци */}
          <div className="relative mt-8 md:mt-0 max-w-md w-full flex justify-center">
            <div className="relative w-full aspect-4/3 rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-100 group">
              <img 
                src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80" 
                alt="FMCG Warehouse & Wholesale Packs" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-5">
                <div className="text-white">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">Логистика & Дистрибуция</p>
                  <p className="text-xs font-bold">Стекове и палети на едро с 24-48ч доставка</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. КАТЕГОРИИ ЗА ЗАРЕЖДАНЕ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        <div className="text-center max-w-lg mx-auto mb-8 space-y-1">
          <h2 className="text-2xl font-black text-slate-950 tracking-tight">Категории за зареждане</h2>
          <p className="text-xs text-slate-500">Изберете категория за филтриране на стековете</p>
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
                className={`group cursor-pointer rounded-2xl overflow-hidden bg-white border transition-all duration-200 p-3 flex flex-col items-center text-center ${
                  isSelected 
                    ? "border-slate-950 shadow-md ring-2 ring-slate-950/20" 
                    : "border-slate-200 hover:border-slate-400 shadow-xs hover:shadow-md"
                }`}
              >
                <div className="w-full aspect-4/3 rounded-xl overflow-hidden bg-slate-100 mb-3">
                  <img 
                    src={cat.img} 
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                  />
                </div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-slate-950 transition-colors">{cat.name}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{cat.count}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. FLASH DEAL BANNER С ЖИВ ТАЙМЕР */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
        <div className="rounded-3xl bg-slate-950 text-white p-8 sm:p-12 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl border border-slate-800">
          <div className="space-y-4 max-w-lg">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-[10px] tracking-wider uppercase border border-emerald-500/30">
              Седмична B2B Кампания
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              Ексклузивен марж до 35% за стекове безалкохолни & енергийни напитки
            </h2>
            <p className="text-xs text-slate-400">
              Специални фабрични квоти за магазини и заведения. Офертата важи до изчерпване на промоционалните количества.
            </p>

            {/* Жив брояч */}
            <div className="flex items-center gap-3 pt-2">
              <div className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-center min-w-[60px]">
                <span className="text-xl font-black font-mono text-emerald-400">{String(timeLeft.hours).padStart(2, '0')}</span>
                <p className="text-[9px] uppercase text-slate-400 font-bold">Часа</p>
              </div>
              <span className="text-xl font-bold text-slate-600">:</span>
              <div className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-center min-w-[60px]">
                <span className="text-xl font-black font-mono text-emerald-400">{String(timeLeft.minutes).padStart(2, '0')}</span>
                <p className="text-[9px] uppercase text-slate-400 font-bold">Мин</p>
              </div>
              <span className="text-xl font-bold text-slate-600">:</span>
              <div className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-center min-w-[60px]">
                <span className="text-xl font-black font-mono text-emerald-400">{String(timeLeft.seconds).padStart(2, '0')}</span>
                <p className="text-[9px] uppercase text-slate-400 font-bold">Сек</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <img 
              src="https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600&q=80" 
              alt="Promo Pack FMCG" 
              className="w-72 h-72 object-cover rounded-2xl border-4 border-slate-800 shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* 6. КАТАЛОГ С ПРОДУКТИ */}
      <section id="catalog-section" className="max-w-7xl mx-auto px-4 sm:px-8 py-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 border-b border-slate-200 pb-4">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Каталог на едро</span>
            <h2 className="text-2xl font-black text-slate-950 tracking-tight mt-0.5">
              {selectedCategory === "all" ? "Всички налични артикули" : selectedCategory}
            </h2>
          </div>
          {selectedCategory !== "all" && (
            <button
              onClick={() => setSelectedCategory("all")}
              className="text-xs font-bold text-slate-950 hover:underline cursor-pointer"
            >
              Покажи всички артикули &rarr;
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-3 border-slate-950 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs text-slate-500 font-semibold">Зареждане на каталога с цени...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
            <Package className="w-12 h-12 stroke-1 mx-auto text-slate-400 mb-3" />
            <h3 className="text-sm font-bold text-slate-900">Няма намерени артикули</h3>
            <p className="text-xs text-slate-500 mt-1">Опитайте с друго търсене или изчистете избраната категория.</p>
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
                  className="group bg-white rounded-2xl border border-slate-200 hover:border-slate-950 transition-all duration-200 shadow-xs hover:shadow-xl flex flex-col justify-between overflow-hidden"
                >
                  <div>
                    {/* Снимка с марж бадж */}
                    <div className="relative aspect-square bg-[#FAFAFA] p-4 flex items-center justify-center overflow-hidden border-b border-slate-100">
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
                      <span className="absolute bottom-3 left-3 bg-white/95 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200">
                        {p.supplierName}
                      </span>
                    </div>

                    {/* Данни за артикула */}
                    <div className="p-4 space-y-3">
                      <h3 className="text-xs font-bold text-slate-950 line-clamp-2 h-8 leading-snug">
                        {p.name}
                      </h3>

                      {/* Ценова табличка */}
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

                      {/* Чиста печалба */}
                      <div className="flex items-center justify-between text-[11px] text-emerald-700 font-bold px-1">
                        <span>Печалба от стек:</span>
                        <span className="font-mono font-black">+{profitPerCase.toFixed(2)} лв.</span>
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
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 7. TRUST BANNER FOOTER */}
      <section className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
            <div className="flex items-start gap-4 justify-center md:justify-start">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-900 flex items-center justify-center shrink-0 border border-slate-200">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-950">Бърза палетна логистика</h4>
                <p className="text-xs text-slate-500 mt-1">Доставки в цяла България директно до рафта на обекта в рамките на 24-48 часа.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 justify-center md:justify-start">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-950">100% Оригинални продукти</h4>
                <p className="text-xs text-slate-500 mt-1">Директно от официалните фабрики и вносители със сертификати за произход.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 justify-center md:justify-start">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-900 flex items-center justify-center shrink-0 border border-slate-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-950">Автоматични ДДС фактури</h4>
                <p className="text-xs text-slate-500 mt-1">Моментално генериране на електронни фактури по ЗДДС с Net 60 отсрочка.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-white py-12 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-slate-800 pb-8 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white text-slate-950 flex items-center justify-center font-bold text-sm">
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

      {/* 8. LIVE SOCIAL PROOF TOAST */}
      {showToast && (
        <div className="fixed bottom-6 left-6 z-50 bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xl max-w-xs flex items-center gap-3 animate-in slide-in-from-bottom duration-300">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-slate-950 truncate">
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
