"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Building2, 
  Package, 
  PlusCircle, 
  Upload, 
  Clock, 
  DollarSign, 
  ChevronLeft, 
  Truck, 
  ShieldAlert, 
  Lock 
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import CsvImportModal from "@/components/CsvImportModal";

interface Product {
  id: string;
  name: string;
  category: string;
  barcode: string;
  supplierName: string;
  supplierMinimum: number;
  unitsPerCase: number;
  casePrice: number;
  rrpPrice: number;
  imageUrl: string;
}

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

export default function SupplierDashboard() {
  const { user, isAuthenticated, setIsAuthOpen } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [, setLoading] = useState(true);

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

  const fetchData = async () => {
    setLoading(true);
    const baseUrl = getApiBaseUrl();
    try {
      const [prodRes, orderRes] = await Promise.all([
        fetch(`${baseUrl}/api/products`),
        fetch(`${baseUrl}/api/orders`)
      ]);
      if (prodRes.ok) setProducts(await prodRes.json());
      if (orderRes.ok) setOrders(await orderRes.json());
    } catch (e) {
      console.error("Грешка при зареждане:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === "supplier") {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  // 1. Нелогнат потребител
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-200">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Изисква се вход за дистрибутори</h2>
          <p className="text-xs text-slate-500 mb-6">
            Този портал е предназначен само за верифицирани производители и официални вносители.
          </p>
          <div className="space-y-2">
            <button
              onClick={() => setIsAuthOpen(true)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer"
            >
              Вход в B2B профил
            </button>
            <Link
              href="/"
              className="block w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
            >
              Върни се в магазина
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Логнат като Магазин (retailer)
  if (user?.role !== "supplier") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-200">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Ограничен достъп</h2>
          <p className="text-xs text-slate-500 mb-2">
            Вие сте влезли с профил на <strong>Магазин / Купувач ({user?.company_name})</strong>.
          </p>
          <p className="text-xs text-slate-400 mb-6">
            Само профили с роля <strong>„Бранд / Вносител“</strong> имат права за импорт на артикули и преглед на входящи заявки.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-all"
          >
            <ChevronLeft className="w-4 h-4" /> Към каталога за зареждане
          </Link>
        </div>
      </div>
    );
  }

  const totalVolume = orders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Топ навигация */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
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
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm font-extrabold tracking-tight">Портал за Производители & Дистрибутори</h1>
                <p className="text-[10px] text-slate-400 font-semibold">{user?.company_name} (ЕИК: {user?.eik})</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsImportOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" /> Масов импорт на ценова листа
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-6 space-y-6">
        {/* KPI Картодържачи */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Общ оборот от заявки</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{totalVolume.toFixed(2)} лв.</h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Входящи B2B поръчки</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{orders.length} бр.</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Артикули в каталог</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{products.length} бр.</h3>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <Package className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Секция: Каталог */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Вашият активен B2B каталог</h2>
              <p className="text-xs text-slate-500">Артикули, достъпни за зареждане от магазините в реално време</p>
            </div>
            <button
              onClick={() => setIsImportOpen(true)}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" /> Добави нови артикули
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Артикул</th>
                  <th className="py-3 px-4">Категория</th>
                  <th className="py-3 px-4">Баркод (EAN)</th>
                  <th className="py-3 px-4">Бр. в стек</th>
                  <th className="py-3 px-4">Цена стек (без ДДС)</th>
                  <th className="py-3 px-4">Препор. цена / бр.</th>
                  <th className="py-3 px-4">Доставчик</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <img src={p.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover bg-slate-100" />
                      <span>{p.name}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{p.category}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{p.barcode}</td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{p.unitsPerCase} бр.</td>
                    <td className="py-3 px-4 font-bold text-blue-600">{p.casePrice.toFixed(2)} лв.</td>
                    <td className="py-3 px-4 text-slate-700">{p.rrpPrice.toFixed(2)} лв.</td>
                    <td className="py-3 px-4 text-slate-500">{p.supplierName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Секция: Поръчки */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Входящи заявки за презареждане</h2>
            <p className="text-xs text-slate-500">Списък с поръчки, генерирани от търговски обекти</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Поръчка #</th>
                  <th className="py-3 px-4">Магазин / Обект</th>
                  <th className="py-3 px-4">Адрес на доставка</th>
                  <th className="py-3 px-4">Условия</th>
                  <th className="py-3 px-4">Сума с ДДС</th>
                  <th className="py-3 px-4">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                      Все още няма входящи поръчки.
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">#{o.id}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{o.storeName}</td>
                      <td className="py-3 px-4 text-slate-600">{o.address}</td>
                      <td className="py-3 px-4 text-slate-600 uppercase font-semibold text-[11px]">
                        {o.paymentTerms === "immediate" ? "Веднага (-2%)" : o.paymentTerms === "net30" ? "Net 30 дни" : "Net 60 дни"}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-600">{o.total.toFixed(2)} лв.</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-[11px] font-bold">
                          <Truck className="w-3 h-3" /> Чака доставка
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <CsvImportModal 
        isOpen={isImportOpen} 
        onClose={() => setIsImportOpen(false)} 
        onSuccess={() => {
          fetchData();
        }} 
      />
    </div>
  );
}
