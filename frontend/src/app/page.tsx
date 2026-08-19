'use client';

import React, { useState } from 'react';
import { ProductCard } from '@/components/ProductCard';
import { CartDrawer } from '@/components/CartDrawer';
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal';
import { Product } from '@/types';
import { Search, ShoppingBag, Store, Camera } from 'lucide-react';

const SAMPLE_PRODUCTS: Product[] = [
  { id: '1', name: 'Шоколад Milka Alpine Milk 100g', category: 'Шоколади', barcode: '7622210286124', supplierName: 'Монделийз', unitsPerCase: 24, casePrice: 38.40, rrpPrice: 2.29, imageUrl: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&q=80' },
  { id: '2', name: 'Чипс Chio Паприка 140g', category: 'Снаксове', barcode: '5900547001234', supplierName: 'Интерснак', unitsPerCase: 18, casePrice: 43.20, rrpPrice: 3.19, imageUrl: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&q=80' },
  { id: '3', name: 'Енергийна напитка Red Bull 250ml', category: 'Напитки', barcode: '9002490100070', supplierName: 'Ред Бул Дистрибуция', unitsPerCase: 24, casePrice: 48.00, rrpPrice: 2.79, imageUrl: 'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=500&q=80' },
  { id: '4', name: 'Кроасан 7 Days Max Какао 85g', category: 'Сладки изделия', barcode: '5201360521204', supplierName: 'Чипита', unitsPerCase: 30, casePrice: 36.00, rrpPrice: 1.69, imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&q=80' },
];

export default function Home() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Всички');
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const categories = ['Всички', 'Шоколади', 'Снаксове', 'Напитки', 'Сладки изделия'];

  const handleUpdate = (id: string, delta: number) => {
    setCart((prev) => {
      const next = (prev[id] || 0) + delta;
      if (next <= 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: next };
    });
  };

  const handleScanBarcode = (barcode: string) => {
    setSearch(barcode);
    const foundProduct = SAMPLE_PRODUCTS.find((p) => p.barcode === barcode);
    if (foundProduct) {
      handleUpdate(foundProduct.id, 1);
    }
  };

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const filtered = SAMPLE_PRODUCTS.filter((p) =>
    (category === 'Всички' || p.category === category) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search))
  );

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 pb-16">
      <header className="sticky top-0 z-40 bg-white border-b border-neutral-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Store className="h-6 w-6 text-neutral-900" />
            <span className="font-black tracking-tight text-xl">OPTOM.BG</span>
          </div>

          <div className="flex-1 max-w-md relative flex items-center">
            <Search className="absolute left-3 text-neutral-400 pointer-events-none" size={16} />
            <input
              type="text"
              placeholder="Търси продукт или баркод..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-neutral-100 border-none rounded-lg pl-9 pr-10 py-2 text-sm focus:ring-2 focus:ring-neutral-900 outline-none"
            />
            <button
              onClick={() => setIsScannerOpen(true)}
              className="absolute right-2.5 p-1 text-neutral-500 hover:text-neutral-900 active:scale-95"
              title="Сканирай баркод с камерата"
            >
              <Camera size={18} />
            </button>
          </div>

          <button onClick={() => setIsCartOpen(true)} className="relative p-2 text-neutral-700 hover:text-neutral-900">
            <ShoppingBag size={24} />
            {totalItems > 0 && <span className="absolute -top-1 -right-1 bg-neutral-900 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{totalItems}</span>}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Зареждане на обекта</h1>
            <p className="text-xs text-neutral-500">Цени на едро без включен ДДС</p>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {categories.map((c) => (
              <button key={c} onClick={() => setCategory(c)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${category === c ? 'bg-neutral-900 text-white' : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100'}`}>{c}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} quantity={cart[p.id] || 0} onUpdateQuantity={handleUpdate} />
          ))}
        </div>
      </main>

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanBarcode}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        products={SAMPLE_PRODUCTS}
        onUpdateQuantity={handleUpdate}
        onClearCart={() => setCart({})}
      />
    </div>
  );
}

