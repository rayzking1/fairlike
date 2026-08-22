"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  ShoppingBag, 
  ArrowRight, 
  Package, 
  Check, 
  Lock, 
  Eye, 
  ArrowUpRight,
  Plus,
  Minus
} from "lucide-react";
import HeaderAuthButton from "@/components/HeaderAuthButton";
import CartDrawer from "@/components/CartDrawer";
import LiveSearch from "@/components/LiveSearch";
import { useCart, CartProduct, getTieredPrice } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

const CATEGORY_TILES = [
  { id: "Напитки", name: "Безалкохолни & Енергийни", subtitle: "Стекове и кенове", img: "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=500&q=80" },
  { id: "Снаксове", name: "Чипс, Ядки & Солети", subtitle: "Бързооборотни", img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&q=80" },
  { id: "Шоколади", name: "Шоколади & Вафли", subtitle: "Импулсни стоки", img: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&q=80" },
  { id: "Кафе & Чай", name: "Кафе & Топли напитки", subtitle: "HoReCa & Retail", img: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&q=80" },
];

const FEATURED_BRANDS = [
  { 
    name: "Монделийз България", 
    tagline: "Milka, Oreo, Barni, Tuc", 
    category: "Шоколади & Сладки", 
    moq: 50, 
    badge: "+35% Марж", 
    img: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600&q=80" 
  },
  { 
    name: "Ред Бул Дистрибуция", 
    tagline: "Red Bull Energy & Sugarfree", 
    category: "Енергийни напитки", 
    moq: 80, 
    badge: "Високо търсене", 
    img: "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=600&q=80" 
  },
  { 
    name: "Интерснак България", 
    tagline: "Chio, Pom-Bär, Nutline", 
    category: "Снаксове & Ядки", 
    moq: 50, 
    badge: "Директен внос", 
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

  // Фино и плавно засичане на скрола
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
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

  const handleCartClick = () => {
    if (!user) {
      setIsAuthOpen(true);
    } else if (isSupplier) {
      alert("Количката е достъпна само за търговски обекти.");
    } else {
      setIsCartOpen(true);
    }
  };

  // Изключително деликатно, почти незабележимо омекотяване (само от 1.00 до 0.92)
  const heroSoftness = Math.max(0.92, 1 - scrollY / 1400);

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-neutral-900 antialiased selection:bg-neutral-900 selection:text-white">
      
      {/* 1. НАВИГАЦИЯ */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-neutral-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-6">
          
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-neutral-950 flex items-center justify-center text-white font-black text-xs">
              O
            </div>
            <span className="text-lg font-black tracking-tight text-neutral-950">
              OPTOM<span className="text-neutral-400">.BG</span>
            </span>
          </Link>

          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <LiveSearch />
          </div>

          <div className="flex items-center gap-3">
            <HeaderAuthButton />

            {!isSupplier && (
              <button
                onClick={handleCartClick}
                className="relative flex items-center gap-2 px-3.5 py-1.5 bg-neutral-950 hover:bg-neutral-850 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                {user ? <ShoppingBag className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-neutral-400" />}
                <span className="hidden sm:inline">Заявка</span>
                {user && totalCartCases > 0 && (
                  <span className="w-4 h-4 rounded-full bg-white text-neutral-950 text-[10px] font-black flex items-center justify-center">
                    {totalCartCases}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. HERO СЕКЦИЯ С НЕЖНО ОМЕКОТЯВАНЕ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 pb-4">
        <div 
          style={{
            opacity: heroSoftness,
            transition: "opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
          }}
          className="rounded-3xl bg-neutral-950 text-white p-8 sm:p-14 relative overflow-hidden border border-neutral-900 shadow-sm"
        >
          <div className="max-w-2xl relative z-10 space-y-6 text-left">
            
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
              Faire-модел за търговия на едро в България
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.15] text-white">
              Директни заводски цени на стекове за независими обекти.
            </h1>

            <p className="text-sm sm:text-base text-neutral-400 font-normal leading-relaxed max-w-xl">
              Платформа за презареждане на супермаркети, денонощни магазини и заведения. Без търговски прекупвачи, с гарантиран марж до 35% и автоматично генериране на ЗДДС фактури.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button 
                onClick={() => {
                  document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-6 py-3 bg-white hover:bg-neutral-100 text-neutral-950 rounded-xl text-xs font-bold tracking-tight shadow-sm flex items-center gap-2 transition-all cursor-pointer"
              >
                Към каталога на едро <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {!user && (
                <button
                  onClick={() => setIsAuthOpen(true)}
                  className="px-5 py-3 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-neutral-400" />
                  Отключи B2B цени
                </button>
              )}
            </div>

            <div className="pt-4 border-t border-neutral-900 grid grid-cols-3 gap-4 text-left">
              <div>
                <p className="text-[10px] text-neutral-500 uppercase font-mono">Условия</p>
                <p className="text-xs font-bold text-neutral-200 mt-0.5">Net 60 Отсрочка</p>
              </div>
              <div>
                <p className="text-[10px] text-neutral-500 uppercase font-mono">Логистика</p>
                <p className="text-xs font-bold text-neutral-200 mt-0.5">24–48ч Доставка</p>
              </div>
              <div>
                <p className="text-[10px] text-neutral-500 uppercase font-mono">Поръчка</p>
                <p className="text-xs font-bold text-neutral-200 mt-0.5">От 50 лв. MOQ</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. ИСТОРИЯТА И ИДЕЯТА ЗАД OPTOM.BG */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white border border-neutral-200/80 rounded-3xl p-6 sm:p-10 shadow-xs">
          
          <div className="md:col-span-1 space-y-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 font-bold">Нашата Мисия</span>
            <h2 className="text-xl font-black text-neutral-950 tracking-tight">
              Защо създадохме OPTOM.BG?
            </h2>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Дигитализираме традиционната верига на доставки, като свързваме официалните производители и вносители директно с рафта на вашия магазин.
            </p>
          </div>

          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2 p-5 rounded-2xl bg-neutral-50 border border-neutral-100">
              <div className="w-7 h-7 rounded-lg bg-neutral-950 text-white flex items-center justify-center font-black text-xs">
                01
              </div>
              <h3 className="text-xs font-bold text-neutral-950">Директен достъп без прекупвачи</h3>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Край на завишените надценки от междинни складове. Малките магазини получават същите заводски оферти, както големите вериги.
              </p>
            </div>

            <div className="space-y-2 p-5 rounded-2xl bg-neutral-50 border border-neutral-100">
              <div className="w-7 h-7 rounded-lg bg-neutral-950 text-white flex items-center justify-center font-black text-xs">
                02
              </div>
              <h3 className="text-xs font-bold text-neutral-950">Гъвкавост и ликвидни стимули</h3>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Прагове за минимална поръчка от само 50 лв. и опции за отложено плащане, за да не блокирате излишен оборотен капитал.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FAIRE STOREFRONTS (БРАНДОВЕ) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
        <div className="flex items-end justify-between mb-6">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-bold">Официални партньори</span>
            <h2 className="text-xl font-black text-neutral-950 tracking-tight mt-0.5">
              Директни Фабрики & Марки
            </h2>
          </div>
          <span className="text-xs text-neutral-400 hidden sm:inline">Изберете производител за пълен ценоразпис</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURED_BRANDS.map((brand) => (
            <Link
              key={brand.name}
              href={`/brand/${encodeURIComponent(brand.name)}`}
              className="group bg-white rounded-2xl border border-neutral-200/80 hover:border-neutral-950 p-4 transition-all duration-200 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-16/10 rounded-xl overflow-hidden bg-neutral-100 mb-3 border border-neutral-100">
                  <img
                    src={brand.img}
                    alt={brand.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-2 right-2 bg-neutral-950 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded-md">
                    {brand.badge}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-neutral-400 font-medium">{brand.category}</span>
                  <span className="font-mono text-neutral-600">MOQ: {brand.moq} лв.</span>
                </div>

                <h3 className="text-xs font-bold text-neutral-950 mt-1 group-hover:text-neutral-900">
                  {brand.name}
                </h3>
                <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                  {brand.tagline}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-neutral-100 flex items-center justify-between text-xs font-semibold text-neutral-900">
                <span>Каталог на бранда</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-950 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 5. КАТЕГОРИИ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {CATEGORY_TILES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <div 
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(isSelected ? "all" : cat.id);
                  document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth" });
                }}
                className={`cursor-pointer rounded-2xl bg-white border transition-all duration-200 p-3.5 flex items-center gap-3 ${
                  isSelected 
                    ? "border-neutral-950 ring-1 ring-neutral-950 shadow-xs" 
                    : "border-neutral-200/80 hover:border-neutral-400 shadow-xs"
                }`}
              >
                <div className="w-11 h-11 rounded-xl overflow-hidden bg-neutral-100 shrink-0">
                  <img src={cat.img} alt={cat.name} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-neutral-950 truncate">{cat.name}</h3>
                  <p className="text-[10px] text-neutral-400 truncate">{cat.subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. КАТАЛОГ СТЕКОВЕ */}
      <section id="catalog-section" className="max-w-7xl mx-auto px-4 sm:px-8 py-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 border-b border-neutral-200/80 pb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-bold">Налични оферти на едро</span>
            <h2 className="text-xl font-black text-neutral-950 tracking-tight mt-0.5">
              {selectedCategory === "all" ? "Всички артикули по стекове" : selectedCategory}
            </h2>
          </div>

          {selectedCategory !== "all" && (
            <button
              onClick={() => setSelectedCategory("all")}
              className="text-xs font-bold text-neutral-950 hover:underline cursor-pointer"
            >
              Покажи целия каталог &rarr;
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block w-6 h-6 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs text-neutral-500 font-medium">Зареждане на каталога...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-neutral-200 p-8 shadow-xs">
            <Package className="w-10 h-10 stroke-1 mx-auto text-neutral-400 mb-2" />
            <h3 className="text-xs font-bold text-neutral-900">Няма намерени артикули</h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">Опитайте с друга ключова дума или изчистете категорията.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredProducts.map((p) => {
              const qty = quantities[p.id] || 1;
              const { effectivePrice } = getTieredPrice(p, qty);
              const retailTotalPerCase = p.rrpPrice * p.unitsPerCase;
              const profitPerCase = Math.max(0, retailTotalPerCase - effectivePrice);
              const marginPercent = retailTotalPerCase > 0 ? Math.round((profitPerCase / retailTotalPerCase) * 100) : 0;
              const unitWholesale = effectivePrice / (p.unitsPerCase || 1);

              return (
                <div 
                  key={p.id}
                  className="group bg-white rounded-2xl border border-neutral-200/80 hover:border-neutral-950 transition-all duration-200 shadow-xs flex flex-col justify-between overflow-hidden"
                >
                  <div>
                    {/* Снимка */}
                    <div className="relative aspect-square bg-[#FAFAFA] p-4 flex items-center justify-center overflow-hidden border-b border-neutral-100">
                      <img 
                        src={p.imageUrl} 
                        alt={p.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      
                      {user ? (
                        <span className="absolute top-2.5 right-2.5 bg-neutral-950 text-white font-mono font-bold text-[9px] px-2 py-0.5 rounded-md shadow-xs">
                          +{marginPercent}% Марж
                        </span>
                      ) : (
                        <span className="absolute top-2.5 right-2.5 bg-neutral-900 text-white font-medium text-[9px] px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                          <Lock className="w-2.5 h-2.5 text-neutral-400" /> B2B Марж
                        </span>
                      )}

                      <Link
                        href={`/brand/${encodeURIComponent(p.supplierName)}`}
                        className="absolute bottom-2.5 left-2.5 bg-white text-neutral-800 text-[9px] font-semibold px-2 py-0.5 rounded border border-neutral-200 hover:bg-neutral-950 hover:text-white transition-colors"
                      >
                        {p.supplierName} &rarr;
                      </Link>
                    </div>

                    {/* Детайли */}
                    <div className="p-4 space-y-3">
                      <div>
                        <h3 className="text-xs font-bold text-neutral-950 line-clamp-2 h-8 leading-snug">
                          {p.name}
                        </h3>
                        <p className="text-[10px] text-neutral-400 mt-1 font-mono">
                          Опаковка: {p.unitsPerCase} бр./стек
                        </p>
                      </div>

                      {user && (
                        <div className="bg-neutral-50 rounded-xl p-2.5 space-y-1 text-xs border border-neutral-100 font-mono">
                          <div className="flex justify-between items-center">
                            <span className="text-neutral-500 text-[10px]">Цена за стек:</span>
                            <span className="font-bold text-neutral-950">{effectivePrice.toFixed(2)} лв.</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-neutral-400">Едрова за 1 бр.:</span>
                            <span className="text-neutral-600">{unitWholesale.toFixed(2)} лв.</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] pt-1 border-t border-neutral-200">
                            <span className="text-neutral-400">Препор. на рафт:</span>
                            <span className="font-semibold text-neutral-900">{p.rrpPrice.toFixed(2)} лв.</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Добавяне в кошница */}
                  <div className="p-4 pt-0">
                    {user ? (
                      isSupplier ? (
                        <Link
                          href="/supplier"
                          className="w-full py-2 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                        >
                          <span>Управлявай в панела</span>
                        </Link>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center bg-neutral-100 rounded-xl p-0.5 border border-neutral-200">
                            <button
                              onClick={() => handleQtyChange(p.id, -1)}
                              className="w-6 h-6 flex items-center justify-center rounded text-neutral-600 hover:bg-white transition-colors cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-5 text-center text-xs font-bold font-mono text-neutral-900">{qty}</span>
                            <button
                              onClick={() => handleQtyChange(p.id, 1)}
                              className="w-6 h-6 flex items-center justify-center rounded text-neutral-600 hover:bg-white transition-colors cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <button
                            onClick={() => handleAddOrAuth(p)}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                              addedAnimation === p.id
                                ? "bg-neutral-900 text-white"
                                : "bg-neutral-950 hover:bg-neutral-800 text-white shadow-xs"
                            }`}
                          >
                            {addedAnimation === p.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 stroke-[3]" /> Добавено
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
                        className="w-full py-2 px-3 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5 text-neutral-400" />
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

      {/* FOOTER */}
      <footer className="bg-white border-t border-neutral-200 py-12 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-neutral-100 pb-8 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-neutral-950 text-white flex items-center justify-center font-bold text-xs">
              O
            </div>
            <div>
              <span className="font-bold text-neutral-950 text-sm">OPTOM.BG</span>
              <p className="text-[10px] text-neutral-400">Национална B2B платформа за търговия на едро</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-neutral-500 text-xs">
            <Link href="/supplier" className="hover:text-neutral-900 transition-colors">Панел за доставчици</Link>
            {!isSupplier && <Link href="/orders" className="hover:text-neutral-900 transition-colors">Фактури & Поръчки</Link>}
            <span>Цените са без включен ДДС</span>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 text-center text-neutral-400 text-[11px] font-mono">
          &copy; 2026 OPTOM.BG. Всички права запазени.
        </div>
      </footer>

      {!isSupplier && <CartDrawer />}
    </div>
  );
}
