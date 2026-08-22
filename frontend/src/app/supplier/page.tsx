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
  FileDown,
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

interface ParsedProductRow {
  name: string;
  barcode: string;
  casePrice: number;
  rrpPrice: number;
  unitsPerCase: number;
  category: string;
  imageUrl: string;
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

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedProductRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

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

  // Филтрация единствено и само за артикулите на конкретния доставчик
  const supplierProducts = useMemo(() => {
    const rawCompany = (user?.company_name || user?.companyName || "").trim().toLowerCase();
    
    return products.filter((p) => {
      const pSupplier = (p.supplierName || "").trim().toLowerCase();
      
      const isOwner = rawCompany
        ? pSupplier.includes(rawCompany) || rawCompany.includes(pSupplier)
        : true;

      const matchesSearch = 
        p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        p.barcode.includes(catalogSearch) ||
        p.category.toLowerCase().includes(catalogSearch.toLowerCase());

      return isOwner && matchesSearch;
    });
  }, [products, catalogSearch, user]);

  const supplierOrders = useMemo(() => {
    return orders;
  }, [orders]);

  const handleExportOrdersToExcel = () => {
    if (supplierOrders.length === 0) {
      alert("Няма налични поръчки за експорт.");
      return;
    }

    const excelData = supplierOrders.map((order) => {
      const dateString = order.created_at || order.createdAt;
      const formattedDate = dateString ? new Date(dateString).toLocaleDateString("bg-BG") : "Днес";

      return {
        "№ Поръчка": `#${String(order.id).slice(0, 8)}`,
        "Дата": formattedDate,
        "Търговски Обект": order.storeName || order.store_name || "Обект",
        "ЕИК": order.eik || "206894123",
        "Адрес за доставка": order.address || "гр. София",
        "Имейл за контакт": order.invoiceEmail || order.invoice_email || "",
        "Условия на плащане": order.paymentTerms || order.payment_terms || "Net 60",
        "Сума без ДДС (лв.)": Number(order.subtotal || 0).toFixed(2),
        "ДДС 20% (лв.)": Number(order.vat || 0).toFixed(2),
        "Общо с ДДС (лв.)": Number(order.total || 0).toFixed(2),
        "Статус": order.status === "delivered" ? "Доставена" : order.status === "shipped" ? "Натоварена" : order.status === "processing" ? "В подготовка" : "Приета"
      };
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Поръчки за склад");
    XLSX.writeFile(wb, `OPTOM_Porachki_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

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

  const handleSaveMoq = async () => {
    setMoqSaved(true);
    const baseUrl = getApiBaseUrl();
    try {
      for (const prod of supplierProducts) {
        await fetch(`${baseUrl}/api/products/${prod.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ supplierMinimum: brandMoq })
        });
      }
    } catch (e) {}
    setTimeout(() => setMoqSaved(false), 2000);
  };

  const processExcelFile = (file: File) => {
    setFileName(file.name);
    setImportStatus(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (rawJson.length < 2) {
          alert("Файлът е празен или липсват данни след заглавния ред.");
          return;
        }

        const extracted: ParsedProductRow[] = [];
        for (let i = 1; i < rawJson.length; i++) {
          const row = rawJson[i];
          if (!row || row.length === 0 || !row[0]) continue;

          extracted.push({
            name: String(row[0] || "").trim(),
            barcode: String(row[1] || `${Date.now()}${i}`),
            casePrice: parseFloat(String(row[2] || "0").replace(",", ".")) || 20,
            rrpPrice: parseFloat(String(row[3] || "0").replace(",", ".")) || 28,
            unitsPerCase: parseInt(String(row[4] || "24"), 10) || 24,
            category: String(row[5] || "Напитки").trim(),
            imageUrl: String(row[6] || "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&q=80").trim()
          });
        }
        setParsedRows(extracted);
      } catch (err) {
        alert("Грешка при четене на файла.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUploadRows = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    setImportStatus(`Импортиране на ${parsedRows.length} артикула...`);

    const baseUrl = getApiBaseUrl();
    let successCount = 0;

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      const payload = {
        name: row.name,
        barcode: row.barcode,
        casePrice: row.casePrice,
        rrpPrice: row.rrpPrice,
        unitsPerCase: row.unitsPerCase,
        category: row.category,
        supplierName: user?.company_name || user?.companyName || "Официален Производител",
        supplierMinimum: brandMoq,
        imageUrl: row.imageUrl,
        hasTieredDiscount: true,
        tier1Qty: 5,
        tier1Discount: 5.0,
        tier2Qty: 10,
        tier2Discount: 10.0
      };

      try {
        const res = await fetch(`${baseUrl}/api/products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res.ok) successCount++;
      } catch (e) {}
    }

    setImportStatus(`Успешно импортирани ${successCount} артикула!`);
    setImporting(false);
    setParsedRows([]);
    setFileName(null);
    await fetchDashboardData();
    setActiveTab("catalog");
  };

  const handleDownloadExcelTemplate = () => {
    const wsData = [
      ["Име на артикул", "Баркод", "Цена на стек (лв)", "Препоръчителна цена за 1бр (лв)", "Брой в стек", "Категория", "Линк към снимка"],
      ["Coca-Cola Кен 330ml", "5449000000996", 24.00, 1.40, 24, "Напитки", "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=500"],
      ["Chio Чипс Паприка 140g", "4000436000000", 32.00, 2.60, 16, "Снаксове", "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Шаблон Каталог");
    XLSX.writeFile(wb, "OPTOM_BG_Excel_Shablon.xlsx");
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setStatusUpdating(orderId);
    const baseUrl = getApiBaseUrl();
    try {
      await fetch(`${baseUrl}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (e) {}
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
    setStatusUpdating(null);
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
                <h1 className="text-2xl font-black text-slate-950">
                  {user?.company_name || user?.companyName || "Панел на Производител"}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">Управлявайте ценоразписа, наличностите и обемните отстъпки.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-2xl">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-500">Минимум за поръчка (MOQ):</p>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    value={brandMoq}
                    onChange={(e) => setBrandMoq(Number(e.target.value))}
                    className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none"
                  />
                  <span className="text-xs font-bold text-slate-600">лв.</span>
                  <button
                    onClick={handleSaveMoq}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {moqSaved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Запази</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-8 border-b border-slate-100 -mb-8 pb-3 overflow-x-auto">
            <button
              onClick={() => setActiveTab("catalog")}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === "catalog" ? "bg-slate-950 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Boxes className="w-3.5 h-3.5 text-emerald-400" />
              <span>Моят каталог & Цени ({supplierProducts.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("orders")}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === "orders" ? "bg-slate-950 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Постъпили поръчки ({supplierOrders.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("import")}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === "import" ? "bg-slate-950 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Масов Excel / CSV импорт</span>
            </button>

            <button
              onClick={() => setActiveTab("add_product")}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === "add_product" ? "bg-slate-950 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
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
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Търси стек..."
                  className="w-full pl-10 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                />
              </div>
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
                              <button onClick={() => handleSavePrice(p.id)} className="p-1.5 bg-emerald-600 text-white rounded cursor-pointer">
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setEditingId(null)} className="p-1.5 bg-slate-100 rounded cursor-pointer">
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-1">
                              <button onClick={() => handleStartEdit(p)} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded cursor-pointer">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDeleteProduct(p.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded cursor-pointer">
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

        {activeTab === "orders" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-950">Заявки за изпълнение от магазини</h2>
                <p className="text-xs text-slate-500">Променяйте статусите, за да информирате обектите за натоварването и доставката.</p>
              </div>

              {supplierOrders.length > 0 && (
                <button
                  onClick={handleExportOrdersToExcel}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer shrink-0"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Експорт за склад (.xlsx)</span>
                </button>
              )}
            </div>

            {supplierOrders.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs">
                <Package className="w-12 h-12 stroke-1 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-800">Няма нови поръчки към момента</h3>
              </div>
            ) : (
              <div className="space-y-4">
                {supplierOrders.map((order) => {
                  const currentStatus = order.status || "pending";
                  return (
                    <div key={order.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black font-mono text-slate-950 bg-slate-100 px-2 py-1 rounded-md">
                            #{String(order.id).slice(0, 8)}
                          </span>
                          <span className="text-sm font-bold text-slate-900">{order.storeName}</span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Адрес: <strong>{order.address || "гр. София"}</strong> &bull; ЕИК: <strong className="font-mono">{order.eik || "206894123"}</strong>
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Сума: <strong className="text-slate-900 font-mono">{Number(order.total).toFixed(2)} лв. с ДДС</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 shrink-0">
                        <span className="text-[11px] font-bold text-slate-500 mr-1">Статус:</span>
                        <button
                          onClick={() => handleUpdateStatus(order.id, "pending")}
                          disabled={statusUpdating === order.id}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            currentStatus === "pending" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          Приета
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(order.id, "processing")}
                          disabled={statusUpdating === order.id}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            currentStatus === "processing" ? "bg-amber-500 text-slate-950" : "text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          В подготовка
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(order.id, "shipped")}
                          disabled={statusUpdating === order.id}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            currentStatus === "shipped" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          Натоварена
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(order.id, "delivered")}
                          disabled={statusUpdating === order.id}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            currentStatus === "delivered" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          Доставена
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "import" && (
          <div className="max-w-4xl bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  Масов импорт на артикули от Excel
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Качете файл във формат <strong>.xlsx</strong>, <strong>.xls</strong> или <strong>.csv</strong> с пълния ценоразпис.
                </p>
              </div>
              <button
                onClick={handleDownloadExcelTemplate}
                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-300 font-bold text-xs rounded-xl flex items-center gap-2"
              >
                <Download className="w-4 h-4 text-emerald-700" />
                Свали Excel (.xlsx) шаблон
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) processExcelFile(e.target.files[0]);
              }}
              accept=".xlsx, .xls, .csv"
              className="hidden"
            />

            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) processExcelFile(e.dataTransfer.files[0]);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
                dragActive 
                  ? "border-emerald-600 bg-emerald-50/50" 
                  : "border-slate-300 hover:border-slate-400 bg-slate-50/60"
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center mx-auto mb-3 text-emerald-600">
                <FileUp className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-slate-900">
                {fileName ? `Избран файл: ${fileName}` : "Провлачете Excel файл тук или кликнете за избор"}
              </p>
              <p className="text-xs text-slate-400 mt-1">Поддържат се файлове: .XLSX, .XLS, .CSV</p>
            </div>

            {importStatus && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{importStatus}</span>
              </div>
            )}

            {parsedRows.length > 0 && (
              <div className="space-y-4 pt-2">
                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-2xl bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 sticky top-0">
                      <tr>
                        <th className="p-2.5 pl-4">Артикул</th>
                        <th className="p-2.5">Баркод</th>
                        <th className="p-2.5">Цена стек</th>
                        <th className="p-2.5">Препор. цена</th>
                        <th className="p-2.5">Брой в стек</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRows.map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2.5 pl-4 font-bold text-slate-900">{r.name}</td>
                          <td className="p-2.5 font-mono text-slate-500">{r.barcode}</td>
                          <td className="p-2.5 font-mono font-bold">{r.casePrice.toFixed(2)} лв.</td>
                          <td className="p-2.5 font-mono text-emerald-700">{r.rrpPrice.toFixed(2)} лв.</td>
                          <td className="p-2.5 font-mono">{r.unitsPerCase} бр.</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={handleUploadRows}
                  disabled={importing}
                  className="w-full py-3.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider disabled:opacity-50"
                >
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>{importing ? "Импортиране..." : `Качи всички ${parsedRows.length} артикула`}</span>
                </button>
              </div>
            )}
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
                supplierName: user?.company_name || user?.companyName || "Официален Производител",
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

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Брой в стек *</label>
                  <input
                    type="number"
                    required
                    value={newProduct.unitsPerCase}
                    onChange={(e) => setNewProduct({ ...newProduct, unitsPerCase: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Категория</label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Напитки">Напитки & Води</option>
                    <option value="Снаксове">Чипс & Ядки</option>
                    <option value="Шоколади">Шоколади & Вафли</option>
                    <option value="Кафе & Чай">Кафе & Топли напитки</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Баркод</label>
                  <input
                    type="text"
                    value={newProduct.barcode}
                    onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                    placeholder="3800..."
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
                        />
                        <span className="text-xs self-center">бр. &rarr;</span>
                        <input
                          type="number"
                          step="0.5"
                          value={newProduct.tier1Discount}
                          onChange={(e) => setNewProduct({ ...newProduct, tier1Discount: e.target.value })}
                          className="w-16 px-2 py-1 text-xs border rounded font-bold text-emerald-700"
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
                        />
                        <span className="text-xs self-center">бр. &rarr;</span>
                        <input
                          type="number"
                          step="0.5"
                          value={newProduct.tier2Discount}
                          onChange={(e) => setNewProduct({ ...newProduct, tier2Discount: e.target.value })}
                          className="w-16 px-2 py-1 text-xs border rounded font-bold text-emerald-700"
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
