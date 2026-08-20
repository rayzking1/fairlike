"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Building, 
  Mail, 
  MapPin, 
  CheckCircle2, 
  FileText,
  LogIn
} from "lucide-react";
import { useCart, CartProduct } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

interface CartDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
  cart?: Record<string, number>;
  products?: any[];
  onUpdateQuantity?: (id: string, delta: number) => void;
  onClearCart?: () => void;
  apiBaseUrl?: string;
  [key: string]: any;
}

export default function CartDrawer(props: CartDrawerProps) {
  const contextCart = useCart();
  const { user, setIsAuthOpen } = useAuth();

  // Използва контекста или подадените props
  const isCartOpen = props.isOpen !== undefined ? props.isOpen : contextCart.isCartOpen;
  const handleClose = () => {
    if (props.onClose) props.onClose();
    contextCart.setIsCartOpen(false);
  };

  const [step, setStep] = useState<"cart" | "checkout" | "success">("cart");
  const [loading, setLoading] = useState(false);
  const [orderSuccessData, setOrderSuccessData] = useState<any>(null);

  const [formData, setFormData] = useState({
    storeName: "",
    eik: "",
    address: "",
    invoiceEmail: "",
    paymentTerms: "net60" as "net60" | "net30" | "immediate"
  });

  // Автоматично попълване от профила на логнатия магазин
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        storeName: user.company_name || "",
        eik: user.eik || "",
        address: user.address || "",
        invoiceEmail: user.email || "",
      }));
    }
  }, [user]);

  if (!isCartOpen) return null;

  // Изчисляване на артикулите (съвместимост с props и context)
  let items = contextCart.items;
  if (props.cart && props.products && (!items || items.length === 0)) {
    items = Object.entries(props.cart)
      .filter(([_, qty]) => (qty as number) > 0)
      .map(([id, qty]) => {
        const prod = props.products?.find((p) => p.id === id) || {
          id,
          name: `Артикул #${id}`,
          category: "Каталог",
          barcode: "",
          supplierName: "Дистрибутор",
          supplierMinimum: 50,
          unitsPerCase: 24,
          casePrice: 30.0,
          rrpPrice: 2.0,
          imageUrl: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&q=80"
        };
        return {
          product: prod as CartProduct,
          quantityCases: qty as number
        };
      });
  }

  const updateQuantity = (id: string, qty: number) => {
    if (props.onUpdateQuantity) {
      const current = (props.cart && props.cart[id]) || 0;
      props.onUpdateQuantity(id, qty - current);
    }
    contextCart.updateQuantity(id, qty);
  };

  const clearCart = () => {
    if (props.onClearCart) props.onClearCart();
    contextCart.clearCart();
  };

  const cartTotal = items.reduce((sum, it) => sum + it.quantityCases * it.product.casePrice, 0);
  const vatAmount = cartTotal * 0.20;
  const grandTotal = cartTotal + vatAmount;
  const estimatedTotalProfit = items.reduce((sum, it) => {
    const rev = it.product.rrpPrice * it.product.unitsPerCase;
    return sum + Math.max(0, rev - it.product.casePrice) * it.quantityCases;
  }, 0);

  const getApiBaseUrl = () => {
    if (props.apiBaseUrl) return props.apiBaseUrl.replace(/\/$/, '');
    if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
    return "https://fairlike.onrender.com";
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const baseUrl = getApiBaseUrl();
    const orderPayload = {
      storeName: formData.storeName,
      invoiceEmail: formData.invoiceEmail,
      address: formData.address,
      eik: formData.eik,
      paymentTerms: formData.paymentTerms,
      items: items.map(it => ({
        productId: it.product.id,
        quantityCases: it.quantityCases,
        casePrice: it.product.casePrice
      })),
      subtotal: cartTotal,
      vat: vatAmount,
      total: grandTotal,
      estimatedProfit: estimatedTotalProfit
    };

    try {
      const res = await fetch(`${baseUrl}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Грешка при създаване на поръчката");

      setOrderSuccessData(data);
      clearCart();
      setStep("success");
    } catch (err: any) {
      alert(err.message || "Възникна проблем при изпращането на поръчката.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">
                {step === "cart" && "B2B Количка"}
                {step === "checkout" && "Финализиране на поръчка"}
                {step === "success" && "Успешна поръчка"}
              </h2>
            </div>
            <button 
              onClick={() => {
                handleClose();
                if (step === "success") setStep("cart");
              }}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {step === "cart" && (
              <>
                {items.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <ShoppingBag className="w-12 h-12 stroke-1 mb-3 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-700">Количката ви е празна</p>
                    <p className="text-xs text-slate-400 mt-1">Добавете артикули в стекове от каталога, за да презаредите обекта си.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.product.id} className="flex gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <img 
                          src={item.product.imageUrl} 
                          alt={item.product.name} 
                          className="w-14 h-14 object-cover rounded-lg bg-white border border-slate-200 shrink-0" 
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 truncate">{item.product.name}</h4>
                          <p className="text-[11px] text-slate-500">Стек от {item.product.unitsPerCase} бр. &bull; {item.product.casePrice.toFixed(2)} лв./стек</p>
                          
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-0.5">
                              <button 
                                onClick={() => updateQuantity(item.product.id, item.quantityCases - 1)}
                                className="p-1 hover:bg-slate-100 text-slate-600 rounded cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-bold px-1">{item.quantityCases}</span>
                              <button 
                                onClick={() => updateQuantity(item.product.id, item.quantityCases + 1)}
                                className="p-1 hover:bg-slate-100 text-slate-600 rounded cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <span className="text-xs font-bold text-blue-600">
                              {(item.quantityCases * item.product.casePrice).toFixed(2)} лв.
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="pt-2">
                      <button 
                        onClick={clearCart}
                        className="text-[11px] text-red-500 hover:text-red-700 flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Изчисти количката
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {step === "checkout" && (
              <form id="checkout-form" onSubmit={handleCreateOrder} className="space-y-4">
                {user ? (
                  <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-xs">
                        {user.company_name?.charAt(0) || "B"}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-blue-900">{user.company_name}</p>
                        <p className="text-[10px] text-blue-700">Данните за фактура са попълнени автоматично</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-blue-200/60 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                      Вписан профил
                    </span>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-amber-900">Имате ли B2B профил?</p>
                      <p className="text-[10px] text-amber-700">Влезте, за да се попълнят данните ви автоматично.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAuthOpen(true)}
                      className="flex items-center gap-1 bg-white border border-amber-300 text-amber-900 text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-sm hover:bg-amber-100/50 transition-colors cursor-pointer"
                    >
                      <LogIn className="w-3.5 h-3.5" /> Вход
                    </button>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Име на търговския обект / Фирма *</label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input 
                        type="text" 
                        required
                        value={formData.storeName}
                        onChange={(e) => setFormData({...formData, storeName: e.target.value})}
                        placeholder="напр. Супермаркет Надежда / Детелина ООД" 
                        className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">ЕИК / БУЛСТАТ</label>
                      <input 
                        type="text" 
                        value={formData.eik}
                        onChange={(e) => setFormData({...formData, eik: e.target.value})}
                        placeholder="206894123" 
                        className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Имейл за фактура *</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input 
                          type="email" 
                          required
                          value={formData.invoiceEmail}
                          onChange={(e) => setFormData({...formData, invoiceEmail: e.target.value})}
                          placeholder="schetovodstvo@firma.bg" 
                          className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Точен адрес за доставка на стековете *</label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input 
                        type="text" 
                        required
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                        placeholder="гр. София, кв. Младост 1, ул. Йерусалим 12" 
                        className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Условия за B2B плащане</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, paymentTerms: "net60"})}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          formData.paymentTerms === "net60"
                            ? "border-blue-600 bg-blue-50/60 text-blue-900 font-bold"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <p className="text-xs">Net 60</p>
                        <p className="text-[9px] text-slate-500">60 дни отсрочка</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, paymentTerms: "net30"})}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          formData.paymentTerms === "net30"
                            ? "border-blue-600 bg-blue-50/60 text-blue-900 font-bold"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <p className="text-xs">Net 30</p>
                        <p className="text-[9px] text-slate-500">30 дни отсрочка</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, paymentTerms: "immediate"})}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          formData.paymentTerms === "immediate"
                            ? "border-emerald-600 bg-emerald-50/60 text-emerald-900 font-bold"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <p className="text-xs text-emerald-700 font-bold">-2% Отстъпка</p>
                        <p className="text-[9px] text-slate-500">Плати веднага</p>
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            )}

            {step === "success" && (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900">Поръчката е приета!</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Номер на заявка: <strong className="text-slate-900 font-mono">#{orderSuccessData?.orderId}</strong>
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 my-4 w-full text-left text-xs space-y-2">
                  <p className="text-slate-600 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Фактурата е изпратена на: <strong>{formData.invoiceEmail}</strong></span>
                  </p>
                  <p className="text-slate-600 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Условия: <strong>{formData.paymentTerms === "net60" ? "Отложено плащане 60 дни" : formData.paymentTerms === "net30" ? "Отложено плащане 30 дни" : "Плащане веднага (-2%)"}</strong></span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setStep("cart");
                    handleClose();
                  }}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer"
                >
                  Обратно към каталога
                </button>
              </div>
            )}
          </div>

          {step !== "success" && items.length > 0 && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
                <span className="text-emerald-800 font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Прогнозен марж:
                </span>
                <span className="font-extrabold text-emerald-700 font-mono">+{estimatedTotalProfit.toFixed(2)} лв.</span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Данъчна основа (без ДДС):</span>
                  <span className="font-semibold text-slate-800">{cartTotal.toFixed(2)} лв.</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>ДДС (20%):</span>
                  <span className="font-semibold text-slate-800">{vatAmount.toFixed(2)} лв.</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1.5 border-t border-slate-200">
                  <span>Общо с ДДС:</span>
                  <span className="text-blue-600 font-mono">{grandTotal.toFixed(2)} лв.</span>
                </div>
              </div>

              {step === "cart" && (
                <button
                  onClick={() => setStep("checkout")}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  Продължи към фактуриране <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {step === "checkout" && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep("cart")}
                    className="w-1/3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Назад
                  </button>
                  <button
                    type="submit"
                    form="checkout-form"
                    disabled={loading}
                    className="w-2/3 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? "Изпращане..." : "Потвърди поръчката"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { CartDrawer };
