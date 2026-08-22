"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  ArrowRight, 
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
  Check,
  Percent
} from "lucide-react";
import { useCart, CartProduct, getTieredPrice } from "@/context/CartContext";
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
    estimatedTotalProfit: contextProfit,
    totalSavedFromTiers
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

  const syncUserData = () => {
    let rawUser: any = user;
    if (!rawUser && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("b2b_user") || localStorage.getItem("optom_b2b_session");
        if (stored) rawUser = JSON.parse(stored);
      } catch (e) {}
    }

    if (rawUser) {
      setFormData((prev) => ({
        ...prev,
        storeName: rawUser.company_name || rawUser.companyName || rawUser.storeName || prev.storeName || "Търговски Обект",
        eik: rawUser.eik || prev.eik || "206894123",
        address: rawUser.address || prev.address || "гр. София",
        invoiceEmail: rawUser.email || prev.invoiceEmail || "",
      }));
    }
  };

  useEffect(() => {
    syncUserData();
  }, [user, isCartOpen, step]);

  const handleProceedToCheckout = () => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    syncUserData();
    setStep("checkout");
  };

  const brandGroups = useMemo(() => {
    const groups: Record<string, { supplierName: string; minimum: number; total: number; items: typeof contextItems }> = {};

    contextItems.forEach((item) => {
      const supplier = item.product.supplierName || "Официален Дистрибутор";
      const min = item.product.supplierMinimum || 50.0;
      const { effectivePrice } = getTieredPrice(item.product, item.quantityCases);
      const lineTotal = item.quantityCases * effectivePrice;

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
      storeName: formData.storeName || (user?.company_name) || "Търговски Обект",
      invoiceEmail: formData.invoiceEmail || (user?.email) || "office@optom.bg",
      address: formData.address || (user?.address) || "гр. София",
      eik: formData.eik || (user?.eik) || "206894123",
      paymentTerms: formData.paymentTerms,
      items: items.map(it => {
        const { effectivePrice } = getTieredPrice(it.product, it.quantityCases);
        return {
          productId: it.product.id,
          quantityCases: it.quantityCases,
          casePrice: effectivePrice
        };
      }),
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
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/35 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col text-[#121212] border-l border-[#EBE8E3]">
          
          {/* Хедър на чекмеджето */}
          <div className="p-4.5 border-b border-[#EBE8E3] flex items-center justify-between bg-white">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#121212]" />
              <h2 className="text-sm font-serif font-normal text-[#121212]">
                {step === "cart" && "B2B Заявка за зареждане"}
                {step === "checkout" && "Данни за фактура и доставка"}
                {step === "success" && "Успешно приета заявка"}
              </h2>
            </div>
            <button 
              onClick={() => {
                handleClose();
                if (step === "success") setStep("cart");
              }}
              className="p-1 text-[#737373] hover:text-[#121212] rounded-md transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Тяло */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {step === "cart" && (
              <>
                {items.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#737373]">
                    <ShoppingBag className="w-10 h-10 stroke-1 mb-2 text-neutral-300" />
                    <p className="text-xs font-semibold text-[#121212]">Количката е празна</p>
                    <p className="text-[11px] text-[#737373] mt-0.5">Добавете стекове от каталога, за да оформите заявка.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {brandGroups.map((group) => {
                      const isMet = group.total >= group.minimum;
                      const progress = Math.min(100, (group.total / group.minimum) * 100);
                      const remaining = Math.max(0, group.minimum - group.total);

                      return (
                        <div 
                          key={group.supplierName} 
                          className="rounded-xl border border-[#EBE8E3] bg-white overflow-hidden"
                        >
                          {/* Горна част на бранда */}
                          <div className="p-3.5 bg-[#FAF9F7] border-b border-[#EBE8E3] space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Store className="w-3.5 h-3.5 text-[#121212]" />
                                <span className="text-xs font-bold text-[#121212]">{group.supplierName}</span>
                              </div>
                              <span className="text-[11px] font-mono text-[#737373]">
                                {group.total.toFixed(2)} лв. / мин. {group.minimum.toFixed(2)} лв.
                              </span>
                            </div>

                            {/* Фина монохромна прогрес лента */}
                            <div className="w-full bg-[#E5E0D8] h-1.5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isMet ? "bg-[#121212]" : "bg-neutral-400"
                                }`} 
                                style={{ width: `${progress}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-[#525252]">
                              {isMet ? (
                                <span className="font-semibold text-[#121212] flex items-center gap-1">
                                  <Check className="w-3 h-3 stroke-[3]" /> Минималният праг е достигнат
                                </span>
                              ) : (
                                <span>
                                  Остават още <strong className="font-mono text-[#121212]">{remaining.toFixed(2)} лв.</strong>
                                </span>
                              )}

                              <span className="text-[10px] text-[#737373]">
                                {isMet ? "Готово за заявка" : `MOQ: ${group.minimum.toFixed(0)} лв.`}
                              </span>
                            </div>
                          </div>

                          {/* Списък с артикули */}
                          <div className="p-3 divide-y divide-[#F2F0EB]">
                            {group.items.map((item) => {
                              const { effectivePrice, discountPercent } = getTieredPrice(item.product, item.quantityCases);
                              const lineTotal = item.quantityCases * effectivePrice;

                              return (
                                <div key={item.product.id} className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
                                  <img 
                                    src={item.product.imageUrl} 
                                    alt={item.product.name} 
                                    className="w-12 h-12 object-contain rounded-md bg-[#FAF9F7] border border-[#EBE8E3] shrink-0 p-1" 
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1">
                                      <h4 className="text-xs font-semibold text-[#121212] truncate">{item.product.name}</h4>
                                      {discountPercent > 0 && (
                                        <span className="bg-[#121212] text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0">
                                          -{discountPercent}%
                                        </span>
                                      )}
                                    </div>
                                    
                                    <div className="text-[10px] text-[#737373] mt-0.5 font-mono">
                                      {discountPercent > 0 ? (
                                        <div className="flex items-center gap-1.5">
                                          <span className="line-through text-neutral-400">{item.product.casePrice.toFixed(2)}</span>
                                          <span className="font-bold text-[#121212]">{effectivePrice.toFixed(2)} лв./стек</span>
                                        </div>
                                      ) : (
                                        <span>{item.product.casePrice.toFixed(2)} лв./стек</span>
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center justify-between mt-2">
                                      <div className="flex items-center bg-[#FAF9F7] border border-[#EBE8E3] rounded-md p-0.5">
                                        <button 
                                          onClick={() => contextUpdateQty(item.product.id, item.quantityCases - 1)}
                                          className="p-1 hover:bg-white text-neutral-700 rounded cursor-pointer"
                                        >
                                          <Minus className="w-2.5 h-2.5" />
                                        </button>
                                        <span className="text-xs font-bold px-1.5 font-mono">{item.quantityCases}</span>
                                        <button 
                                          onClick={() => contextUpdateQty(item.product.id, item.quantityCases + 1)}
                                          className="p-1 hover:bg-white text-neutral-700 rounded cursor-pointer"
                                        >
                                          <Plus className="w-2.5 h-2.5" />
                                        </button>
                                      </div>
                                      
                                      <span className="text-xs font-mono font-bold text-[#121212]">
                                        {lineTotal.toFixed(2)} лв.
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    <div className="pt-1">
                      <button 
                        onClick={contextClearCart}
                        className="text-[11px] text-[#737373] hover:text-[#121212] flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3 h-3" /> Изчисти заявката
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {step === "checkout" && (
              <form id="checkout-form" onSubmit={handleCreateOrder} className="space-y-4">
                {user ? (
                  <div className="bg-[#FAF9F7] border border-[#EBE8E3] rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-[#121212] text-white rounded-md flex items-center justify-center font-bold text-xs">
                        {user.company_name?.charAt(0) || "B"}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#121212]">{formData.storeName || user.company_name}</p>
                        <p className="text-[10px] text-[#737373]">Фирмените данни са заредени автоматично</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#FAF9F7] border border-[#EBE8E3] rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#121212]">Имате ли B2B профил?</p>
                      <p className="text-[10px] text-[#737373]">Влезте за автоматично попълване.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAuthOpen(true)}
                      className="flex items-center gap-1 bg-white border border-[#EBE8E3] text-[#121212] text-xs font-semibold px-2.5 py-1.5 rounded-md shadow-2xs hover:bg-neutral-50 transition-colors cursor-pointer"
                    >
                      <LogIn className="w-3.5 h-3.5" /> Вход
                    </button>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#121212] mb-1">Име на търговския обект / Фирма *</label>
                    <input 
                      type="text" 
                      required
                      value={formData.storeName || user?.company_name || ""}
                      onChange={(e) => setFormData({...formData, storeName: e.target.value})}
                      placeholder="Супермаркет Надежда / Детелина ООД" 
                      className="w-full text-xs px-3 py-2.5 bg-[#FAF9F7] border border-[#EBE8E3] rounded-md focus:outline-none focus:border-[#121212] focus:bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-[#121212] mb-1">ЕИК / БУЛСТАТ</label>
                      <input 
                        type="text" 
                        value={formData.eik || user?.eik || ""}
                        onChange={(e) => setFormData({...formData, eik: e.target.value})}
                        placeholder="206894123" 
                        className="w-full text-xs px-3 py-2.5 bg-[#FAF9F7] border border-[#EBE8E3] rounded-md focus:outline-none focus:border-[#121212] focus:bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#121212] mb-1">Имейл за фактура *</label>
                      <input 
                        type="email" 
                        required
                        value={formData.invoiceEmail || user?.email || ""}
                        onChange={(e) => setFormData({...formData, invoiceEmail: e.target.value})}
                        placeholder="schetovodstvo@firma.bg" 
                        className="w-full text-xs px-3 py-2.5 bg-[#FAF9F7] border border-[#EBE8E3] rounded-md focus:outline-none focus:border-[#121212] focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#121212] mb-1">Точен адрес за доставка *</label>
                    <input 
                      type="text" 
                      required
                      value={formData.address || user?.address || ""}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      placeholder="гр. София, кв. Младост 1, ул. Йерусалим 12" 
                      className="w-full text-xs px-3 py-2.5 bg-[#FAF9F7] border border-[#EBE8E3] rounded-md focus:outline-none focus:border-[#121212] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#121212] mb-1.5">Условия за плащане</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, paymentTerms: "net60"})}
                        className={`p-2 rounded-md border text-center transition-all cursor-pointer ${
                          formData.paymentTerms === "net60"
                            ? "border-[#121212] bg-[#121212] text-white font-semibold"
                            : "border-[#EBE8E3] bg-[#FAF9F7] text-[#525252] hover:bg-neutral-100"
                        }`}
                      >
                        <p className="text-xs">Net 60</p>
                        <p className="text-[9px] opacity-75">60 дни отсрочка</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, paymentTerms: "net30"})}
                        className={`p-2 rounded-md border text-center transition-all cursor-pointer ${
                          formData.paymentTerms === "net30"
                            ? "border-[#121212] bg-[#121212] text-white font-semibold"
                            : "border-[#EBE8E3] bg-[#FAF9F7] text-[#525252] hover:bg-neutral-100"
                        }`}
                      >
                        <p className="text-xs">Net 30</p>
                        <p className="text-[9px] opacity-75">30 дни отсрочка</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, paymentTerms: "immediate"})}
                        className={`p-2 rounded-md border text-center transition-all cursor-pointer ${
                          formData.paymentTerms === "immediate"
                            ? "border-[#121212] bg-[#121212] text-white font-semibold"
                            : "border-[#EBE8E3] bg-[#FAF9F7] text-[#525252] hover:bg-neutral-100"
                        }`}
                      >
                        <p className="text-xs">-2% Отстъпка</p>
                        <p className="text-[9px] opacity-75">Веднага</p>
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            )}

            {step === "success" && (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <div className="w-12 h-12 bg-[#FAF9F7] border border-[#EBE8E3] text-[#121212] rounded-full flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-serif font-normal text-[#121212]">Заявката е приета успешно</h3>
                <p className="text-xs text-[#737373] mt-1">
                  Номер: <strong className="text-[#121212] font-mono">#{orderSuccessData?.orderId}</strong>
                </p>
                
                <div className="bg-[#FAF9F7] border border-[#EBE8E3] rounded-xl p-3.5 my-4 w-full text-left text-xs space-y-2">
                  <p className="text-[#525252] flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-[#121212] shrink-0" />
                    <span>Фактурата е изпратена на: <strong>{formData.invoiceEmail || user?.email}</strong></span>
                  </p>
                  <p className="text-[#525252] flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#121212] shrink-0" />
                    <span>Условия: <strong>{formData.paymentTerms === "net60" ? "Net 60 дни" : formData.paymentTerms === "net30" ? "Net 30 дни" : "Плащане веднага (-2%)"}</strong></span>
                  </p>
                </div>

                {orderSuccessData?.orderId && (
                  <button
                    type="button"
                    onClick={() => handleDownloadInvoice(orderSuccessData.orderId)}
                    disabled={downloadingPdf}
                    className="w-full mb-2 py-2.5 bg-[#121212] hover:bg-neutral-800 text-white font-semibold text-xs rounded-md shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{downloadingPdf ? "Генериране..." : "Изтегли PDF фактура"}</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setStep("cart");
                    handleClose();
                  }}
                  className="w-full py-2.5 bg-[#FAF9F7] hover:bg-neutral-100 text-[#121212] border border-[#EBE8E3] font-semibold text-xs rounded-md transition-all cursor-pointer"
                >
                  Обратно към каталога
                </button>
              </div>
            )}
          </div>

          {/* Долна обобщена секция */}
          {step !== "success" && items.length > 0 && (
            <div className="p-4 border-t border-[#EBE8E3] bg-[#FAF9F7] space-y-3">
              
              {/* Елегантни B2B предимства */}
              <div className="space-y-1.5 text-xs text-[#525252] pb-2 border-b border-[#EBE8E3]">
                {totalSavedFromTiers > 0 && (
                  <div className="flex justify-between items-center text-[#121212] font-semibold">
                    <span>Спестени от обемни отстъпки:</span>
                    <span className="font-mono">-{totalSavedFromTiers.toFixed(2)} лв.</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-[#737373]">
                  <span>Прогнозен марж за магазина:</span>
                  <span className="font-mono font-medium text-[#121212]">+{estimatedTotalProfit.toFixed(2)} лв.</span>
                </div>
              </div>

              {/* Изчисление на суми */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-[#737373]">
                  <span>Данъчна основа:</span>
                  <span className="font-mono text-[#121212]">{cartTotal.toFixed(2)} лв.</span>
                </div>
                <div className="flex justify-between text-[#737373]">
                  <span>ДДС (20%):</span>
                  <span className="font-mono text-[#121212]">{vatAmount.toFixed(2)} лв.</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-[#121212] pt-1.5 border-t border-[#EBE8E3]">
                  <span>Общо за плащане с ДДС:</span>
                  <span className="font-mono font-black">{grandTotal.toFixed(2)} лв.</span>
                </div>
              </div>

              {step === "cart" && (
                <div>
                  {isMoqSatisfied ? (
                    <button
                      onClick={handleProceedToCheckout}
                      className="w-full py-2.5 bg-[#121212] hover:bg-neutral-800 text-white font-semibold text-xs rounded-md shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      Продължи към фактуриране <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-2 bg-neutral-100 border border-neutral-200 rounded-md text-[11px] text-[#525252] flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                        <span>Достигнете минимума за всички брандове</span>
                      </div>
                      <button
                        disabled
                        className="w-full py-2.5 bg-neutral-200 text-neutral-400 font-semibold text-xs rounded-md cursor-not-allowed"
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
                    className="w-1/3 py-2.5 bg-white hover:bg-neutral-50 border border-[#EBE8E3] text-[#121212] font-semibold text-xs rounded-md transition-all cursor-pointer"
                  >
                    Назад
                  </button>
                  <button
                    type="submit"
                    form="checkout-form"
                    disabled={loading}
                    className="w-2/3 py-2.5 bg-[#121212] hover:bg-neutral-800 text-white font-semibold text-xs rounded-md shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
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
