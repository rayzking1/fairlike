"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  FileText, 
  Download, 
  ChevronLeft, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  Truck, 
  PackageCheck, 
  AlertCircle, 
  ShoppingBag, 
  Building, 
  Calendar, 
  Sparkles,
  ArrowRight,
  Check
} from "lucide-react";
import HeaderAuthButton from "@/components/HeaderAuthButton";
import CartDrawer from "@/components/CartDrawer";
import { useCart, CartProduct } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

interface OrderItem {
  productId: string;
  quantityCases: number;
  casePrice: number;
  productName?: string;
  unitsPerCase?: number;
  imageUrl?: string;
  supplierName?: string;
}

interface Order {
  id: string;
  createdAt: string;
  storeName: string;
  invoiceEmail: string;
  address: string;
  eik: string;
  paymentTerms: string;
  subtotal: number;
  vat: number;
  total: number;
  estimatedProfit: number;
  status?: "pending" | "processing" | "shipped" | "delivered";
  items: OrderItem[];
}

export default function OrdersPage() {
  const { addToCart, setIsCartOpen, clearCart } = useCart();
  const { user, setIsAuthOpen } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<CartProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

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
    const fetchData = async () => {
      setLoading(true);
      const baseUrl = getApiBaseUrl();
      try {
        const [ordersRes, productsRes] = await Promise.all([
          fetch(`${baseUrl}/api/orders`),
          fetch(`${baseUrl}/api/products`)
        ]);

        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          setOrders(ordersData);
        }

        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setCatalogProducts(productsData);
        }
      } catch (err) {
        console.error("Грешка при зареждане на историята на поръчките:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 1-Click Reorder логика
  const handleReorder = (order: Order) => {
    setReorderingId(order.id);

    order.items.forEach((item) => {
      // Намираме пълния продукт от каталога или създаваме валиден CartProduct обект
      const fullProduct = catalogProducts.find((p) => p.id === item.productId) || {
        id: item.productId,
        name: item.productName || "FMCG Продукт",
        casePrice: item.casePrice,
        rrpPrice: item.casePrice * 1.35,
        unitsPerCase: item.unitsPerCase || 24,
        category: "Напитки & Снаксове",
        supplierName: item.supplierName || "Официален Дистрибутор",
        supplierMinimum: 50,
        imageUrl: item.imageUrl || "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=500&q=80",
        barcode: "3800000000000"
      };

      addToCart(fullProduct, item.quantityCases);
    });

    setTimeout(() => {
      setReorderingId(null);
      setIsCartOpen(true);
    }, 600);
  };

  const handleDownloadInvoice = async (orderId: string) => {
    setDownloadingId(orderId);
    const baseUrl = getApiBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/api/orders/${orderId}/invoice`);
      if (!res.ok) throw new Error("Фактурата не можа да бъде генерирана");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Faktura_${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || "Грешка при сваляне на файла");
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "delivered":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <PackageCheck className="w-3.5 h-3.5" /> Доставена
          </span>
        );
      case "shipped":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Truck className="w-3.5 h-3.5" /> Натоварена / Пътува
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5" /> В подготовка
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Приета заявка
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased">
      {/* Навигация */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
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
          </div>
        </div>
      </header>

      {/* Основно съдържание */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              B2B Клиентски Портал
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 mt-1.5">
              История на зарежданията & Фактури
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Преглеждайте издадените фактури по ЗДДС и повтаряйте поръчките си с 1 клик.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <ShoppingBag className="w-4 h-4" /> Ново зареждане
          </Link>
        </div>

        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block w-8 h-8 border-3 border-slate-950 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs text-slate-500 font-semibold">Зареждане на вашите поръчки...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs">
            <FileText className="w-12 h-12 stroke-1 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">Все още нямате направени заявки</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              След като направите първото зареждане, електронните фактури и опцията за бързо повторно зареждане ще се появят тук.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-slate-950 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-slate-800 transition-all"
            >
              Към каталога на едро &rarr;
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const totalItemsCount = order.items?.reduce((sum, it) => sum + it.quantityCases, 0) || 0;
              const formattedDate = order.createdAt 
                ? new Date(order.createdAt).toLocaleDateString("bg-BG", { day: "2-digit", month: "long", year: "numeric" })
                : "Днес";

              return (
                <div 
                  key={order.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all overflow-hidden"
                >
                  {/* Горен панел на поръчката */}
                  <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Фактура №</span>
                        <p className="text-sm font-black font-mono text-slate-950">#{order.id.slice(0, 10)}</p>
                      </div>
                      <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Дата</span>
                        <p className="text-xs font-bold text-slate-800 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" /> {formattedDate}
                        </p>
                      </div>
                      <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Обект</span>
                        <p className="text-xs font-bold text-slate-800 flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-slate-400" /> {order.storeName || "Търговски обект"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {getStatusBadge(order.status)}

                      {/* 1-CLICK REORDER БУТОН */}
                      <button
                        onClick={() => handleReorder(order)}
                        disabled={reorderingId === order.id}
                        className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer hover:scale-105"
                      >
                        {reorderingId === order.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-400" /> Зареждане...
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-3.5 h-3.5 text-emerald-400" /> 1-Click Reorder
                          </>
                        )}
                      </button>

                      {/* PDF Сваляне */}
                      <button
                        onClick={() => handleDownloadInvoice(order.id)}
                        disabled={downloadingId === order.id}
                        className="p-2 text-slate-600 hover:text-slate-950 hover:bg-slate-200 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                        title="Изтегли PDF фактура"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Детайли за стоките в поръчката */}
                  <div className="p-4 sm:p-5 space-y-4">
                    <div className="divide-y divide-slate-100">
                      {order.items?.map((it, idx) => (
                        <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-md bg-slate-100 font-mono font-bold text-slate-700 flex items-center justify-center text-[11px]">
                              {it.quantityCases}x
                            </span>
                            <div>
                              <p className="font-bold text-slate-900">{it.productName || `Стек артикул #${it.productId.slice(0, 6)}`}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{it.casePrice.toFixed(2)} лв./стек</p>
                            </div>
                          </div>
                          <span className="font-black font-mono text-slate-900">
                            {(it.quantityCases * it.casePrice).toFixed(2)} лв.
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Финансов баланс на поръчката */}
                    <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 p-3 rounded-xl">
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>Стекове: <strong className="text-slate-800">{totalItemsCount} бр.</strong></span>
                        <span>Условия: <strong className="text-slate-800 uppercase font-mono">{order.paymentTerms || "Net 60"}</strong></span>
                        <span className="text-emerald-700 font-bold">Марж: +{(order.estimatedProfit || 0).toFixed(2)} лв.</span>
                      </div>

                      <div className="text-right flex items-center justify-end gap-3">
                        <span className="text-xs text-slate-400">Общо с ДДС:</span>
                        <span className="text-base font-black text-slate-950 font-mono">
                          {order.total.toFixed(2)} лв.
                        </span>
                      </div>
                    </div>
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
