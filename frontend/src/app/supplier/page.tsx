'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Store, Plus, Package, ArrowLeft, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

export default function SupplierDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Форма за нов продукт
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Шоколади');
  const [barcode, setBarcode] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierMinimum, setSupplierMinimum] = useState('50');
  const [unitsPerCase, setUnitsPerCase] = useState('24');
  const [casePrice, setCasePrice] = useState('');
  const [rrpPrice, setRrpPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

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
    return 'http://127.0.0.1:8000';
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/orders`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMsg(false);

    const payload = {
      name,
      category,
      barcode,
      supplierName,
      supplierMinimum: parseFloat(supplierMinimum) || 50,
      unitsPerCase: parseInt(unitsPerCase) || 1,
      casePrice: parseFloat(casePrice),
      rrpPrice: parseFloat(rrpPrice),
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&q=80',
    };

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccessMsg(true);
        setName('');
        setBarcode('');
        setCasePrice('');
        setRrpPrice('');
        setImageUrl('');
      }
    } catch (err) {
      console.error('Грешка при добавяне:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white pb-20">
      <header className="border-b border-neutral-800 px-6 py-4 bg-neutral-950 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-2">
            <Store className="h-6 w-6 text-emerald-400" />
            <span className="font-black tracking-tight text-lg">OPTOM.BG // Brand Portal</span>
          </div>
        </div>
        <span className="text-xs bg-neutral-800 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full">
          Производител & Дистрибутор
        </span>
      </header>

      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">
        {/* Форма за качване на артикул */}
        <div className="lg:col-span-5 bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Plus size={20} className="text-emerald-400" />
            <h2 className="font-bold text-base">Листване на нов стек/артикул</h2>
          </div>
          <p className="text-xs text-neutral-400">
            Добавените артикули стават моментално достъпни за сканиране и поръчка от кварталните магазини.
          </p>

          {successMsg && (
            <div className="bg-emerald-950/50 border border-emerald-500/50 p-3 rounded-xl flex items-center gap-2 text-emerald-300 text-xs">
              <CheckCircle2 size={16} /> Продуктът е добавен успешно в каталога!
            </div>
          )}

          <form onSubmit={handleAddProduct} className="space-y-3 text-xs">
            <div>
              <label className="text-neutral-400 block mb-1">Име на артикула</label>
              <input required placeholder="напр. Вафла Боровец 55g" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 outline-none focus:border-emerald-500" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-neutral-400 block mb-1">Категория</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 outline-none focus:border-emerald-500 text-white">
                  <option value="Шоколади">Шоколади</option>
                  <option value="Снаксове">Снаксове</option>
                  <option value="Напитки">Напитки</option>
                  <option value="Сладки изделия">Сладки изделия</option>
                </select>
              </div>
              <div>
                <label className="text-neutral-400 block mb-1">EAN-13 Баркод</label>
                <input required placeholder="3800000000000" value={barcode} onChange={(e) => setBarcode(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 outline-none focus:border-emerald-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-neutral-400 block mb-1">Име на производител</label>
                <input required placeholder="напр. Монделийз" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="text-neutral-400 block mb-1">Мин. праг за поръчка (лв.)</label>
                <input required type="number" placeholder="50" value={supplierMinimum} onChange={(e) => setSupplierMinimum(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 outline-none focus:border-emerald-500" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-neutral-400 block mb-1">Бр. в стек</label>
                <input required type="number" placeholder="24" value={unitsPerCase} onChange={(e) => setUnitsPerCase(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="text-neutral-400 block mb-1">Едрова стек (лв.)</label>
                <input required type="number" step="0.01" placeholder="38.40" value={casePrice} onChange={(e) => setCasePrice(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="text-neutral-400 block mb-1">Препоръчителна RRP</label>
                <input required type="number" step="0.01" placeholder="2.29" value={rrpPrice} onChange={(e) => setRrpPrice(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 outline-none focus:border-emerald-500" />
              </div>
            </div>

            <div>
              <label className="text-neutral-400 block mb-1">Линк към снимка на продукта</label>
              <input placeholder="https://..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 outline-none focus:border-emerald-500" />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 mt-4 transition-colors"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Публикувай артикул в OPTOM.BG'}
            </button>
          </form>
        </div>

        {/* Списък с входящи заявки от магазини */}
        <div className="lg:col-span-7 bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package size={20} className="text-emerald-400" />
              <h2 className="font-bold text-base">Входящи заявки за доставка</h2>
            </div>
            <button onClick={fetchOrders} className="text-xs text-neutral-400 hover:text-white underline">
              Обнови
            </button>
          </div>

          {loadingOrders ? (
            <div className="py-20 text-center text-neutral-500 text-xs">Зареждане на поръчки...</div>
          ) : orders.length === 0 ? (
            <div className="py-20 text-center text-neutral-500 text-xs">Все още няма получени заявки.</div>
          ) : (
            <div className="space-y-3">
              {orders.map((ord: any) => (
                <div key={ord.orderId} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400">#{ord.orderId}</span>
                    <span className="bg-neutral-800 px-2.5 py-0.5 rounded-full text-[10px] text-neutral-300 font-semibold">
                      {ord.paymentTerms === 'net60' ? 'Net 60 дни' : ord.paymentTerms === 'net30' ? 'Net 30 дни' : 'Предплатено'}
                    </span>
                  </div>
                  <div className="text-neutral-300">
                    <p className="font-semibold text-white">{ord.storeName} {ord.eik ? `(ЕИК: ${ord.eik})` : ''}</p>
                    <p className="text-[11px] text-neutral-400">{ord.address}</p>
                    <p className="text-[11px] text-neutral-400">Имейл за фактура: {ord.invoiceEmail}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                    <span className="text-neutral-400">Обща сума с ДДС:</span>
                    <span className="font-bold text-white text-sm">{ord.total.toFixed(2)} лв.</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
