"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  PartyPopper,
  Loader2
} from "lucide-react";
import { useCart, CartProduct } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

export default function CartDrawer() {
  const { 
    isCartOpen, 
    setIsCartOpen, 
    items, 
    updateQuantity, 
    clearCart, 
    cartTotal, 
    vatAmount, 
    grandTotal, 
    estimatedTotalProfit 
  } = useCart();
  
  const { user, token, setIsAuthOpen } = useAuth();

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
        storeName: user.company_name || user.companyName || prev.storeName || "Търговски Обект",
        eik: user.eik || prev.eik || "206894123",
        address: user.address || prev.address || "гр. София",
        invoiceEmail: user.email || prev.invoiceEmail || "",
      }));
    }
  }, [user, isCartOpen, step]);

  const brandGroups = useMemo(() => {
    const groups: Record<string, { supplierName: string; minimum: number; total: number; items: typeof items }> = {};
    items.forEach((item) => {
      const supplier = item.product.supplierName || "Официален Дистрибутор";
      const min = item.product.supplierMinimum || 50.0;
      const lineTotal = item.quantityCases * item.product.casePrice;
      if (!groups[supplier]) {
        groups[supplier] = { supplierName: supplier, minimum: min, total: 0, items: [] };
      }
      groups[supplier].total += lineTotal;
      groups[supplier].items.push(item);
    });
    return Object.values(groups);
  }, [items]);

  const unmetMoqBrands = brandGroups.filter((g) => g.total < g.minimum);
  const isMoqSatisfied = unmetMoqBrands.length === 0;

  if (!isCartOpen) return null;

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

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMoqSatisfied) {
      alert("Моля, достигнете минималния праг за поръчка за всички брандове.");
      return;
    }

    setLoading(true);
    const baseUrl = getApiBaseUrl();
    const orderPayload = {
      storeName: formData.storeName.trim() || "Търговски Обект",
      invoiceEmail: formData.invoiceEmail.trim() || user?.email || "order@optom.bg",
      address: formData.address.trim() || "гр. София",
      eik: formData.eik.trim() || "206894123",
      paymentTerms: formData.paymentTerms,
      items: items.map((it) => ({
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
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${baseUrl}/api/orders`, {
        method: "POST",
        headers,
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
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col text-slate-800">
          
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
                setIsCartOpen(false);
                if (step === "success") setStep("cart");
              }}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
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
                    <p className="text-xs text-slate-400 mt-1">Добавете стекове от каталога, за да оформите поръчка.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {brandGroups.map((group) => {
                      const isMet = group.total >= group.minimum;
                      const progress = Math.min(100, (group.total / group.minimum) * 100);
                      const remaining = Math.max(0, group.minimum - group.total);

                      return (
                        <div key={group.supplierName} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                          <div className={`p-3 border-b space-y-1.5 ${isMet ? "bg-emerald-50/50 border-emerald-100" : "bg-slate-50 border-slate-100"}`}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-slate-900">{group.supplierName}</span>
                              <span className="text-[11px] font-mono font-bold text-slate-700">
                                {group.total.toFixed(2)} лв. / мин. {group.minimum.toFixed(2)} лв.
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${isMet ? "bg-emerald-600" : "bg-slate-800"}`} style={{ width: `${progress}%` }} />
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className={isMet ? "text-emerald-700 font-bold" : "text-amber-700"}>
                                {isMet ? "Минимумът е достигнат!" : `Остават ${remaining.toFixed(2)} лв.`}
                              </span>
                              <span className="text-slate-400">MOQ: {group.minimum.toFixed(0)} лв.</span>
                            </div>
                          </div>

                          <div className="p-3 divide-y divide-slate-100 space-y-2">
                            {group.items.map((it) => (
                              <div key={it.product.id} className="flex gap-3 pt-2 first:pt-0">
                                <img src={it.product.imageUrl} alt={it.product.name} className="w-10 h-10 object-contain rounded-lg bg-slate-50 border border-slate-200 shrink-0 p-1" />
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-xs font-bold text-slate-900 truncate">{it.product.name}</h4>
                                  <p className="text-[10px] text-slate-400">{it.product.casePrice.toFixed(2)} лв./стек</p>
                                  <div className="flex items-center justify-between mt-1.5">
                                    <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-lg p-0.5">
                                      <button onClick={() => updateQuantity(it.product.id, it.quantityCases - 1)} className="p-1 hover:bg-white text-slate-600 rounded">
                                        <Minus className="w-3 h-3" />
                                      </button>
                                      <span className="text-xs font-bold px-1 font-mono">{it.quantityCases}</span>
                                      <button onClick={() => updateQuantity(it.product.id, it.quantityCases + 1)} className="p-1 hover:bg-white text-slate-600 rounded">
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    </div>
                                    <span className="text-xs font-black text-slate-900 font-mono">
                                      {(it.quantityCases * it.product.casePrice).toFixed(2)} лв.
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    <button onClick={clearCart} className="text-[11px] text-red-500 hover:text-red-700 flex items-center gap-1 font-semibold">
                      <Trash2 className="w-3 h-3" /> Изчисти количката
                    </button>
                  </div>
                )}
              </>
            )}

            {step === "checkout" && (
              <form id="checkout-form" onSubmit={handleCreateOrder} className="space-y-3.5">
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Търговски обект / Фирма *</label>
                    <input 
                      type="text" 
                      required
                      value={formData.storeName}
                      onChange={(e) => setFormData({...formData, storeName: e.target.value})}
                      placeholder="напр. Супермаркет Надежда" 
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">ЕИК</label>
                      <input 
                        type="text" 
                        value={formData.eik}
                        onChange={(e) => setFormData({...formData, eik: e.target.value})}
                        placeholder="206894123" 
                        className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Имейл за фактура *</label>
                      <input 
                        type="email" 
                        required
                        value={formData.invoiceEmail}
                        onChange={(e) => setFormData({...formData, invoiceEmail: e.target.value})}
                        placeholder="fakturi@firma.bg" 
                        className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Точен адрес за доставка *</label>
                    <input 
                      type="text" 
                      required
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      placeholder="гр. София, бул. България 1" 
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Условия за плащане</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, paymentTerms: "net60"})}
                        className={`p-2 rounded-xl border text-center transition-all ${formData.paymentTerms === "net60" ? "border-slate-950 bg-slate-900 text-white font-bold" : "bg-slate-50 text-slate-600"}`}
                      >
                        <p className="text-xs">Net 60</p>
                        <p className="text-[9px] opacity-80">60 дни отсрочка</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, paymentTerms: "net30"})}
                        className={`p-2 rounded-xl border text-center transition-all ${formData.paymentTerms === "net30" ? "border-slate-950 bg-slate-900 text-white font-bold" : "bg-slate-50 text-slate-600"}`}
                      >
                        <p className="text-xs">Net 30</p>
                        <p className="text-[9px] opacity-80">30 дни отсрочка</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, paymentTerms: "immediate"})}
                        className={`p-2 rounded-xl border text-center transition-all ${formData.paymentTerms === "immediate" ? "border-emerald-600 bg-emerald-600 text-white font-bold" : "bg-slate-50 text-slate-600"}`}
                      >
                        <p className="text-xs">-2%</p>
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
                <p className="text-xs text-slate-500 mt-1">Номер на заявка: <strong className="text-slate-900 font-mono">#{orderSuccessData?.orderId}</strong></p>

                {orderSuccessData?.orderId && (
                  <button
                    type="button"
                    onClick={() => handleDownloadInvoice(orderSuccessData.orderId)}
                    disabled={downloadingPdf}
                    className="w-full my-4 py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>{downloadingPdf ? "Генериране на PDF..." : "Изтегли PDF фактура"}</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setStep("cart");
                    setIsCartOpen(false);
                  }}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Обратно към каталога
                </button>
              </div>
            )}
          </div>

          {step !== "success" && items.length > 0 && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-2.5">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Данъчна основа:</span>
                <span className="font-semibold text-slate-800">{cartTotal.toFixed(2)} лв.</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>ДДС (20%):</span>
                <span className="font-semibold text-slate-800">{vatAmount.toFixed(2)} лв.</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 pt-1.5 border-t border-slate-200">
                <span>Общо за плащане:</span>
                <span className="font-mono">{grandTotal.toFixed(2)} лв.</span>
              </div>

              {step === "cart" && (
                <button
                  onClick={() => {
                    if (!user) setIsAuthOpen(true);
                    else setStep("checkout");
                  }}
                  disabled={!isMoqSatisfied}
                  className="w-full py-3 bg-slate-950 hover:bg-slate-800 disabled:bg-slate-200 text-white disabled:text-slate-400 font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2"
                >
                  <span>{isMoqSatisfied ? "Продължи към фактуриране" : "Минимумът не е достигнат"}</span>
                  {isMoqSatisfied && <ArrowRight className="w-4 h-4" />}
                </button>
              )}

              {step === "checkout" && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep("cart")}
                    className="w-1/3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                  >
                    Назад
                  </button>
                  <button
                    type="submit"
                    form="checkout-form"
                    disabled={loading}
                    className="w-2/3 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{loading ? "Изпращане..." : "Потвърди поръчката"}</span>
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
