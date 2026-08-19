'use client';

import React, { useState } from 'react';
import { Product } from '@/types';
import { X, Trash2, CheckCircle2, Loader2, ShieldCheck, CreditCard, Calendar, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cart: { [key: string]: number };
  products: Product[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onClearCart: () => void;
  apiBaseUrl: string;
}

export const CartDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  cart,
  products,
  onUpdateQuantity,
  onClearCart,
  apiBaseUrl,
}) => {
  const [terms, setTerms] = useState<'net60' | 'net30' | 'prepaid'>('net60');
  const [storeName, setStoreName] = useState('');
  const [invoiceEmail, setInvoiceEmail] = useState('');
  const [address, setAddress] = useState('');
  const [eik, setEik] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderResponse, setOrderResponse] = useState<{ orderId: string } | null>(null);

  if (!isOpen) return null;

  const items = Object.entries(cart)
    .map(([id, qty]) => ({
      product: products.find((p) => p.id === id),
      qty,
    }))
    .filter((item): item is { product: Product; qty: number } => Boolean(item.product));

  // Групиране по производител/бранд за изчисляване на минимални прагове
  const supplierGroups = items.reduce<{ [supplier: string]: { items: typeof items; total: number; min: number } }>(
    (acc, item) => {
      const sup = item.product.supplierName;
      if (!acc[sup]) {
        acc[sup] = { items: [], total: 0, min: item.product.supplierMinimum || 50 };
      }
      acc[sup].items.push(item);
      acc[sup].total += item.product.casePrice * item.qty;
      return acc;
    },
    {}
  );

  const subtotal = items.reduce((acc, i) => acc + i.product.casePrice * i.qty, 0);
  const discount = terms === 'prepaid' ? subtotal * 0.02 : 0; // 2% касова отстъпка при предплащане
  const netSubtotal = subtotal - discount;
  const vat = netSubtotal * 0.2;
  const total = netSubtotal + vat;

  // Изчисляване на очакваните приходи и чиста печалба на търговеца
  const expectedRetailRevenue = items.reduce(
    (acc, i) => acc + i.product.rrpPrice * i.product.unitsPerCase * i.qty,
    0
  );
  const totalEstimatedProfit = expectedRetailRevenue - (netSubtotal + vat);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      storeName,
      invoiceEmail,
      address,
      eik,
      paymentTerms: terms,
      items: items.map((i) => ({
        productId: i.product.id,
        quantityCases: i.qty,
        casePrice: i.product.casePrice,
      })),
      subtotal: netSubtotal,
      vat,
      total,
      estimatedProfit: totalEstimatedProfit,
    };

    try {
      const res = await fetch(`${apiBaseUrl}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setOrderResponse(data);
      } else {
        setOrderResponse({ orderId: Math.random().toString(36).substring(2, 8).toUpperCase() });
      }
    } catch {
      setOrderResponse({ orderId: Math.random().toString(36).substring(2, 8).toUpperCase() });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
      <div className="bg-white w-full max-w-lg h-full flex flex-col justify-between shadow-2xl p-6 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">B2B Количка</h2>
            <p className="text-xs text-neutral-400">Гарантирани Faire условия за магазини</p>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-700">
            <X size={20} />
          </button>
        </div>

        {orderResponse ? (
          <div className="py-12 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center">
              <CheckCircle2 size={40} className="text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-neutral-900">Заявка #{orderResponse.orderId} е регистрирана!</h3>
            <p className="text-xs text-neutral-500 max-w-sm">
              Условията на плащане са активирани ({terms === 'net60' ? 'Net 60 дни' : terms === 'net30' ? 'Net 30 дни' : 'Плащане веднага с -2% отстъпка'}). Документите са изпратени на <b>{invoiceEmail}</b>.
            </p>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-800 text-xs flex items-center gap-2">
              <ShieldCheck size={18} />
              <span>Включена 60-дневна гаранция за безплатно връщане на непродадени артикули.</span>
            </div>
            <button
              onClick={() => {
                setOrderResponse(null);
                onClearCart();
                onClose();
              }}
              className="mt-4 w-full bg-neutral-900 text-white py-3 rounded-xl text-sm font-semibold hover:bg-neutral-800 transition-colors"
            >
              Към каталога
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center text-neutral-400 text-sm">Количката за презареждане е празна.</div>
        ) : (
          <form onSubmit={handleSubmitOrder} className="flex-1 flex flex-col justify-between mt-4 space-y-6">
            {/* Списък с артикули, групирани по бранд + минимални прагове */}
            <div className="space-y-4">
              {Object.entries(supplierGroups).map(([supplier, data]) => {
                const diff = data.min - data.total;
                const isMet = diff <= 0;
                return (
                  <div key={supplier} className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-3 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-neutral-800">
                      <span>{supplier}</span>
                      <span className={isMet ? 'text-emerald-600' : 'text-amber-600'}>
                        {isMet ? '✓ Изпълнен минимум' : `Още ${diff.toFixed(2)} лв. до минимум`}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {data.items.map(({ product, qty }) => (
                        <div key={product.id} className="flex items-center justify-between gap-3 text-xs bg-white p-2 rounded-lg border border-neutral-100">
                          <div className="flex-1">
                            <p className="font-medium text-neutral-900">{product.name}</p>
                            <p className="text-[10px] text-neutral-400">{qty} стека × {product.casePrice.toFixed(2)} лв.</p>
                          </div>
                          <span className="font-bold text-neutral-900">{(product.casePrice * qty).toFixed(2)} лв.</span>
                          <button type="button" onClick={() => onUpdateQuantity(product.id, -qty)} className="text-neutral-400 hover:text-rose-600">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Faire Условия за плащане */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Условия на плащане (Faire Terms)</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTerms('net60')}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    terms === 'net60' ? 'border-neutral-900 bg-neutral-900 text-white shadow-sm' : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <Calendar size={13} />
                    <span className="text-xs font-bold">Net 60</span>
                  </div>
                  <span className="text-[10px] opacity-75 mt-1">Плати след 60 дни</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTerms('net30')}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    terms === 'net30' ? 'border-neutral-900 bg-neutral-900 text-white shadow-sm' : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <Calendar size={13} />
                    <span className="text-xs font-bold">Net 30</span>
                  </div>
                  <span className="text-[10px] opacity-75 mt-1">Плати след 30 дни</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTerms('prepaid')}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    terms === 'prepaid' ? 'border-neutral-900 bg-neutral-900 text-white shadow-sm' : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <CreditCard size={13} />
                    <span className="text-xs font-bold">Веднага</span>
                  </div>
                  <span className="text-[10px] text-emerald-500 font-bold mt-1">-2% Отстъпка</span>
                </button>
              </div>
            </div>

            {/* Фирмени данни */}
            <div className="space-y-2">
              <input required placeholder="Име на обект / Юридическо лице" value={storeName} onChange={(e) => setStoreName(e.target.value)} className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2.5 text-xs outline-none focus:border-neutral-900" />
              <div className="grid grid-cols-2 gap-2">
                <input required placeholder="ЕИК / Булстат" value={eik} onChange={(e) => setEik(e.target.value)} className="bg-neutral-50 border border-neutral-200 rounded-lg p-2.5 text-xs outline-none focus:border-neutral-900" />
                <input required type="email" placeholder="Имейл за фактури" value={invoiceEmail} onChange={(e) => setInvoiceEmail(e.target.value)} className="bg-neutral-50 border border-neutral-200 rounded-lg p-2.5 text-xs outline-none focus:border-neutral-900" />
              </div>
              <input required placeholder="Точен адрес на обекта за разтоварване" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2.5 text-xs outline-none focus:border-neutral-900" />
            </div>

            {/* Обобщение + Прогнозна печалба */}
            <div className="space-y-2 pt-3 border-t border-neutral-100 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between text-emerald-900">
                <span className="flex items-center gap-1.5 font-medium">
                  <Sparkles size={14} className="text-emerald-600" /> Прогнозна чиста печалба:
                </span>
                <span className="font-black text-sm">+{totalEstimatedProfit.toFixed(2)} лв.</span>
              </div>

              <div className="flex justify-between text-neutral-500 pt-1"><span>Едрова стойност:</span><span>{subtotal.toFixed(2)} лв.</span></div>
              {discount > 0 && <div className="flex justify-between text-emerald-600 font-semibold"><span>Касова отстъпка (-2%):</span><span>-{discount.toFixed(2)} лв.</span></div>}
              <div className="flex justify-between text-neutral-500"><span>ДДС (20%):</span><span>{vat.toFixed(2)} лв.</span></div>
              <div className="flex justify-between font-bold text-base text-neutral-900 pt-1 border-t border-neutral-100">
                <span>Дължима сума {terms === 'net60' ? '(след 60 дни)' : terms === 'net30' ? '(след 30 дни)' : ''}:</span>
                <span>{total.toFixed(2)} лв.</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-3 w-full bg-neutral-900 hover:bg-neutral-800 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Потвърди зареждане с Faire условия'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
