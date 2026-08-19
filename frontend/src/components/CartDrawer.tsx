import React, { useState } from 'react';
import { Product } from '@/types';
import { X, Trash2, CheckCircle2, Loader2 } from 'lucide-react';

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
  const [method, setMethod] = useState<'cod' | 'card'>('cod');
  const [storeName, setStoreName] = useState('');
  const [invoiceEmail, setInvoiceEmail] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderResponse, setOrderResponse] = useState<{ orderId: string } | null>(null);

  if (!isOpen) return null;

  const items = Object.entries(cart)
    .map(([id, qty]) => ({
      product: products.find((p) => p.id === id),
      qty,
    }))
    .filter((item): item is { product: Product; qty: number } => Boolean(item.product));

  const subtotal = items.reduce((acc, i) => acc + (i.product.casePrice || 0) * i.qty, 0);
  const vat = subtotal * 0.2;
  const total = subtotal + vat;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      storeName,
      invoiceEmail,
      address,
      paymentMethod: method,
      items: items.map((i) => ({
        productId: i.product.id,
        quantityCases: i.qty,
        casePrice: i.product.casePrice,
      })),
      subtotal,
      vat,
      total,
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
      }
    } catch (err) {
      console.error('Грешка при изпращане на поръчката:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
      <div className="bg-white w-full max-w-md h-full flex flex-col justify-between shadow-2xl p-6 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <h2 className="text-lg font-bold text-neutral-900">Количка за презареждане</h2>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-700">
            <X size={20} />
          </button>
        </div>

        {orderResponse ? (
          <div className="py-12 flex flex-col items-center text-center space-y-3">
            <CheckCircle2 size={52} className="text-emerald-600" />
            <h3 className="text-xl font-bold text-neutral-900">Заявка #{orderResponse.orderId} е приета!</h3>
            <p className="text-sm text-neutral-500">
              Потвърждението е изпратено на <b>{invoiceEmail}</b>. Заявката е регистрирана на сървъра.
            </p>
            <button
              onClick={() => {
                setOrderResponse(null);
                onClearCart();
                onClose();
              }}
              className="mt-4 w-full bg-neutral-900 text-white py-2.5 rounded-lg text-sm font-medium"
            >
              Нова поръчка
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-neutral-400 text-sm">Количката е празна.</div>
        ) : (
          <form onSubmit={handleSubmitOrder} className="flex-1 flex flex-col justify-between mt-4 space-y-6">
            <div className="space-y-3">
              {items.map(({ product, qty }) => (
                <div key={product.id} className="flex items-center justify-between gap-3 text-sm border-b border-neutral-100 pb-2">
                  <div className="flex-1">
                    <p className="font-medium text-neutral-900">{product.name}</p>
                    <p className="text-xs text-neutral-400">{qty} стека × {product.casePrice.toFixed(2)} лв.</p>
                  </div>
                  <span className="font-bold text-neutral-900">{(product.casePrice * qty).toFixed(2)} лв.</span>
                  <button type="button" onClick={() => onUpdateQuantity(product.id, -qty)} className="text-neutral-400 hover:text-rose-600">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-2 border-t border-neutral-100">
              <input required placeholder="Име на обект / Фирма" value={storeName} onChange={(e) => setStoreName(e.target.value)} className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-sm outline-none focus:border-neutral-900" />
              <input required type="email" placeholder="Имейл за фактура" value={invoiceEmail} onChange={(e) => setInvoiceEmail(e.target.value)} className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-sm outline-none focus:border-neutral-900" />
              <input required placeholder="Адрес за доставка" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-sm outline-none focus:border-neutral-900" />
            </div>

            <div className="space-y-1.5 pt-2 border-t border-neutral-100 text-sm">
              <div className="flex justify-between text-neutral-500"><span>Междинна сума:</span><span>{subtotal.toFixed(2)} лв.</span></div>
              <div className="flex justify-between text-neutral-500"><span>ДДС (20%):</span><span>{vat.toFixed(2)} лв.</span></div>
              <div className="flex justify-between font-bold text-base text-neutral-900 pt-1 border-t border-neutral-100"><span>Общо:</span><span>{total.toFixed(2)} лв.</span></div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-3 w-full bg-neutral-900 hover:bg-neutral-800 text-white py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Потвърди и изпрати към сървъра'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
