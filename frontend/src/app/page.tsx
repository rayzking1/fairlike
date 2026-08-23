"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  ShoppingBag, 
  ArrowRight, 
  Package, 
  Check, 
  Lock, 
  Star, 
  Plus, 
  Minus, 
  X, 
  Sparkles 
} from "lucide-react";
import HeaderAuthButton from "@/components/HeaderAuthButton";
import CartDrawer from "@/components/CartDrawer";
import LiveSearch from "@/components/LiveSearch";
import { useCart, CartProduct, getTieredPrice } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

const NAV_CATEGORIES = [
  "Всички",
  "Безалкохолни & Води",
  "Енергийни напитки",
  "Чипс & Снаксове",
  "Шоколади & Вафли",
  "Ядки & Солети",
  "Кафе & Топъл бар",
  "Тестени & Кроасани"
];

const FEATURED_BRANDS = [
  { 
    name: "Монделийз България", 
    location: "гр. София",
    tagline: "Milka, Oreo, Barni, Tuc, BelVita", 
    category: "Шоколади & Сладки", 
    moq: 50, 
    badge: "Топ Марж +35%", 
    img: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600&q=80" 
  },
  { 
    name: "Ред Бул Дистрибуция", 
    location: "гр. София",
    tagline: "Red Bull Energy & Sugarfree 250ml/355ml", 
    category: "Енергийни напитки", 
    moq: 80, 
    badge: "Бестселър", 
    img: "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=600&q=80" 
  },
  { 
    name: "Интерснак България", 
    location: "гр. София",
    tagline: "Chio Chips, Pom-Bär, Nutline", 
    category: "Чипс & Снаксове", 
    moq: 50, 
    badge: "Бързооборотни", 
    img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&q=80" 
  },
  { 
    name: "Чипита България", 
    location: "гр. София",
    tagline: "7 Days Max, Bake Rolls, Fineti", 
    category: "Тестени & Кроасани", 
    moq: 50, 
    badge: "Заводски цени", 
    img: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&q=80" 
  },
  { 
    name: "Кока-Кола ХБК България", 
    location: "гр. Костинброд",
    tagline: "Coca-Cola, Fanta, Sprite, Банкя, Monster", 
    category: "Безалкохолни", 
    moq: 60, 
    badge: "Високо търсене", 
    img: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=600&q=80" 
  },
];

