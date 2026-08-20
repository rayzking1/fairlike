"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  LogIn,
  Download,
  AlertCircle,
  Store,
  Truck
} from "lucide-react";
import { useCart, CartProduct } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

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
  const { 
    isCartOpen: contextOpen, 
    setIsCartOpen, 
    items: contextItems, 
    updateQuantity: contextUpdateQty, 
    clearCart: contextClearCart, 
    cartTotal: contextTotal, 
    vatAmount: contextVat, 
    grandTotal: contextGrandTotal, 
    estimatedTotalProfit: contextProfit 
  } = useCart();
  
  const { user, setIsAuthOpen } = useAuth();

  const isCartOpen = props.isOpen !== undefined ? props.isOpen : contextOpen;
  const handleClose = () => {
    if (props.onClose) props.onClose();
    setIsCartOpen(false);
  };

  const [step, setStep] = useState<"cart" | "checkout" | "success">("cart");
  const [loading, setLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [orderSuccessData, setOrderSuccessData] = useState<any>(null);

  const [formData, setFormData] = useState({
    storeName: "",
    eik: "",
    address: "",
    invoiceEmail: "",
    paymentTerms: "net60" as "net60" | "net30" | "immediate"
  });

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

  // 1. Групиране на продуктите по бранд / доставчик
  const brandGroups = useMemo(() => {
    const groups: Record<string, { supplierName: string; minimum: number; total: number; items: typeof contextItems }> = {};

    contextItems.forEach((item) => {
      const supplier = item.product.supplierName || "Официален Дистрибутор";
      const min = item.product.supplierMinimum || 50.0;
      const lineTotal = item.quantityCases * item.product.casePrice;

      if (!groups[supplier]) {
        groups[supplier] = {
          supplierName: supplier,
          minimum: min,
          total: 0,
          items: []
        };
      }

      groups[supplier].total += lineTotal;
      groups[supplier].items.push(item);
    });

    return Object.values(groups);
  }, [contextItems]);

  // 2. Проверка дали всички брандове отговарят на MOQ изискването
  const unmetMoqBrands = brandGroups.filter((g) => g.total < g.minimum);
  const isMoqSatisfied = unmetMoqBrands.length === 0;

  if (!isCartOpen) return null;

  const items = contextItems;
  const cartTotal = contextTotal;
  const vatAmount = contextVat;
  const grandTotal = contextGrandTotal;
  const estimatedTotalProfit = contextProfit;

  const getApiBaseUrl = () => {
    if (props.apiBaseUrl) return props.apiBaseUrl.replace(/\/$/, '');
    if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
    if (typeof window !== 'undefined') {
      const currentHost = window.location.hostname;
      if (currentHost.includes('-3000.app.github.dev')) {
        return `https://${currentHost.replace('-3000.app.github.dev', '-8000.app.github.dev')}`;
      }
    }
    return "https://fairlike.onrender.com";
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMoqSatisfied) {
      alert("Моля, достигнете минималния праг за поръчка за всички брандове.");
      return;
    }

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
      contextClearCart();
      setStep("success");
    } catch (err: any) {
      alert(err.message || "Възникна проблем при изпращането на поръчката.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (orderId: string) => {
    setDownloadingPdf(true);
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
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col text-slate-800">
          
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-slate-900" />
              <h2 className="text-sm font-bold text-slate-900">
                {step === "cart" && "B2B Заявка за зареждане"}
                {step === "checkout" && "Данни за фактура и доставка"}
                {step === "success" && "Успешно приета поръчка"}
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
                    <p className="text-sm font-semibold text-slate-700">Количката е празна</p>
                    <p className="text-xs text-slate-400 mt-1">Добавете стекове от каталога, за да презаредите обекта си.</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Групиране по производител с Faire-style MOQ прогрес барове */}
                    {brandGroups.map((group) => {
                      const isMet = group.total >= group.minimum;
                      const progress = Math.min(100, (group.total / group.minimum) * 100);
                      const remaining = Math.max(0, group.minimum - group.total);

                      return (
                        <div 
                          key={group.supplierName} 
                          className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs"
                        >
                          {/* Brand Header с прогрес бар */}
                          <div className="p-3.5 bg-slate-50 border-b border-slate-100 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Store className="w-3.5 h-3.5 text-slate-600" />
                                <span className="text-xs font-black text-slate-900">{group.supplierName}</span>
                              </div>
                              <span className="text-[11px] font-mono font-bold text-slate-700">
                                {group.total.toFixed(2)} лв. / мин. {group.minimum.toFixed(2)} лв.
                              </span>
                            </div>

                            {/* Прогрес бар */}
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-300 ${
                                  isMet ? "bg-emerald-500" : "bg-amber-500"
                                }`} 
                                style={{ width: `${progress}%` }}
                              />
                            </div>

                            {/* Статус съобщение */}
                            <div className="flex items-center justify-between text-[10px]">
                              {isMet ? (
                                <span className="text-emerald-700 font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Минимумът за доставка е достигнат
                                </span>
                              ) : (
                                <span className="text-amber-700 font-bold flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" /> Добавете още {remaining.toFixed(2)} лв. за праг
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Артикули от този бранд */}
                          <div className="p-3 divide-y divide-slate-100 space-y-2.5">
                            {group.items.map((item) => (
                              <div key={item.product.id} className="flex gap-3 pt-2.5 first:pt-0">
                                <img 
                                  src={item.product.imageUrl} 
                                  alt={item.product.name} 
                                  className="w-12 h-12 object-contain rounded-lg bg-slate-50 border border-slate-200 shrink-0 p-1" 
                                />
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-xs font-bold text-slate-900 truncate">{item.product.name}</h4>
                                  <p className="text-[10px] text-slate-400">Стек от {item.product.unitsPerCase} бр. &bull; {item.product.casePrice.toFixed(2)} лв./стек</p>
                                  
                                  <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-lg p-0.5">
                                      <button 
                                        onClick={() => contextUpdateQty(item.product.id, item.quantityCases - 1)}
                                        className="p-1 hover:bg-white text-slate-600 rounded cursor-pointer"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                      <span className="text-xs font-bold px-1 font-mono">{item.quantityCases}</span>
                                      <button 
                                        onClick={() => contextUpdateQty(item.product.id, item.quantityCases + 1)}
                                        className="p-1 hover:bg-white text-slate-600 rounded cursor-pointer"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    </div>
                                    <span className="text-xs font-black text-slate-900 font-mono">
                                      {(item.quantityCases * item.product.casePrice).toFixed(2)} лв.
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    <div className="pt-1">
                      <button 
                        onClick={contextClearCart}
                        className="text-[11px] text-red-500 hover:text-red-700 flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Изчисти цялата количка
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {step === "checkout" && (
              <form id="checkout-form" onSubmit={handleCreateOrder} className="space-y-4">
                {user ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-slate-950 text-white rounded-lg flex items-center justify-center font-bold text-xs">
                        {user.company_name?.charAt(0) || "B"}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{user.company_name}</p>
                        <p className="text-[10px] text-slate-500">Данните за фактура са заредени автоматично</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded-full">
                      Вписан профил
                    </span>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Имате ли B2B профил?</p>
                      <p className="text-[10px] text-slate-500">Влезте за автоматично попълване.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAuthOpen(true)}
                      className="flex items-center gap-1 bg-white border border-slate-300 text-slate-800 text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-sm hover:bg-slate-100 transition-colors cursor-pointer"
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
                        placeholder="Супермаркет Надежда / Детелина ООД" 
                        className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-950 focus:bg-white"
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
                        className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-950 focus:bg-white font-mono"
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
                          className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-950 focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Точен адрес за доставка *</label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input 
                        type="text" 
                        required
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                        placeholder="гр. София, кв. Младост 1, ул. Йерусалим 12" 
                        className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-950 focus:bg-white"
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
                            ? "border-slate-950 bg-slate-900 text-white font-bold"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <p className="text-xs">Net 60</p>
                        <p className="text-[9px] opacity-80">60 дни отсрочка</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, paymentTerms: "net30"})}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          formData.paymentTerms === "net30"
                            ? "border-slate-950 bg-slate-900 text-white font-bold"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <p className="text-xs">Net 30</p>
                        <p className="text-[9px] opacity-80">30 дни отсрочка</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, paymentTerms: "immediate"})}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          formData.paymentTerms === "immediate"
                            ? "border-emerald-600 bg-emerald-600 text-white font-bold"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <p className="text-xs">-2% Отстъпка</p>
                        <p className="text-[9px] opacity-80">Веднага</p>
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
                    <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Фактурата е изпратена на: <strong>{formData.invoiceEmail}</strong></span>
                  </p>
                  <p className="text-slate-600 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Условия: <strong>{formData.paymentTerms === "net60" ? "Отложено плащане 60 дни" : formData.paymentTerms === "net30" ? "Отложено плащане 30 дни" : "Плащане веднага (-2%)"}</strong></span>
                  </p>
                </div>

                {orderSuccessData?.orderId && (
                  <button
                    type="button"
                    onClick={() => handleDownloadInvoice(orderSuccessData.orderId)}
                    disabled={downloadingPdf}
                    className="w-full mb-2 py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>{downloadingPdf ? "Генериране на PDF..." : "Изтегли PDF фактура"}</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setStep("cart");
                    handleClose();
                  }}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
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
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Прогнозен марж за магазина:
                </span>
                <span className="font-black text-emerald-700 font-mono">+{estimatedTotalProfit.toFixed(2)} лв.</span>
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
                <div className="flex justify-between text-sm font-black text-slate-900 pt-1.5 border-t border-slate-200">
                  <span>Общо за плащане с ДДС:</span>
                  <span className="text-slate-950 font-mono">{grandTotal.toFixed(2)} лв.</span>
                </div>
              </div>

              {step === "cart" && (
                <div>
                  {isMoqSatisfied ? (
                    <button
                      onClick={() => setStep("checkout")}
                      className="w-full py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-lg shadow-slate-950/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      Продължи към фактуриране <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 font-semibold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Достигнете минимума за всички брандове, за да поръчате</span>
                      </div>
                      <button
                        disabled
                        className="w-full py-3 bg-slate-200 text-slate-400 font-bold text-xs rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        Минимумът не е достигнат
                      </button>
                    </div>
                  )}
                </div>
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
