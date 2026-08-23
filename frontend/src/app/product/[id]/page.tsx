"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { 
  ChevronLeft, 
  ShoppingBag, 
  Lock, 
  Star, 
  Truck, 
  RotateCcw, 
  ShieldCheck, 
  ChevronDown, 
  Share2, 
  Heart, 
  Check, 
  Package, 
  Sparkles
} from "lucide-react";
import HeaderAuthButton from "@/components/HeaderAuthButton";
import CartDrawer from "@/components/CartDrawer";
import LiveSearch from "@/components/LiveSearch";
import { useCart, CartProduct, getTieredPrice } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params?.id ? String(params.id) : "";

  const { user, setIsAuthOpen, openAuthWithProduct } = useAuth();
  const { addToCart, setIsCartOpen, items: cartItems } = useCart();

  const [product, setProduct] = useState<CartProduct | null>(null);
  const [allProducts, setAllProducts] = useState<CartProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCases, setSelectedCases] = useState<number>(1);
  const [addedAnimation, setAddedAnimation] = useState(false);
  const [activeTab, setActiveTab] = useState<"desc" | "specs">("desc");

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

  // Route Guard: Разрешено само за влезли търговски купувачи (retailer)
  useEffect(() => {
    if (!loading && (!user || user.role !== "retailer")) {
      router.replace("/");
      if (!user) {
        setIsAuthOpen(true);
      }
    }
  }, [user, loading, router, setIsAuthOpen]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const baseUrl = getApiBaseUrl();
      try {
        const res = await fetch(`${baseUrl}/api/products`);
        if (res.ok) {
          const list: CartProduct[] = await res.json();
          setAllProducts(list);
          const found = list.find((p) => String(p.id) === productId);
          if (found) {
            setProduct(found);
          } else if (list.length > 0) {
            setProduct(list[0]);
          }
        }
      } catch (err) {
        console.error("Грешка при зареждане на продукта:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [productId]);

  const brandProducts = useMemo(() => {
    if (!product) return [];
    return allProducts.filter(
      (p) => p.supplierName.trim().toLowerCase() === product.supplierName.trim().toLowerCase() && p.id !== product.id
    ).slice(0, 5);
  }, [allProducts, product]);

  const similarProducts = useMemo(() => {
    if (!product) return [];
    return allProducts.filter(
      (p) => p.category === product.category && p.id !== product.id
    ).slice(0, 5);
  }, [allProducts, product]);

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product, selectedCases);
    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 1500);
  };

  const totalCartCases = cartItems.reduce((sum, item) => sum + item.quantityCases, 0);

  if (loading || !user || user.role !== "retailer") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="w-7 h-7 border-2 border-[#121212] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs text-[#737373]">Проверка на B2B достъп...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white p-8 text-center">
        <p className="text-sm font-bold text-[#121212]">Продуктът не е намерен.</p>
        <Link href="/" className="text-xs text-[#121212] underline mt-2 inline-block">Към каталога</Link>
      </div>
    );
  }

  const { effectivePrice, discountPercent } = getTieredPrice(product, selectedCases);
  const lineTotal = selectedCases * effectivePrice;
  const unitWholesale = effectivePrice / (product.unitsPerCase || 1);
  const retailTotalPerCase = product.rrpPrice * product.unitsPerCase;
  const marginPercent = retailTotalPerCase > 0 ? Math.round(((retailTotalPerCase - effectivePrice) / retailTotalPerCase) * 100) : 35;

  return (
    <div className="min-h-screen bg-white text-[#121212] antialiased selection:bg-[#121212] selection:text-white">
      
      {/* 1. TOP ANNOUNCEMENT */}
      <div className="bg-[#FAF9F7] border-b border-[#EBE8E3] py-2 px-4 text-center text-xs text-[#525252]">
        <span>Официални заводски цени на стекове с </span>
        <strong className="text-[#121212]">Net 60 дни отсрочка</strong>
        <span> за търговски обекти.</span>
      </div>

      {/* 2. HEADER */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#EBE8E3]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 h-18 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-1 text-xs font-semibold text-[#525252] hover:text-[#121212] transition-colors">
              <ChevronLeft className="w-4 h-4" /> Каталог
            </Link>
            <div className="h-4 w-px bg-[#EBE8E3]" />
            <Link href="/" className="text-2xl font-serif font-black tracking-[0.2em] text-[#121212] uppercase shrink-0">
              OPTOM
            </Link>
          </div>

          <div className="flex-1 max-w-xl hidden md:block">
            <LiveSearch />
          </div>

          <div className="flex items-center gap-3">
            <HeaderAuthButton />

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 px-3.5 py-2 bg-[#121212] hover:bg-neutral-800 text-white rounded-md text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Заявка</span>
              {totalCartCases > 0 && (
                <span className="w-4 h-4 rounded-full bg-white text-[#121212] text-[10px] font-bold flex items-center justify-center">
                  {totalCartCases}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 3. SUPPLIER BRAND BAR */}
      <div className="border-b border-[#EBE8E3] bg-white">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <Link 
            href={`/brand/${encodeURIComponent(product.supplierName)}`}
            className="flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-full bg-[#FAF9F7] border border-[#EBE8E3] flex items-center justify-center text-xs font-serif font-bold text-[#121212]">
              {product.supplierName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#121212] group-hover:underline">{product.supplierName}</span>
                <span className="text-[10px] text-[#737373]">&bull;</span>
                <div className="flex items-center gap-1 text-[11px] font-medium text-[#121212]">
                  <Star className="w-3 h-3 fill-[#121212] text-[#121212]" />
                  <span>4.9</span>
                  <span className="text-[#737373] underline">(48 ревюта)</span>
                </div>
              </div>
            </div>
          </Link>

          <Link
            href={`/brand/${encodeURIComponent(product.supplierName)}`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF9F7] hover:bg-[#F2F0EB] text-[#121212] border border-[#EBE8E3] rounded-full text-xs font-semibold transition-colors"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{product.supplierMinimum?.toFixed(0) || 50} лв. минимум</span>
          </Link>
        </div>
      </div>

      {/* 4. DETAILS SECTION */}
      <main className="max-w-[1360px] mx-auto px-4 sm:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* ЛЯВА ЧАСТ: ГАЛЕРИЯ */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="aspect-square bg-[#FAF9F7] rounded-xl border border-[#EBE8E3] p-6 flex items-center justify-center overflow-hidden">
                <img 
                  src={product.imageUrl} 
                  alt={product.name} 
                  className="w-full h-full object-contain hover:scale-105 transition-transform duration-300"
                />
              </div>

              <div className="aspect-square bg-[#FAF9F7] rounded-xl border border-[#EBE8E3] p-6 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-white border border-[#EBE8E3] flex items-center justify-center shadow-xs">
                  <Package className="w-6 h-6 text-[#121212]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#121212]">Оригинален фабричен кашон</p>
                  <p className="text-[11px] text-[#737373] mt-0.5">Включва {product.unitsPerCase} бр. единични опаковки</p>
                </div>
                <div className="text-[10px] font-mono text-[#525252] bg-white px-2.5 py-1 rounded border border-[#EBE8E3]">
                  Баркод: {product.barcode}
                </div>
              </div>
            </div>

            <div className="bg-[#FAF9F7] rounded-xl border border-[#EBE8E3] p-6 space-y-4">
              <div className="flex gap-4 border-b border-[#EBE8E3] pb-3 text-xs font-semibold">
                <button
                  onClick={() => setActiveTab("desc")}
                  className={`pb-1 transition-all cursor-pointer ${
                    activeTab === "desc" ? "border-b-2 border-[#121212] text-[#121212]" : "text-[#737373]"
                  }`}
                >
                  Описание на артикула
                </button>
                <button
                  onClick={() => setActiveTab("specs")}
                  className={`pb-1 transition-all cursor-pointer ${
                    activeTab === "specs" ? "border-b-2 border-[#121212] text-[#121212]" : "text-[#737373]"
                  }`}
                >
                  Палетни схеми & Логистика
                </button>
              </div>

              {activeTab === "desc" ? (
                <div className="text-xs text-[#525252] space-y-2 leading-relaxed">
                  <p>
                    Официален дистрибуционен артикул от портфолиото на <strong>{product.supplierName}</strong>. Доставя се в оригинална фабрична опаковка, годна за директно позициониране на търговски рафт или хладилна витрина.
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-[#737373] pt-1">
                    <li>Категория: {product.category}</li>
                    <li>Брой единици в стек: {product.unitsPerCase} бр.</li>
                    <li>Гарантиран срок на годност: Минимум 6+ месеца</li>
                    <li>Издаване на оригинална фактура по ЗДДС при доставка</li>
                  </ul>
                </div>
              ) : (
                <div className="text-xs text-[#525252] space-y-2 font-mono">
                  <div className="flex justify-between py-1 border-b border-[#EBE8E3]">
                    <span className="text-[#737373]">Европалет капацитет:</span>
                    <span className="font-bold text-[#121212]">{(product.unitsPerCase > 20 ? 72 : 96)} стека / палет</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#EBE8E3]">
                    <span className="text-[#737373]">Редове на палет:</span>
                    <span className="font-bold text-[#121212]">6 реда по {(product.unitsPerCase > 20 ? 12 : 16)} стека</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#737373]">Условия на съхранение:</span>
                    <span className="text-[#121212] font-sans">Сухо и прохладно място (4°C - 22°C)</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ДЯСНА ЧАСТ: КАРТА ЗА ПОРЪЧКА */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <div className="flex items-center justify-between text-xs text-[#737373] mb-1">
                <span>{product.category}</span>
                <div className="flex items-center gap-2">
                  <button className="p-1 hover:text-[#121212]"><Share2 className="w-4 h-4" /></button>
                  <button className="p-1 hover:text-[#121212]"><Heart className="w-4 h-4" /></button>
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl font-serif text-[#121212] leading-snug">
                {product.name}
              </h1>

              <div className="mt-4 pb-4 border-b border-[#EBE8E3]">
                <div className="space-y-1">
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl font-bold font-mono text-[#121212]">
                      {unitWholesale.toFixed(2)} лв.
                    </span>
                    <span className="text-xs text-[#737373]">
                      MSRP рафт: <strong className="text-[#121212]">{product.rrpPrice.toFixed(2)} лв./бр.</strong>
                    </span>
                    <span className="text-xs font-mono font-bold bg-[#FAF9F7] text-[#121212] border border-[#EBE8E3] px-2 py-0.5 rounded">
                      +{marginPercent}% Марж
                    </span>
                  </div>

                  <p className="text-xs text-[#737373] font-mono pt-1">
                    Цена за 1 цял стек ({product.unitsPerCase} бр.): <strong>{effectivePrice.toFixed(2)} лв. без ДДС</strong>
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span>Количество (Стекове):</span>
                <span className="text-[#737373] font-mono text-[11px]">Стек от {product.unitsPerCase} бр.</span>
              </div>

              <div className="relative">
                <select
                  value={selectedCases}
                  onChange={(e) => setSelectedCases(parseInt(e.target.value, 10))}
                  className="w-full appearance-none bg-white border border-[#121212] rounded-md px-4 py-3 text-xs font-mono font-bold text-[#121212] focus:outline-none cursor-pointer"
                >
                  {[1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 30, 50, 72].map((num) => (
                    <option key={num} value={num}>
                      {num} {num === 1 ? "стек" : "стека"} ({num * product.unitsPerCase} бр.) {num >= 10 ? "-10% отстъпка" : num >= 5 ? "-5% отстъпка" : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-neutral-500 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>

              {product.hasTieredDiscount !== false && (
                <div className="bg-[#FAF9F7] border border-[#EBE8E3] rounded-lg p-2.5 text-[11px] space-y-1 text-[#525252]">
                  <p className="font-semibold text-[#121212] flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#121212]" /> Обемни отстъпки от фабриката:
                  </p>
                  <div className="flex gap-3 text-[10px] font-mono text-[#737373]">
                    <span className={selectedCases >= 5 && selectedCases < 10 ? "text-[#121212] font-bold" : ""}>5+ стека: -5%</span>
                    <span>&bull;</span>
                    <span className={selectedCases >= 10 ? "text-[#121212] font-bold" : ""}>10+ стека: -10%</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <button
                onClick={handleAddToCart}
                className={`w-full py-3.5 rounded-md font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                  addedAnimation
                    ? "bg-[#121212] text-white"
                    : "bg-[#121212] hover:bg-neutral-800 text-white"
                }`}
              >
                {addedAnimation ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" /> Добавено в заявката!
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" /> Добави в заявка &bull; {lineTotal.toFixed(2)} лв.
                  </>
                )}
              </button>
            </div>

            <div className="border-t border-[#EBE8E3] pt-5 space-y-3.5 text-xs text-[#525252]">
              <h3 className="font-bold text-[#121212]">Доставка & Условия за презареждане</h3>
              
              <div className="flex items-start gap-3">
                <Truck className="w-4 h-4 text-[#121212] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#121212]">Директен фабричен транспорт</p>
                  <p className="text-[11px] text-[#737373]">Доставка до 24–48 часа със собствен развоен камион на производителя.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-[#121212] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#121212]">Отложено плащане Net 60 дни</p>
                  <p className="text-[11px] text-[#737373]">Зареждате веднага и плащате по банков път след реализация на стоката.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <RotateCcw className="w-4 h-4 text-[#121212] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#121212]">60 дни гаранция за връщане</p>
                  <p className="text-[11px] text-[#737373]">Възможност за връщане на непродадени цели стекове при първо зареждане.</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* 5. ОЩЕ ОТ СЪЩИЯ ПРОИЗВОДИТЕЛ */}
        {brandProducts.length > 0 && (
          <section className="mt-16 pt-10 border-t border-[#EBE8E3]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-serif text-[#121212]">Още артикули от {product.supplierName}</h2>
                <p className="text-xs text-[#737373] mt-0.5">Комбинирайте стекове за достигане на минимума от {product.supplierMinimum || 50} лв.</p>
              </div>

              <Link
                href={`/brand/${encodeURIComponent(product.supplierName)}`}
                className="px-4 py-2 bg-[#FAF9F7] hover:bg-[#F2F0EB] text-[#121212] border border-[#EBE8E3] rounded-md text-xs font-semibold self-start sm:self-auto transition-colors"
              >
                Виж целия каталог ({allProducts.filter(p => p.supplierName === product.supplierName).length})
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {brandProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/product/${p.id}`}
                  className="group bg-white rounded-xl border border-[#EBE8E3] hover:border-[#121212] p-3 flex flex-col justify-between transition-all duration-200 shadow-2xs hover:-translate-y-1"
                >
                  <div className="aspect-square bg-[#FAF9F7] rounded-lg p-2 flex items-center justify-center overflow-hidden mb-2">
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#121212] line-clamp-2 h-8 leading-snug">{p.name}</h4>
                    <p className="text-[10px] text-[#737373] mt-1 font-mono">Стек: {p.unitsPerCase} бр.</p>
                    <div className="mt-2 text-xs font-mono font-bold text-[#121212]">
                      {p.casePrice.toFixed(2)} лв.
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 6. ОТЗИВИ */}
        <section className="mt-16 pt-10 border-t border-[#EBE8E3]">
          <div className="max-w-2xl">
            <h2 className="text-xl font-serif text-[#121212]">Отзиви от търговски обекти</h2>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-3xl font-serif font-bold text-[#121212]">4.9</span>
              <div className="space-y-0.5">
                <div className="flex text-[#121212]">
                  {[1, 2, 3, 4, 5].map((s) => <Star key={s} className="w-3.5 h-3.5 fill-[#121212]" />)}
                </div>
                <p className="text-[11px] text-[#737373]">Базирано на 48 зареждания в OPTOM.BG</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              <div className="p-4 bg-[#FAF9F7] rounded-xl border border-[#EBE8E3] text-xs space-y-2">
                <div className="flex items-center gap-1 text-[#121212]">
                  {[1, 2, 3, 4, 5].map((s) => <Star key={s} className="w-3 h-3 fill-[#121212]" />)}
                  <span className="text-[10px] text-[#737373] ml-2">Преди 3 дни</span>
                </div>
                <p className="font-semibold text-[#121212]">„Бърза доставка и отличен срок на годност“</p>
                <p className="text-[#525252] text-[11px]">Стоката дойде точно в уговорения час на следващия ден. Фактурата беше коректно издадена.</p>
                <p className="text-[10px] font-mono text-[#737373] pt-1">Супермаркет Надежда, гр. София</p>
              </div>

              <div className="p-4 bg-[#FAF9F7] rounded-xl border border-[#EBE8E3] text-xs space-y-2">
                <div className="flex items-center gap-1 text-[#121212]">
                  {[1, 2, 3, 4, 5].map((s) => <Star key={s} className="w-3 h-3 fill-[#121212]" />)}
                  <span className="text-[10px] text-[#737373] ml-2">Преди 1 седмица</span>
                </div>
                <p className="font-semibold text-[#121212]">„Супер удобство с отложеното плащане“</p>
                <p className="text-[#525252] text-[11px]">Няма нужда да блокираме оборотни средства при зареждане на бързооборотни стекове.</p>
                <p className="text-[10px] font-mono text-[#737373] pt-1">Денонощен Non-Stop, гр. Пловдив</p>
              </div>
            </div>
          </div>
        </section>

        {/* 7. ПОДОБНИ АРТИКУЛИ */}
        {similarProducts.length > 0 && (
          <section className="mt-16 pt-10 border-t border-[#EBE8E3]">
            <h2 className="text-xl font-serif text-[#121212] mb-6">Подобни бързооборотни артикули</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {similarProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/product/${p.id}`}
                  className="group bg-white rounded-xl border border-[#EBE8E3] hover:border-[#121212] p-3 flex flex-col justify-between transition-all duration-200 shadow-2xs hover:-translate-y-1"
                >
                  <div className="aspect-square bg-[#FAF9F7] rounded-lg p-2 flex items-center justify-center overflow-hidden mb-2">
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#121212] line-clamp-2 h-8 leading-snug">{p.name}</h4>
                    <p className="text-[10px] text-[#737373] truncate mt-0.5">{p.supplierName}</p>
                    <div className="mt-2 text-xs font-mono font-bold text-[#121212]">
                      {p.casePrice.toFixed(2)} лв.
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

      </main>

      <CartDrawer />
    </div>
  );
}
