"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ShoppingBag, 
  ChevronLeft, 
  Download, 
  Truck, 
  Building,
  Lock,
  ArrowRight
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface Order {
  id: string;
  storeName: string;
  invoiceEmail: string;
  address: string;
  eik?: string;
  paymentTerms: string;
  subtotal: number;
  vat: number;
  total: number;
  status: string;
  created_at: string;
}

export default function MyOrdersPage() {
  const { user, setIsAuthOpen } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const getApiBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
    }
    if (typeof window !== 'undefined') {
      const currentHost = window.location.hostname;
      if (currentHost.includes('-3000.app.github.dev')) {
        return `https://${currentHost.replace('-3000.app.github.dev', '-8000.app.github.dev')}`;
      }
    }
    return "https://fairlike.onrender.com";
  };

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const baseUrl = getApiBaseUrl();
      try {
        const queryParam = user.role === "retailer" ? `?email=${encodeURIComponent(user.email)}` : "";
        const res = await fetch(`${baseUrl}/api/orders${queryParam}`);
        if (res.ok) {
          const data = await res.json();
          setOrders(data);
        }
      } catch (err) {
        console.error("Грешка при зареждане на поръчки:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  const handleDownloadInvoice = async (orderId: string) => {
    setDownloadingId(orderId);
    const baseUrl = getApiBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/api/orders/${orderId}/invoice`);
      if (!res.ok) throw new Error("Фактурата не можа да бъде изтеглена");
      
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

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-200">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Влезте в профила си</h2>
          <p className="text-xs text-slate-500 mb-6">
            За да прегледате историята на вашите B2B поръчки и електронни фактури, е необходимо да влезете в профила на обекта си.
          </p>
          <div className="space-y-2">
            <button
              onClick={() => setIsAuthOpen(true)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer"
            >
              Вход в профила
            </button>
            <Link
              href="/"
              className="block w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
            >
              Към каталога
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const totalSpent = orders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/" 
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Към магазина
            </Link>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 text-white p-1.5 rounded-lg">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm font-extrabold tracking-tight">Моите поръчки & Фактури</h1>
                <p className="text-[10px] text-slate-400 font-semibold">{user.company_name} (ЕИК: {user.eik})</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        {/* KPI обобщение */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Общо заредена стока</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{totalSpent.toFixed(2)} лв.</h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-sm">
              с ДДС
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Общ брой заявки</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{orders.length} бр.</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <ShoppingBag className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Търговски обект</p>
              <h3 className="text-sm font-black text-slate-900 mt-1 truncate max-w-[180px]">{user.company_name}</h3>
              <p className="text-[11px] text-slate-400 truncate">{user.address}</p>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <Building className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Списък с поръчки */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">История на заявките за презареждане</h2>
            <p className="text-xs text-slate-500">Всички поръчки, генерирани от вашия профил</p>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs font-semibold">
              Зареждане на поръчките...
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <ShoppingBag className="w-12 h-12 stroke-1 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">Все още нямате направени поръчки</p>
              <p className="text-xs text-slate-400">Презаредете рафтовете на вашия магазин с директни цени от производител.</p>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow hover:bg-blue-700 transition-all"
              >
                Към каталога <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Поръчка #</th>
                    <th className="py-3 px-4">Адрес за доставка</th>
                    <th className="py-3 px-4">Условия</th>
                    <th className="py-3 px-4">Сума без ДДС</th>
                    <th className="py-3 px-4">Общо с ДДС</th>
                    <th className="py-3 px-4">Статус</th>
                    <th className="py-3 px-4 text-right">Фактура</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        #{o.id}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-[200px] truncate">
                        {o.address}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-semibold text-[11px]">
                        {o.paymentTerms === "immediate" ? "Веднага (-2%)" : o.paymentTerms === "net30" ? "Net 30 дни" : "Net 60 дни"}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {o.subtotal.toFixed(2)} лв.
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-600 text-sm">
                        {o.total.toFixed(2)} лв.
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-[11px] font-bold border border-amber-200/60">
                          <Truck className="w-3 h-3" /> Чака доставка
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDownloadInvoice(o.id)}
                          disabled={downloadingId === o.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-blue-500 hover:text-blue-600 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{downloadingId === o.id ? "Сваляне..." : "PDF"}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
