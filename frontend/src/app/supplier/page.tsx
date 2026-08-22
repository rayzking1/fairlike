"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { 
  Building2, 
  ChevronLeft, 
  Upload, 
  Plus, 
  Package, 
  CheckCircle2, 
  Clock, 
  Truck, 
  PackageCheck, 
  Download, 
  FileSpreadsheet, 
  Save, 
  Check, 
  AlertCircle, 
  FileUp, 
  Trash2, 
  Edit2, 
  Search, 
  CheckCircle, 
  XCircle, 
  Boxes,
  Percent
} from "lucide-react";
import * as XLSX from "xlsx";
import HeaderAuthButton from "@/components/HeaderAuthButton";
import { useAuth } from "@/context/AuthContext";

interface ProductItem {
  id: string;
  name: string;
  barcode: string;
  casePrice: number;
  rrpPrice: number;
  unitsPerCase: number;
  category: string;
  imageUrl: string;
  supplierName: string;
  supplierMinimum?: number;
  inStock?: boolean;
  hasTieredDiscount?: boolean;
  tier1Qty?: number;
  tier1Discount?: number;
  tier2Qty?: number;
  tier2Discount?: number;
}

export default function SupplierDashboardPage() {
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<"catalog" | "import" | "orders" | "add_product">("catalog");
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  const [catalogSearch, setCatalogSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    casePrice: 0,
    rrpPrice: 0,
    hasTieredDiscount: true,
    tier1Qty: 5,
    tier1Discount: 5.0,
    tier2Qty: 10,
    tier2Discount: 10.0
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const [brandMoq, setBrandMoq] = useState<number>(50);
  const [moqSaved, setMoqSaved] = useState(false);

  const [newProduct, setNewProduct] = useState({
    name: "",
    barcode: "",
    casePrice: "",
    rrpPrice: "",
    unitsPerCase: "24",
    category: "Напитки",
    imageUrl: "",
    hasTieredDiscount: true,
    tier1Qty: "5",
    tier1Discount: "5.0",
    tier2Qty: "10",
    tier2Discount: "10.0"
  });
  const [productSaving, setProductSaving] = useState(false);
  const [productSuccess, setProductSuccess] = useState(false);

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

  const fetchDashboardData = async () => {
    setLoading(true);
    const baseUrl = getApiBaseUrl();
    try {
      const [ordersRes, productsRes] = await Promise.all([
        fetch(`${baseUrl}/api/orders`),
        fetch(`${baseUrl}/api/products`)
      ]);

      if (ordersRes.ok) {
        const oData = await ordersRes.json();
        setOrders(oData);
      }
      if (productsRes.ok) {
        const pData = await productsRes.json();
        setProducts(pData.map((p: any) => ({ ...p, inStock: p.inStock !== false })));
      }
    } catch (e) {
      console.error("Грешка при зареждане:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const supplierProducts = useMemo(() => {
    return products.filter((p) => {
      return (
        p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        p.barcode.includes(catalogSearch) ||
        p.category.toLowerCase().includes(catalogSearch.toLowerCase())
      );
    });
  }, [products, catalogSearch]);

  const handleStartEdit = (prod: ProductItem) => {
    setEditingId(prod.id);
    setEditForm({
      casePrice: prod.casePrice,
      rrpPrice: prod.rrpPrice,
      hasTieredDiscount: prod.hasTieredDiscount !== false,
      tier1Qty: prod.tier1Qty || 5,
      tier1Discount: prod.tier1Discount || 5.0,
      tier2Qty: prod.tier2Qty || 10,
      tier2Discount: prod.tier2Discount || 10.0
    });
  };

  const handleSavePrice = async (prodId: string) => {
    setSavingEdit(true);
    const baseUrl = getApiBaseUrl();
    try {
      await fetch(`${baseUrl}/api/products/${prodId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm)
      });

      setProducts((prev) =>
        prev.map((p) => (p.id === prodId ? { ...p, ...editForm } : p))
      );
      setEditingId(null);
    } catch (e) {
      setEditingId(null);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleStock = async (prodId: string, currentStock: boolean) => {
    const nextStock = !currentStock;
    const baseUrl = getApiBaseUrl();
    try {
      await fetch(`${baseUrl}/api/products/${prodId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inStock: nextStock })
      });
    } catch (e) {}

    setProducts((prev) =>
      prev.map((p) => (p.id === prodId ? { ...p, inStock: nextStock } : p))
    );
  };

  const handleDeleteProduct = async (prodId: string) => {
    if (!confirm("Сигурни ли сте, че искате да изтриете този артикул?")) return;
    const baseUrl = getApiBaseUrl();
    try {
      await fetch(`${baseUrl}/api/products/${prodId}`, { method: "DELETE" });
    } catch (e) {}
    setProducts((prev) => prev.filter((p) => p.id !== prodId));
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900">
              <ChevronLeft className="w-4 h-4" /> Каталог
            </Link>
            <div className="h-4 w-px bg-slate-200" />
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-black text-sm">
                O
              </div>
              <span className="text-xl font-black tracking-tight text-slate-900">
                OPTOM<span className="text-emerald-600">.BG</span>
              </span>
            </Link>
          </div>
          <HeaderAuthButton />
        </div>
      </header>

      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-2xl font-black shadow-lg">
                <Building2 className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-950">Панел на Производител</h1>
                <p className="text-xs text-slate-500 mt-0.5">Управлявайте ценоразписа, наличностите и обемните отстъпки.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-8 border-b border-slate-100 -mb-8 pb-3 overflow-x-auto">
            <button
              onClick={() => setActiveTab("catalog")}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${
                activeTab === "catalog" ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Boxes className="w-3.5 h-3.5 text-emerald-400" />
              <span>Каталог & Цени ({supplierProducts.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("add_product")}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${
                activeTab === "add_product" ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Добави стек & Отстъпки</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-12">
        {activeTab === "catalog" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-950">Ценоразпис и обемни отстъпки</h2>
                <p className="text-xs text-slate-500">Настройвайте директно кои артикули да имат отстъпка за количество.</p>
              </div>
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Търси стек..."
                className="w-full sm:w-72 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3.5 pl-5">Продукт</th>
                    <th className="p-3.5">Цена стек</th>
                    <th className="p-3.5">Препор. цена</th>
                    <th className="p-3.5">Обемни отстъпки</th>
                    <th className="p-3.5 text-center">Наличност</th>
                    <th className="p-3.5 pr-5 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {supplierProducts.map((p) => {
                    const isEditing = editingId === p.id;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/60">
                        <td className="p-3.5 pl-5">
                          <p className="font-bold text-slate-900">{p.name}</p>
                          <p className="text-[10px] text-slate-400">Стек: {p.unitsPerCase} бр. &bull; {p.barcode}</p>
                        </td>

                        <td className="p-3.5">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.casePrice}
                              onChange={(e) => setEditForm({ ...editForm, casePrice: parseFloat(e.target.value) || 0 })}
                              className="w-20 px-2 py-1 border border-emerald-500 rounded text-xs font-mono"
                            />
                          ) : (
                            <span className="font-mono font-bold text-slate-900">{p.casePrice.toFixed(2)} лв.</span>
                          )}
                        </td>

                        <td className="p-3.5">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.rrpPrice}
                              onChange={(e) => setEditForm({ ...editForm, rrpPrice: parseFloat(e.target.value) || 0 })}
                              className="w-16 px-2 py-1 border border-emerald-500 rounded text-xs font-mono"
                            />
                          ) : (
                            <span className="font-mono text-emerald-700">{p.rrpPrice.toFixed(2)} лв.</span>
                          )}
                        </td>

                        <td className="p-3.5">
                          {isEditing ? (
                            <div className="space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
                              <label className="flex items-center gap-1.5 text-[11px] font-bold">
                                <input
                                  type="checkbox"
                                  checked={editForm.hasTieredDiscount}
                                  onChange={(e) => setEditForm({ ...editForm, hasTieredDiscount: e.target.checked })}
                                />
                                <span>Активирай отстъпки</span>
                              </label>
                              {editForm.hasTieredDiscount && (
                                <div className="flex gap-2 text-[10px] pt-1">
                                  <span>{editForm.tier1Qty}+ бр: -{editForm.tier1Discount}%</span>
                                  <span>{editForm.tier2Qty}+ бр: -{editForm.tier2Discount}%</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              {p.hasTieredDiscount !== false ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  <Percent className="w-3 h-3" /> {p.tier1Qty || 5}+ (-{p.tier1Discount || 5}%) / {p.tier2Qty || 10}+ (-{p.tier2Discount || 10}%)
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-semibold">Без отстъпки</span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handleToggleStock(p.id, p.inStock !== false)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              p.inStock !== false ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700"
                            }`}
                          >
                            {p.inStock !== false ? "В наличност" : "Изчерпан"}
                          </button>
                        </td>

                        <td className="p-3.5 pr-5 text-right">
                          {isEditing ? (
                            <div className="flex justify-end gap-1">
                              <button onClick={() => handleSavePrice(p.id)} className="p-1.5 bg-emerald-600 text-white rounded">
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setEditingId(null)} className="p-1.5 bg-slate-100 rounded">
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-1">
                              <button onClick={() => handleStartEdit(p)} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDeleteProduct(p.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "add_product" && (
          <div className="max-w-2xl bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
            <h2 className="text-lg font-black text-slate-950 mb-1">Добавяне на нов стек & Персонални отстъпки</h2>
            <p className="text-xs text-slate-500 mb-6">Въведете параметрите на продукта и конфигурирайте ценовата си политика.</p>

            <form onSubmit={async (e) => {
              e.preventDefault();
              setProductSaving(true);
              const baseUrl = getApiBaseUrl();
              const payload = {
                name: newProduct.name,
                barcode: newProduct.barcode || String(Date.now()),
                casePrice: parseFloat(newProduct.casePrice),
                rrpPrice: parseFloat(newProduct.rrpPrice),
                unitsPerCase: parseInt(newProduct.unitsPerCase, 10),
                category: newProduct.category,
                supplierName: user?.company_name || "Официален Производител",
                supplierMinimum: brandMoq,
                imageUrl: newProduct.imageUrl || "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&q=80",
                hasTieredDiscount: newProduct.hasTieredDiscount,
                tier1Qty: parseInt(newProduct.tier1Qty, 10),
                tier1Discount: parseFloat(newProduct.tier1Discount),
                tier2Qty: parseInt(newProduct.tier2Qty, 10),
                tier2Discount: parseFloat(newProduct.tier2Discount),
              };
              try {
                const res = await fetch(`${baseUrl}/api/products`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload)
                });
                if (res.ok) {
                  await fetchDashboardData();
                  setActiveTab("catalog");
                }
              } catch (err) {}
              setProductSaving(false);
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Име на продукта / стека *</label>
                <input
                  type="text"
                  required
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="напр. Red Bull Sugarfree 250ml"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Едрова цена за стек (лв.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newProduct.casePrice}
                    onChange={(e) => setNewProduct({ ...newProduct, casePrice: e.target.value })}
                    placeholder="24.50"
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Препоръчителна за 1бр (лв.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newProduct.rrpPrice}
                    onChange={(e) => setNewProduct({ ...newProduct, rrpPrice: e.target.value })}
                    placeholder="1.60"
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newProduct.hasTieredDiscount}
                    onChange={(e) => setNewProduct({ ...newProduct, hasTieredDiscount: e.target.checked })}
                    className="rounded text-emerald-600"
                  />
                  <span className="text-xs font-bold text-slate-900">Предлагай отстъпка за количество (Tiered Pricing)</span>
                </label>

                {newProduct.hasTieredDiscount && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Ниво 1 (Малък обем)</p>
                      <div className="flex gap-2 mt-1">
                        <input
                          type="number"
                          value={newProduct.tier1Qty}
                          onChange={(e) => setNewProduct({ ...newProduct, tier1Qty: e.target.value })}
                          className="w-16 px-2 py-1 text-xs border rounded"
                          placeholder="Стекове"
                        />
                        <span className="text-xs self-center">бр. $\rightarrow$</span>
                        <input
                          type="number"
                          step="0.5"
                          value={newProduct.tier1Discount}
                          onChange={(e) => setNewProduct({ ...newProduct, tier1Discount: e.target.value })}
                          className="w-16 px-2 py-1 text-xs border rounded font-bold text-emerald-700"
                          placeholder="%"
                        />
                        <span className="text-xs self-center">%</span>
                      </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Ниво 2 (Палетно количество)</p>
                      <div className="flex gap-2 mt-1">
                        <input
                          type="number"
                          value={newProduct.tier2Qty}
                          onChange={(e) => setNewProduct({ ...newProduct, tier2Qty: e.target.value })}
                          className="w-16 px-2 py-1 text-xs border rounded"
                          placeholder="Стекове"
                        />
                        <span className="text-xs self-center">бр. $\rightarrow$</span>
                        <input
                          type="number"
                          step="0.5"
                          value={newProduct.tier2Discount}
                          onChange={(e) => setNewProduct({ ...newProduct, tier2Discount: e.target.value })}
                          className="w-16 px-2 py-1 text-xs border rounded font-bold text-emerald-700"
                          placeholder="%"
                        />
                        <span className="text-xs self-center">%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={productSaving}
                className="w-full py-3.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer uppercase tracking-wider"
              >
                {productSaving ? "Публикуване..." : "Публикувай стек с отстъпки"}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