export default function HomePage() {
  const { items: cartItems, addToCart, setIsCartOpen } = useCart();
  const { user, setIsAuthOpen, openAuthWithProduct } = useAuth();
  const isSupplier = user?.role === "supplier";
  
  const [products, setProducts] = useState<CartProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Всички");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addedAnimation, setAddedAnimation] = useState<string | null>(null);

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

  const [showWelcomePopup, setShowWelcomePopup] = useState(false);

  useEffect(() => {
    if (!user) {
      const isDismissed = sessionStorage.getItem("optom_welcome_dismissed");
      if (!isDismissed) {
        const timer = setTimeout(() => {
          setShowWelcomePopup(true);
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [user]);

  const handleDismissWelcome = () => {
    setShowWelcomePopup(false);
    sessionStorage.setItem("optom_welcome_dismissed", "true");
  };

  const handleOpenRegisterFromPopup = () => {
    handleDismissWelcome();
    setIsAuthOpen(true);
  };

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
    if (selectedCategory === "Всички") return products;
    return products.filter((p) => 
      p.category.toLowerCase().includes(selectedCategory.toLowerCase()) ||
      p.name.toLowerCase().includes(selectedCategory.toLowerCase())
    );
  }, [products, selectedCategory]);

  const handleQtyChange = (productId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[productId] || 1;
      const updated = Math.max(1, current + delta);
      return { ...prev, [productId]: updated };
    });
  };

  const handleAddOrAuth = (product: CartProduct) => {
    if (!user) {
      openAuthWithProduct({ name: product.name, imageUrl: product.imageUrl, unitsPerCase: product.unitsPerCase });
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

  const heroOpacity = Math.max(0, 1 - scrollY / 500);
  const heroTranslateY = scrollY * 0.15;

  return (
    <div className="min-h-screen bg-white text-[#121212] antialiased selection:bg-[#121212] selection:text-white">
      
      {/* 1. TOP TICKER */}
      <div className="bg-[#FAF9F7] border-b border-[#EBE8E3] py-2 px-4 text-center text-xs text-[#525252]">
        <span>Директни заводски доставки на стекове за хранителни магазини и заведения. </span>
        {!user && (
          <button 
            onClick={() => setIsAuthOpen(true)}
            className="font-semibold text-[#121212] underline ml-1 cursor-pointer hover:text-black"
          >
            Вход / Регистрация
          </button>
        )}
      </div>

      {/* 2. HEADER */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#EBE8E3]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 h-18 flex items-center justify-between gap-6">
          
          <Link href="/" className="text-2xl font-serif font-black tracking-[0.2em] text-[#121212] uppercase shrink-0">
            OPTOM
          </Link>

          <div className="flex-1 max-w-xl hidden md:block">
            <LiveSearch />
          </div>

          <div className="flex items-center gap-3">
            <HeaderAuthButton />

            {!isSupplier && (
              <button
                onClick={() => user ? setIsCartOpen(true) : setIsAuthOpen(true)}
                className="relative flex items-center gap-2 px-3.5 py-2 bg-[#121212] hover:bg-neutral-800 text-white rounded-md text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                {user ? <ShoppingBag className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-neutral-400" />}
                <span className="hidden sm:inline">Заявка</span>
                {user && totalCartCases > 0 && (
                  <span className="w-4 h-4 rounded-full bg-white text-[#121212] text-[10px] font-bold flex items-center justify-center">
                    {totalCartCases}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Categories Bar */}
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 flex items-center gap-6 overflow-x-auto py-2.5 scrollbar-none text-xs font-medium text-[#525252] border-t border-[#F2F0EB]">
          {NAV_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                document.getElementById("catalog-grid")?.scrollIntoView({ behavior: "smooth" });
              }}
              className={`whitespace-nowrap pb-0.5 border-b-2 transition-all cursor-pointer ${
                selectedCategory === cat 
                  ? "border-[#121212] text-[#121212] font-semibold" 
                  : "border-transparent hover:text-[#121212]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {/* 3. HERO SECTION */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-8 py-6">
        <div 
          style={{
            opacity: heroOpacity,
            transform: `translateY(${heroTranslateY}px)`,
            willChange: "transform, opacity"
          }}
          className="relative rounded-2xl overflow-hidden min-h-[460px] flex items-center bg-[#2B2825] shadow-xs transition-opacity duration-75"
        >
          <img 
            src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1600&q=80" 
            alt="FMCG Дистрибуция" 
            className="absolute inset-0 w-full h-full object-cover opacity-50"
          />

          <div className="relative z-10 m-6 sm:m-12 max-w-md bg-white/95 backdrop-blur-md p-8 sm:p-10 rounded-xl shadow-lg space-y-4">
            <h1 className="text-3xl sm:text-4xl font-serif text-[#121212] leading-tight font-normal">
              Презареждайте обекта на заводски цени.
            </h1>
            <p className="text-xs text-[#525252] leading-relaxed">
              Директни стекове с безалкохолни, енергийни напитки, снаксове и кафе за магазини и заведения. Без посредници и с Net 60 отсрочка.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => user ? document.getElementById("catalog-grid")?.scrollIntoView({ behavior: "smooth" }) : setIsAuthOpen(true)}
                className="px-6 py-3 bg-[#121212] hover:bg-neutral-800 text-white rounded-md text-xs font-semibold tracking-wide transition-all text-center cursor-pointer shadow-sm"
              >
                {user ? "Към каталога със стекове" : "Вход / Регистрация"}
              </button>
            </div>

            <p className="text-[11px] text-[#737373] pt-1">
              Официален производител сте?{" "}
              <button onClick={() => setIsAuthOpen(true)} className="underline font-medium text-[#121212] hover:text-black cursor-pointer">
                Качете ценоразписа си
              </button>
            </p>
          </div>
        </div>
      </section>

      {/* 4. FEATURED BRANDS */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-8 py-10 transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl sm:text-2xl font-serif font-normal text-[#121212]">
            Официални производители & марки
          </h2>
          <Link href="/brand/Монделийз България" className="text-xs font-semibold text-[#121212] hover:underline">
            Всички фабрики &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {FEATURED_BRANDS.map((brand) => (
            <Link
              key={brand.name}
              href={`/brand/${encodeURIComponent(brand.name)}`}
              className="group flex flex-col space-y-2.5 hover:-translate-y-1 transition-transform duration-200"
            >
              <div className="aspect-square rounded-xl overflow-hidden bg-[#FAF9F7] border border-[#EBE8E3] relative shadow-2xs">
                <img
                  src={brand.img}
                  alt={brand.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-2 left-2 bg-white/90 text-[#121212] text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                  {brand.badge}
                </span>
              </div>

              <div>
                <h3 className="text-xs font-bold text-[#121212] group-hover:underline truncate">
                  {brand.name}
                </h3>
                <p className="text-[11px] text-[#737373]">{brand.location}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 5. BRAND STORY BANNER */}
      <section className="bg-[#2E2824] text-[#F5F2EB] py-16 px-4 sm:px-8 my-8 transition-all duration-300">
        <div className="max-w-[1360px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="text-[11px] font-mono tracking-widest uppercase text-[#C4B5A5]">
              Нашата Мисия
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-normal mt-2 leading-snug">
              OPTOM.BG: Свързваме фабриките с вашия рафт.
            </h2>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-[#D6CFC7] font-light leading-relaxed">
            <p>
              Дигитализираме традиционната FMCG дистрибуция в България. Независимите магазини получават същите директни условия и ценови нива за стекове и палети, с каквито работят големите хипермаркети.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-6 text-xs font-medium text-white">
              <span>✓ Net 60 дни отсрочка</span>
              <span>✓ Минимална поръчка от 50 лв.</span>
              <span>✓ Оригинални ЗДДС фактури</span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. BESTSELLERS CATALOG */}
      <section id="catalog-grid" className="max-w-[1360px] mx-auto px-4 sm:px-8 py-10 transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-normal text-[#121212]">
              Бързооборотни артикули по стекове
            </h2>
            <p className="text-xs text-[#737373] mt-0.5">Директни заводски цени на кашони и стекове</p>
          </div>
          <span className="text-xs text-[#737373]">{filteredProducts.length} налични артикула</span>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block w-6 h-6 border-2 border-[#121212] border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs text-[#737373]">Зареждане на каталога...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center bg-[#FAF9F7] rounded-xl border border-[#EBE8E3] p-8">
            <Package className="w-8 h-8 mx-auto text-neutral-400 mb-2" />
            <h3 className="text-xs font-bold text-[#121212]">Няма намерени артикули в тази категория</h3>
            <button
              onClick={() => setSelectedCategory("Всички")}
              className="mt-2 text-xs text-[#121212] underline font-semibold cursor-pointer"
            >
              Покажи всички артикули
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
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
                  onClick={() => !user && openAuthWithProduct({ name: p.name, imageUrl: p.imageUrl, unitsPerCase: p.unitsPerCase })}
                  className={`group bg-white rounded-xl border border-[#EBE8E3] hover:border-[#121212] transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-2xs hover:-translate-y-1 hover:shadow-md ${!user ? 'cursor-pointer' : ''}`}
                >
                  <div>
                    <div className="relative aspect-square bg-[#FAF9F7] p-4 flex items-center justify-center overflow-hidden border-b border-[#F2F0EB]">
                      <img 
                        src={p.imageUrl} 
                        alt={p.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      
                      <span className="absolute top-2 left-2 bg-white text-[#121212] text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs border border-[#EBE8E3]">
                        Бестселър
                      </span>

                      {user && (
                        <span className="absolute top-2 right-2 bg-[#121212] text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                          +{marginPercent}% Марж
                        </span>
                      )}
                    </div>

                    <div className="p-3.5 space-y-2">
                      <div>
                        <h3 className="text-xs font-bold text-[#121212] line-clamp-2 h-8 leading-snug">
                          {p.name}
                        </h3>
                        <p className="text-[11px] text-[#737373] mt-0.5 truncate font-medium">
                          {p.supplierName}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 text-[10px] text-[#525252]">
                        <Star className="w-3 h-3 fill-[#121212] text-[#121212]" />
                        <span className="font-bold text-[#121212]">5.0</span>
                        <span>({Math.floor(p.casePrice * 2) + 8})</span>
                      </div>

                      {user ? (
                        <div className="bg-[#FAF9F7] rounded-lg p-2 space-y-1 text-xs font-mono border border-[#EBE8E3]">
                          <div className="flex justify-between items-center">
                            <span className="text-[#737373] text-[10px]">Стек ({p.unitsPerCase} бр.):</span>
                            <span className="font-bold text-[#121212]">{effectivePrice.toFixed(2)} лв.</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-[#737373]">
                            <span>За 1 бр.:</span>
                            <span>{unitWholesale.toFixed(2)} лв.</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-[#737373] font-medium pt-1">
                          Стек от {p.unitsPerCase} бр.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 pt-0">
                    {user ? (
                      isSupplier ? (
                        <Link
                          href="/supplier"
                          className="w-full py-2 bg-[#FAF9F7] hover:bg-[#EBE8E3] text-[#121212] rounded-md text-xs font-semibold flex items-center justify-center transition-all"
                        >
                          Управление в панела
                        </Link>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center bg-[#FAF9F7] rounded-md border border-[#EBE8E3] p-0.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleQtyChange(p.id, -1); }}
                              className="w-5 h-5 flex items-center justify-center text-neutral-600 hover:bg-white rounded cursor-pointer"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="w-4 text-center text-xs font-bold font-mono text-[#121212]">{qty}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleQtyChange(p.id, 1); }}
                              className="w-5 h-5 flex items-center justify-center text-neutral-600 hover:bg-white rounded cursor-pointer"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>

                          <button
                            onClick={(e) => { e.stopPropagation(); handleAddOrAuth(p); }}
                            className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                              addedAnimation === p.id
                                ? "bg-[#121212] text-white"
                                : "bg-[#121212] hover:bg-neutral-800 text-white shadow-xs"
                            }`}
                          >
                            {addedAnimation === p.id ? (
                              <>
                                <Check className="w-3 h-3 stroke-[3]" /> Добавен
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
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openAuthWithProduct({ name: p.name, imageUrl: p.imageUrl, unitsPerCase: p.unitsPerCase });
                        }}
                        className="w-full py-2 bg-[#FAF9F7] hover:bg-[#EBE8E3] text-[#121212] border border-[#EBE8E3] rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Lock className="w-3 h-3 text-[#737373]" />
                        <span>Отключи цена на едро &rarr;</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 7. FOOTER */}
      <footer className="border-t border-[#EBE8E3] bg-[#FAF9F7] py-14 text-xs text-[#525252]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          
          <div className="space-y-3">
            <span className="text-xl font-serif font-black tracking-[0.2em] text-[#121212] uppercase">
              OPTOM
            </span>
            <p className="text-xs text-[#737373] leading-relaxed">
              Официален B2B маркетплейс за директна търговия на едро между производители и магазини.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-[#121212] uppercase text-[10px] tracking-wider">За магазини</h4>
            <ul className="space-y-1.5 text-xs">
              <li><button onClick={() => setIsAuthOpen(true)} className="hover:underline">Вход за търговци</button></li>
              <li><Link href="/orders" className="hover:underline">Моите фактури & заявки</Link></li>
              <li><span className="text-[#737373]">Net 60 дни отсрочка</span></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-[#121212] uppercase text-[10px] tracking-wider">За производители</h4>
            <ul className="space-y-1.5 text-xs">
              <li><Link href="/supplier" className="hover:underline">Панел на фабриката</Link></li>
              <li><Link href="/supplier" className="hover:underline">Масов Excel импорт</Link></li>
              <li><Link href="/supplier" className="hover:underline">Складов експорт</Link></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-[#121212] uppercase text-[10px] tracking-wider">Контакт & Правни</h4>
            <ul className="space-y-1.5 text-xs text-[#737373]">
              <li>гр. София, бул. Цариградско шосе 115</li>
              <li>office@optom.bg</li>
              <li>Всички цени са без включен ДДС</li>
            </ul>
          </div>
        </div>

        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 pt-6 border-t border-[#EBE8E3] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#737373]">
          <p>&copy; 2026 OPTOM.BG Wholesale Inc. Всички права запазени.</p>
          <div className="flex gap-4">
            <span className="hover:underline cursor-pointer">Политика за поверителност</span>
            <span>&bull;</span>
            <span className="hover:underline cursor-pointer">Общи B2B условия</span>
          </div>
        </div>
      </footer>

      {/* 8. WELCOME POPUP */}
      {showWelcomePopup && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl border border-[#EBE8E3] text-[#121212] relative text-center space-y-5 animate-in zoom-in-95 duration-200">
            <button
              onClick={handleDismissWelcome}
              className="absolute top-4 right-4 text-[#737373] hover:text-[#121212] p-1 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-full bg-[#FAF9F7] border border-[#EBE8E3] flex items-center justify-center mx-auto text-[#121212]">
              <Sparkles className="w-5 h-5" />
            </div>

            <div>
              <span className="text-xl font-serif font-black tracking-[0.2em] uppercase">OPTOM</span>
              <h3 className="text-2xl font-serif font-normal mt-2">Отключете заводските цени на едро</h3>
              <p className="text-xs text-[#737373] mt-2 leading-relaxed">
                Регистрирайте своя търговски обект за достъп до ценоразписи на производители, отложено плащане Net 60 дни и безплатна доставка.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleOpenRegisterFromPopup}
                className="w-full py-3 bg-[#121212] hover:bg-neutral-800 text-white font-semibold text-xs rounded-md shadow-xs transition-all cursor-pointer"
              >
                Регистрация за търговски обекти
              </button>
              <button
                onClick={handleDismissWelcome}
                className="w-full py-2.5 text-xs text-[#737373] hover:text-[#121212] transition-colors cursor-pointer"
              >
                Продължи като гост
              </button>
            </div>
          </div>
        </div>
      )}

      {!isSupplier && <CartDrawer />}
    </div>
  );
}
