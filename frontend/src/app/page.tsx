"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  ShoppingBag, 
  Truck, 
  ShieldCheck, 
  CheckCircle2, 
  Plus, 
  Minus, 
  ArrowRight, 
  Zap, 
  Package, 
  Store, 
  Check, 
  Building2, 
  Lock, 
  Eye, 
  SlidersHorizontal, 
  Award, 
  Sparkles, 
  X, 
  PackagePlus, 
  ArrowUpRight,
  Tags
} from "lucide-react";
import HeaderAuthButton from "@/components/HeaderAuthButton";
import CartDrawer from "@/components/CartDrawer";
import LiveSearch from "@/components/LiveSearch";
import { useCart, CartProduct, getTieredPrice } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

const CATEGORY_TILES = [
  { id: "Напитки", name: "Безалкохолни & Енергийни", count: "32+ бранда", img: "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=500&q=80" },
  { id: "Снаксове", name: "Чипс, Ядки & Солети", count: "24+ бранда", img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&q=80" },
  { id: "Шоколади", name: "Шоколади & Вафли", count: "40+ бранда", img: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&q=80" },
  { id: "Кафе & Чай", name: "Кафе & Топли напитки", count: "18+ бранда", img: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&q=80" },
];

const FEATURED_BRANDS = [
  { 
    name: "Монделийз България", 
    tagline: "Milka, Oreo, Barni, Tuc", 
    category: "Шоколади & Сладки", 
    moq: 50, 
    badge: "Топ Марж +35%", 
    img: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600&q=80" 
  },
  { 
    name: "Ред Бул Дистрибуция", 
    tagline: "Red Bull Energy & Sugarfree", 
    category: "Енергийни напитки", 
    moq: 80, 
    badge: "Бързооборотни", 
    img: "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=600&q=80" 
  },
  { 
    name: "Интерснак България", 
    tagline: "Chio, Pom-Bär, Nutline", 
    category: "Снаксове & Ядки", 
    moq: 50, 
    badge: "Високо търсене", 
    img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&q=80" 
  },
  { 
    name: "Чипита България", 
    tagline: "7 Days Max, Bake Rolls, Fineti", 
    category: "Тестени & Кроасани", 
    moq: 50, 
    badge: "Заводски цени", 
    img: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&q=80" 
  },
];

export default function HomePage() {
  const { items: cartItems, addToCart, setIsCartOpen } = useCart();
  const { user, setIsAuthOpen } = useAuth();
  const isSupplier = user?.role === "supplier";
  
  const [products, setProducts] = useState<CartProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [filterType, setFilterType] = useState<"all" | "local" | "low_min" | "top_brand">("all");
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
        console.error("Грешка при зареждане:", e);
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
      
      let matchesFilter = true;
      if (filterType === "local") {
        matchesFilter = p.supplierName.includes("България") || p.supplierName.includes("ЕАД") || p.supplierName.includes("ООД");
      } else if (filterType === "low_min") {
        matchesFilter = (p.supplierMinimum || 50) <= 50;
      } else if (filterType === "top_brand") {
        matchesFilter = p.supplierName.includes("Кока-Кола") || p.supplierName.includes("Ред Бул") || p.supplierName.includes("Монделийз");
      }

      return matchesCat && matchesSearch && matchesFilter;
    });
  }, [products, selectedCategory, searchTerm, filterType]);

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
    if (isSupplier) {
      alert("Като производител можете да управлявате артикулите си през Доставчик Панела.");
      return;
    }
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
        <span>Директни заводски цени на стекове &bull; -5% за 5+ стека &bull; -10% за 10+ стека &bull; Net 60 условия</span>
      </div>

      {/* 2. НАВИГАЦИЯ */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-white font-black text-xl shadow-md">
              O
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-slate-950">
                OPTOM<span className="text-emerald-600">.BG</span>
              </span>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest -mt-1">B2B FMCG Маркетплейс</p>
            </div>
          </Link>

          <div className="hidden md:flex flex-1 max-w-lg mx-4">
            <LiveSearch />
          </div>

          <div className="flex items-center gap-3">
            <HeaderAuthButton />

            {!isSupplier && (
              <button
                onClick={() => user ? setIsCartOpen(true) : setIsAuthOpen(true)}
                className="relative flex items-center gap-2 px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer hover:scale-105"
              >
                {user ? <ShoppingBag className="w-4 h-4" /> : <Lock className="w-4 h-4 text-emerald-400" />}
                <span className="hidden sm:inline">Количка</span>
                {user && totalCartCases > 0 && (
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 text-[11px] font-black flex items-center justify-center shadow">
                    {totalCartCases}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 3. HERO СЕКЦИЯ */}
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
              Директна дистрибуция на стекове с напитки, пакетирани храни, снаксове и кафе. Автоматични отстъпки за количество, ДДС фактури и отложено плащане Net 60 дни.
            </p>
            
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button 
                onClick={() => {
                  const el = document.getElementById("catalog-section");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-6 py-3.5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-lg flex items-center gap-2"
              >
                Разгледай каталога <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="relative mt-8 md:mt-0 max-w-md w-full flex justify-center">
            <div className="relative w-full aspect-4/3 rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-100">
              <img 
                src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80" 
                alt="FMCG Warehouse" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 4. КАТАЛОГ С ПРОДУКТИ */}
      <section id="catalog-section" className="max-w-7xl mx-auto px-4 sm:px-8 py-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 border-b border-slate-200 pb-4">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Каталог на едро</span>
            <h2 className="text-2xl font-black text-slate-950 tracking-tight mt-0.5">
              Всички налични артикули
            </h2>
          </div>
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
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((p) => {
              const qty = quantities[p.id] || 1;
              const { effectivePrice, discountPercent } = getTieredPrice(p, qty);
              const retailTotalPerCase = p.rrpPrice * p.unitsPerCase;
              const profitPerCase = Math.max(0, retailTotalPerCase - effectivePrice);
              const marginPercent = retailTotalPerCase > 0 ? Math.round((profitPerCase / retailTotalPerCase) * 100) : 0;
              const unitWholesale = effectivePrice / (p.unitsPerCase || 1);

              const hasDiscounts = p.hasTieredDiscount !== false && p.has_tiered_discount !== false;
              const t1Q = p.tier1Qty || p.tier1_qty || 5;
              const t1D = p.tier1Discount || p.tier1_discount || 5.0;
              const t2Q = p.tier2Qty || p.tier2_qty || 10;
              const t2D = p.tier2Discount || p.tier2_discount || 10.0;

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
                        <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                          <span className="bg-emerald-600 text-white font-black text-[10px] px-2 py-0.5 rounded-md shadow-sm">
                            +{marginPercent}% Марж
                          </span>
                          {discountPercent > 0 && (
                            <span className="bg-slate-950 text-emerald-400 font-extrabold text-[9px] px-1.5 py-0.5 rounded shadow flex items-center gap-1">
                              <Tags className="w-2.5 h-2.5" /> -{discountPercent}% обем
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="absolute top-3 right-3 bg-slate-900 text-white font-bold text-[9px] px-2 py-0.5 rounded-md shadow-sm flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5 text-emerald-400" /> B2B Марж
                        </span>
                      )}

                      <Link
                        href={`/brand/${encodeURIComponent(p.supplierName)}`}
                        className="absolute bottom-3 left-3 bg-white/95 hover:bg-slate-900 hover:text-white text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200 transition-colors shadow-xs"
                      >
                        {p.supplierName} &rarr;
                      </Link>
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
                              <div className="text-right">
                                {discountPercent > 0 && (
                                  <span className="line-through text-slate-400 text-[11px] mr-1.5 font-mono">
                                    {p.casePrice.toFixed(2)}
                                  </span>
                                )}
                                <span className={`font-black font-mono text-sm ${discountPercent > 0 ? "text-emerald-700 font-extrabold" : "text-slate-950"}`}>
                                  {effectivePrice.toFixed(2)} лв.
                                </span>
                              </div>
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

                          {/* Обемни ценови нива бадж */}
                          {hasDiscounts && (
                            <div className="flex items-center justify-between text-[10px] font-semibold text-emerald-800 bg-emerald-50/80 border border-emerald-200 px-2 py-1 rounded-lg">
                              <span>{t1Q}+ бр. (-{t1D}%)</span>
                              <span>{t2Q}+ бр. (-{t2D}%)</span>
                            </div>
                          )}

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
                      isSupplier ? (
                        <Link
                          href="/supplier"
                          className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                        >
                          <PackagePlus className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Управлявай в панела</span>
                        </Link>
                      ) : (
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
                                <ShoppingBag className="w-3.5 h-3.5" /> Добави {(qty * effectivePrice).toFixed(2)} лв.
                              </>
                            )}
                          </button>
                        </div>
                      )
                    ) : (
                      <button
                        onClick={() => setIsAuthOpen(true)}
                        className="w-full py-2.5 px-3 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer hover:scale-[1.02]"
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
      </section>

      <CartDrawer />
    </div>
  );
}
