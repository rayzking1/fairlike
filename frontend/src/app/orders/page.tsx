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
  ShoppingBag, 
  Building, 
  Calendar, 
  Check,
  Package
} from "lucide-react";
import HeaderAuthButton from "@/components/HeaderAuthButton";
import CartDrawer from "@/components/CartDrawer";
import { useCart, CartProduct } from "@/context/CartContext";

interface NormalizedOrderItem {
  productId: string;
  quantityCases: number;
  casePrice: number;
  productName: string;
  unitsPerCase: number;
  imageUrl: string;
  supplierName: string;
}

export default function OrdersPage() {
  const { addToCart, setIsCartOpen } = useCart();
  const [orders, setOrders] = useState<any[]>([]);
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

        let prodList: CartProduct[] = [];
        if (productsRes.ok) {
          prodList = await productsRes.json();
          setCatalogProducts(prodList);
        }

        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          setOrders(ordersData);
        }
      } catch (err) {
        console.error("Грешка при зареждане на поръчките:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Функция за надеждно извличане на артикулите от поръчката
  const extractItemsFromOrder = (order: any): NormalizedOrderItem[] => {
    let rawList: any[] = [];

    if (Array.isArray(order.items) && order.items.length > 0) {
      rawList = order.items;
    } else if (Array.isArray(order.order_items) && order.order_items.length > 0) {
      rawList = order.order_items;
    } else if (typeof order.items === "string") {
      try {
        rawList = JSON.parse(order.items);
      } catch (e) {}
    } else if (typeof order.items_json === "string") {
      try {
        rawList = JSON.parse(order.items_json);
      } catch (e) {}
    } else if (Array.isArray(order.items_json)) {
      rawList = order.items_json;
    }

    // Ако няма конкретни артикули, но има subtotal, разделяме на базови артикули
    if (!Array.isArray(rawList) || rawList.length === 0) {
      const estimatedSubtotal = Number(order.subtotal || order.total || 0);
      if (estimatedSubtotal > 0 && catalogProducts.length > 0) {
        const firstProd = catalogProducts[0];
        const calculatedCases = Math.max(1, Math.round(estimatedSubtotal / (firstProd.casePrice || 20)));
        return [{
          productId: firstProd.id,
          quantityCases: calculatedCases,
          casePrice: firstProd.casePrice,
          productName: firstProd.name,
          unitsPerCase: firstProd.unitsPerCase || 24,
          imageUrl: firstProd.imageUrl,
          supplierName: firstProd.supplierName
        }];
      }
      return [];
    }

    return rawList.map((item: any) => {
      const pId = String(item.productId || item.product_id || item.id || "1");
      const matchedCatalogItem = catalogProducts.find((p) => String(p.id) === pId);

      const qty = Number(item.quantityCases || item.quantity_cases || item.quantity || item.qty || 1);
      const price = Number(item.casePrice || item.case_price || matchedCatalogItem?.casePrice || 20);
      const name = item.productName || item.product_name || item.name || matchedCatalogItem?.name || `Стек артикул #${pId.slice(0, 6)}`;
      const units = Number(item.unitsPerCase || item.units_per_case || matchedCatalogItem?.unitsPerCase || 24);
      const img = item.imageUrl || item.image_url || matchedCatalogItem?.imageUrl || "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=500&q=80";
      const supplier = item.supplierName || item.supplier_name || matchedCatalogItem?.supplierName || "Официален Дистрибутор";

      return {
        productId: pId,
        quantityCases: qty,
        casePrice: price,
        productName: name,
        unitsPerCase: units,
        imageUrl: img,
        supplierName: supplier
      };
    });
  };

  // 1-Click Reorder логика
  const handleReorder = (order: any) => {
    setReorderingId(order.id);
    const normalizedItems = extractItemsFromOrder(order);

    normalizedItems.forEach((item) => {
      const productToAdd: CartProduct = {
        id: item.productId,
        name: item.productName,
        casePrice: item.casePrice,
        rrpPrice: item.casePrice * 1.35,
        unitsPerCase: item.unitsPerCase,
        category: "Напитки & Снаксове",
        supplierName: item.supplierName,
        supplierMinimum: 50,
        imageUrl: item.imageUrl,
        barcode: "3800000000000"
      };

      addToCart(productToAdd, item.quantityCases);
    });

    setTimeout(() => {
      setReorderingId(null);
      setIsCartOpen(true);
    }, 400);
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
              const items = extractItemsFromOrder(order);
              const totalItemsCount = items.reduce((sum, it) => sum + it.quantityCases, 0);

              const dateString = order.createdAt || order.created_at;
              const formattedDate = dateString 
                ? new Date(dateString).toLocaleDateString("bg-BG", { day: "2-digit", month: "long", year: "numeric" })
                : "Днес";
              const storeTitle = order.storeName || order.store_name || "Търговски обект";
              const terms = order.paymentTerms || order.payment_terms || "Net 60";
              const profit = Number(order.estimatedProfit || order.estimated_profit || 0);
              const totalAmount = Number(order.total || order.subtotal || 0);

              return (
                <div 
                  key={order.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all overflow-hidden"
                >
                  <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Фактура №</span>
                        <p className="text-sm font-black font-mono text-slate-950">#{String(order.id).slice(0, 10)}</p>
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
                          <Building className="w-3.5 h-3.5 text-slate-400" /> {storeTitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {getStatusBadge(order.status)}

                      <button
                        onClick={() => handleReorder(order)}
                        disabled={reorderingId === order.id}
                        className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer hover:scale-105"
                      >
                        {reorderingId === order.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-400" /> Добавено!
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-3.5 h-3.5 text-emerald-400" /> 1-Click Reorder
                          </>
                        )}
                      </button>

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

                  <div className="p-4 sm:p-5 space-y-4">
                    {items.length > 0 && (
                      <div className="divide-y divide-slate-100">
                        {items.map((it, idx) => (
                          <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-3">
                              <span className="w-7 h-7 rounded-lg bg-slate-100 font-mono font-black text-slate-800 flex items-center justify-center text-xs border border-slate-200">
                                {it.quantityCases}x
                              </span>
                              <div>
                                <p className="font-bold text-slate-900">{it.productName}</p>
                                <p className="text-[10px] text-slate-400 font-mono">Стек от {it.unitsPerCase} бр. &bull; {it.casePrice.toFixed(2)} лв./стек</p>
                              </div>
                            </div>
                            <span className="font-black font-mono text-slate-900">
                              {(it.quantityCases * it.casePrice).toFixed(2)} лв.
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 p-3 rounded-xl">
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>Стекове: <strong className="text-slate-800">{totalItemsCount} бр.</strong></span>
                        <span>Условия: <strong className="text-slate-800 uppercase font-mono">{terms}</strong></span>
                        <span className="text-emerald-700 font-bold">Марж: +{profit.toFixed(2)} лв.</span>
                      </div>

                      <div className="text-right flex items-center justify-end gap-3">
                        <span className="text-xs text-slate-400">Общо с ДДС:</span>
                        <span className="text-base font-black text-slate-950 font-mono">
                          {totalAmount.toFixed(2)} лв.
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
