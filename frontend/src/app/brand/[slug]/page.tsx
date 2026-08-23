"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { 
  ChevronLeft, 
  ShoppingBag, 
  Lock, 
  Plus, 
  Minus, 
  Check, 
  Package, 
  Truck, 
  Clock,
  Star
} from "lucide-react";
import HeaderAuthButton from "@/components/HeaderAuthButton";
import CartDrawer from "@/components/CartDrawer";
import LiveSearch from "@/components/LiveSearch";
import { useCart, CartProduct, getTieredPrice } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

export default function BrandStorefrontPage() {
  const params = useParams();
  const rawBrand = params?.slug ? decodeURIComponent(String(params.slug)) : "";
  
  const { user, setIsAuthOpen, openAuthWithProduct } = useAuth();
  const { addToCart, setIsCartOpen, items: cartItems } = useCart();
  const isSupplier = user?.role === "supplier";

  const [products, setProducts] = useState<CartProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addedAnimation, setAddedAnimation] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");

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
          const data: CartProduct[] = await res.json();
          const brandItems = data.filter(
            (p) => p.supplierName.trim().toLowerCase() === rawBrand.trim().toLowerCase()
          );
          setProducts(brandItems.length > 0 ? brandItems : data);
        }
      } catch (err) {
        console.error("Грешка при зареждане на бранда:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [rawBrand]);

  const brandMoq = products[0]?.supplierMinimum || 50;
  const brandCategories = Array.from(new Set(products.map((p) => p.category)));

  const filteredProducts = useMemo(() => {
    if (selectedCategory === "all") return products;
    return products.filter((p) => p.category === selectedCategory);
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

  const totalCartCases = cartItems.reduce((sum, item) => sum + item.quantityCases, 0);

  return (
    <div className="min-h-screen bg-white text-[#121212] antialiased selection:bg-[#121212] selection:text-white">
      
      {/* 1. НАВИГАЦИЯ */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#EBE8E3]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 h-18 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Link 
              href="/"
              className="flex items-center gap-1 text-xs font-semibold text-[#525252] hover:text-[#121212] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Всички брандове
            </Link>
            <div className="h-4 w-px bg-[#EBE8E3] hidden sm:block" />
            <Link href="/" className="text-xl font-serif font-black tracking-[0.2em] text-[#121212] uppercase">
              OPTOM
            </Link>
          </div>

          <div className="hidden md:flex flex-1 max-w-md mx-4">
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
      </header>

      {/* 2. BRAND HERO BANNER */}
      <section className="border-b border-[#EBE8E3] bg-[#FAF9F7]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-xl bg-[#121212] text-white flex items-center justify-center font-serif text-2xl shadow-sm shrink-0">
                {rawBrand.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-serif text-[#121212]">
                  {rawBrand || "Официален Дистрибутор"}
                </h1>
                <p className="text-xs text-[#737373] mt-1 max-w-xl">
                  Директна дистрибуция на стекове за магазини и заведения. Гарантирана наличност и ЗДДС фактуриране.
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-[#525252] mt-3">
                  <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5 text-[#121212]" /> Доставка: 24–48ч</span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-[#121212]" /> Условия: Net 60 дни</span>
                  <span>&bull;</span>
                  <span className="font-mono font-bold text-[#121212]">MOQ: {brandMoq.toFixed(2)} лв.</span>
                </div>
              </div>
            </div>

            <div className="shrink-0">
              <button
                onClick={() => {
                  document.getElementById("brand-catalog")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-5 py-2.5 bg-[#121212] hover:bg-neutral-800 text-white text-xs font-semibold rounded-md shadow-xs transition-all cursor-pointer"
              >
                Разгледай артикулите ({products.length})
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. BRAND CATALOG */}
      <main id="brand-catalog" className="max-w-[1360px] mx-auto px-4 sm:px-8 py-10 space-y-6">
        
        {brandCategories.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#EBE8E3]">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-[#121212] text-white"
                  : "bg-[#FAF9F7] text-[#525252] hover:text-[#121212] border border-[#EBE8E3]"
              }`}
            >
              Всички ({products.length})
            </button>
            {brandCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-[#121212] text-white"
                    : "bg-[#FAF9F7] text-[#525252] hover:text-[#121212] border border-[#EBE8E3]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block w-6 h-6 border-2 border-[#121212] border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs text-[#737373]">Зареждане на каталога на {rawBrand}...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center bg-[#FAF9F7] rounded-xl border border-[#EBE8E3] p-8">
            <Package className="w-8 h-8 mx-auto text-neutral-400 mb-2" />
            <h3 className="text-xs font-bold text-[#121212]">Няма намерени артикули</h3>
            <p className="text-[11px] text-[#737373] mt-0.5">Този бранд все още няма качени оферти.</p>
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
                  className={`group bg-white rounded-xl border border-[#EBE8E3] hover:border-[#121212] transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-2xs ${!user ? 'cursor-pointer' : ''}`}
                >
                  <div>
                    <div className="relative aspect-square bg-[#FAF9F7] p-4 flex items-center justify-center overflow-hidden border-b border-[#F2F0EB]">
                      <img 
                        src={p.imageUrl} 
                        alt={p.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      
                      {user ? (
                        <span className="absolute top-2 right-2 bg-[#121212] text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                          +{marginPercent}% Марж
                        </span>
                      ) : (
                        <span className="absolute top-2 right-2 bg-neutral-900 text-white font-medium text-[9px] px-2 py-0.5 rounded flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5 text-neutral-400" /> B2B Марж
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
      </main>

      <CartDrawer />
    </div>
  );
}
