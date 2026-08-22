"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Check
} from "lucide-react";
import HeaderAuthButton from "@/components/HeaderAuthButton";
import CartDrawer from "@/components/CartDrawer";
import { useCart, CartProduct } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

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
  const router = useRouter();
  const { user } = useAuth();
  const { addToCart, setIsCartOpen } = useCart();
  
  const [orders, setOrders] = useState<any[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<CartProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role === "supplier") {
      router.replace("/supplier");
    }
  }, [user, router]);

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

        if (productsRes.ok) {
          const prodList = await productsRes.json();
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

  const extractItemsFromOrder = (order: any): NormalizedOrderItem[] => {
    let rawList: any[] = [];
    if (Array.isArray(order.items) && order.items.length > 0) rawList = order.items;
    else if (Array.isArray(order.order_items)) rawList = order.order_items;
    else if (typeof order.items === "string") {
      try { rawList = JSON.parse(order.items); } catch (e) {}
    } else if (typeof order.items_json === "string") {
      try { rawList = JSON.parse(order.items_json); } catch (e) {}
    }

    if (!Array.isArray(rawList) || rawList.length === 0) {
      const subtotal = Number(order.subtotal || order.total || 0);
      if (subtotal > 0 && catalogProducts.length > 0) {
        const firstProd = catalogProducts[0];
        const cases = Math.max(1, Math.round(subtotal / (firstProd.casePrice || 20)));
        return [{
          productId: firstProd.id,
          quantityCases: cases,
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
      const matched = catalogProducts.find((p) => String(p.id) === pId);
      return {
        productId: pId,
        quantityCases: Number(item.quantityCases || item.quantity_cases || item.quantity || 1),
        casePrice: Number(item.casePrice || item.case_price || matched?.casePrice || 20),
        productName: item.productName || item.product_name || matched?.name || `Стек #${pId.slice(0, 6)}`,
        unitsPerCase: Number(item.unitsPerCase || item.units_per_case || matched?.unitsPerCase || 24),
        imageUrl: item.imageUrl || item.image_url || matched?.imageUrl || "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=500",
        supplierName: item.supplierName || item.supplier_name || matched?.supplierName || "Официален Дистрибутор"
      };
    });
  };

  const handleReorder = (order: any) => {
    setReorderingId(order.id);
    const items = extractItemsFromOrder(order);

    items.forEach((item) => {
      const productToAdd: CartProduct = {
        id: item.productId,
        name: item.productName,
        casePrice: item.casePrice,
        rrpPrice: item.casePrice * 1.35,
        unitsPerCase: item.unitsPerCase,
        category: "Безалкохолни & Води",
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
      if (!res.ok) throw new Error("Фактурата не можа да бъде свалена");
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
      alert(err.message || "Грешка при сваляне");
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "delivered":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium bg-[#FAF9F7] text-[#121212] border border-[#EBE8E3]"><PackageCheck className="w-3.5 h-3.5" /> Доставена</span>;
      case "shipped":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium bg-[#FAF9F7] text-[#121212] border border-[#EBE8E3]"><Truck className="w-3.5 h-3.5" /> Натоварена</span>;
      case "processing":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium bg-[#FAF9F7] text-[#121212] border border-[#EBE8E3]"><Clock className="w-3.5 h-3.5" /> В подготовка</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium bg-[#FAF9F7] text-[#121212] border border-[#EBE8E3]"><CheckCircle2 className="w-3.5 h-3.5" /> Приета заявка</span>;
    }
  };

  if (user?.role === "supplier") return null;

  return (
    <div className="min-h-screen bg-white text-[#121212] antialiased selection:bg-[#121212] selection:text-white">
      
      {/* ХЕДЪР */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#EBE8E3]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 h-18 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-1 text-xs font-semibold text-[#525252] hover:text-[#121212] transition-colors">
              <ChevronLeft className="w-4 h-4" /> Каталог
            </Link>
            <div className="h-4 w-px bg-[#EBE8E3]" />
            <Link href="/" className="text-xl font-serif font-black tracking-[0.2em] text-[#121212] uppercase">
              OPTOM
            </Link>
          </div>
          <HeaderAuthButton />
        </div>
      </header>

      {/* СЪДЪРЖАНИЕ */}
      <main className="max-w-[1100px] mx-auto px-4 sm:px-8 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <span className="text-[10px] font-mono tracking-widest uppercase text-[#737373] font-bold">
              B2B Клиентски Портал
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[#121212] mt-1">
              История на зарежданията & Фактури
            </h1>
            <p className="text-xs text-[#737373] mt-0.5">
              Преглеждайте издадените фактури по ЗДДС и повтаряйте поръчките си с 1 клик.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#121212] hover:bg-neutral-800 text-white rounded-md text-xs font-semibold shadow-xs transition-all"
          >
            <ShoppingBag className="w-3.5 h-3.5" /> Ново зареждане
          </Link>
        </div>

        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block w-6 h-6 border-2 border-[#121212] border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs text-[#737373]">Зареждане на вашите поръчки...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-[#FAF9F7] rounded-xl border border-[#EBE8E3] p-12 text-center">
            <FileText className="w-8 h-8 stroke-1 text-neutral-400 mx-auto mb-2" />
            <h3 className="text-xs font-bold text-[#121212]">Все още нямате направени заявки</h3>
            <p className="text-[11px] text-[#737373] mt-1">След като направите поръчка, фактурите ще се генерират тук.</p>
          </div>
        ) : (
          <div className="space-y-4">
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
                <div key={order.id} className="bg-white rounded-xl border border-[#EBE8E3] shadow-2xs overflow-hidden">
                  <div className="p-4 sm:p-5 bg-[#FAF9F7] border-b border-[#EBE8E3] flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4">
                      <div>
                        <span className="text-[10px] uppercase font-mono text-[#737373]">Фактура №</span>
                        <p className="text-sm font-bold font-mono text-[#121212]">#{String(order.id).slice(0, 10)}</p>
                      </div>
                      <div className="h-6 w-px bg-[#EBE8E3] hidden sm:block" />
                      <div>
                        <span className="text-[10px] uppercase font-mono text-[#737373]">Дата</span>
                        <p className="text-xs font-medium text-[#121212] flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-[#737373]" /> {formattedDate}
                        </p>
                      </div>
                      <div className="h-6 w-px bg-[#EBE8E3] hidden sm:block" />
                      <div>
                        <span className="text-[10px] uppercase font-mono text-[#737373]">Обект</span>
                        <p className="text-xs font-medium text-[#121212] flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-[#737373]" /> {storeTitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {getStatusBadge(order.status)}

                      <button
                        onClick={() => handleReorder(order)}
                        disabled={reorderingId === order.id}
                        className="px-3 py-1.5 bg-[#121212] hover:bg-neutral-800 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        {reorderingId === order.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[3]" /> Добавено!
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-3.5 h-3.5" /> 1-Click Reorder
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleDownloadInvoice(order.id)}
                        disabled={downloadingId === order.id}
                        className="p-1.5 text-[#525252] hover:text-[#121212] hover:bg-white rounded-md border border-[#EBE8E3] transition-colors cursor-pointer"
                        title="Изтегли PDF фактура"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 space-y-4">
                    {items.length > 0 && (
                      <div className="divide-y divide-[#F2F0EB]">
                        {items.map((it, idx) => (
                          <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded bg-[#FAF9F7] font-mono font-bold text-[#121212] flex items-center justify-center text-xs border border-[#EBE8E3]">
                                {it.quantityCases}x
                              </span>
                              <div>
                                <p className="font-semibold text-[#121212]">{it.productName}</p>
                                <p className="text-[10px] text-[#737373] font-mono">{it.casePrice.toFixed(2)} лв./стек</p>
                              </div>
                            </div>
                            <span className="font-bold font-mono text-[#121212]">
                              {(it.quantityCases * it.casePrice).toFixed(2)} лв.
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-3 border-t border-[#EBE8E3] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF9F7] p-3 rounded-lg text-xs">
                      <div className="flex items-center gap-4 text-[#737373]">
                        <span>Стекове: <strong className="text-[#121212]">{totalItemsCount} бр.</strong></span>
                        <span>Условия: <strong className="text-[#121212] uppercase font-mono">{terms}</strong></span>
                        <span>Марж: <strong className="text-[#121212] font-mono">+{profit.toFixed(2)} лв.</strong></span>
                      </div>

                      <div className="text-right flex items-center justify-end gap-2">
                        <span className="text-xs text-[#737373]">Общо с ДДС:</span>
                        <span className="text-sm font-bold text-[#121212] font-mono">
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
