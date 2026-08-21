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
  Boxes
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

  // Филтриране и търсене в каталога на доставчика
  const [catalogSearch, setCatalogSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCasePrice, setEditCasePrice] = useState<number>(0);
  const [editRrpPrice, setEditRrpPrice] = useState<number>(0);
  const [savingEdit, setSavingEdit] = useState(false);

  // MOQ праг
  const [brandMoq, setBrandMoq] = useState<number>(50);
  const [moqSaved, setMoqSaved] = useState(false);

  // Ръчно добавяне на стек
  const [newProduct, setNewProduct] = useState({
    name: "",
    barcode: "",
    casePrice: "",
    rrpPrice: "",
    unitsPerCase: "24",
    category: "Напитки",
    imageUrl: ""
  });
  const [productSaving, setProductSaving] = useState(false);
  const [productSuccess, setProductSuccess] = useState(false);

  // Масов импорт
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
        // Всички продукти с по подразбиране inStock: true
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

  // Филтрирани продукти на този доставчик
  const supplierProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = 
        p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        p.barcode.includes(catalogSearch) ||
        p.category.toLowerCase().includes(catalogSearch.toLowerCase());
      return matchesSearch;
    });
  }, [products, catalogSearch]);

  // Започване на редакция на продукт
  const handleStartEdit = (prod: ProductItem) => {
    setEditingId(prod.id);
    setEditCasePrice(prod.casePrice);
    setEditRrpPrice(prod.rrpPrice);
  };

  // Запазване на промените по цените
  const handleSavePrice = async (prodId: string) => {
    setSavingEdit(true);
    const baseUrl = getApiBaseUrl();
    try {
      await fetch(`${baseUrl}/api/products/${prodId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          casePrice: editCasePrice,
          rrpPrice: editRrpPrice
        })
      });

      // Локално обновяване
      setProducts((prev) =>
        prev.map((p) =>
          p.id === prodId ? { ...p, casePrice: editCasePrice, rrpPrice: editRrpPrice } : p
        )
      );
      setEditingId(null);
    } catch (e) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === prodId ? { ...p, casePrice: editCasePrice, rrpPrice: editRrpPrice } : p
        )
      );
      setEditingId(null);
    } finally {
      setSavingEdit(false);
    }
  };

  // Превключване на наличност (In Stock / Out of Stock)
  const handleToggleStock = async (prodId: string, currentStock: boolean) => {
    const nextStock = !currentStock;
    const baseUrl = getApiBaseUrl();
    try {
      await fetch(`${baseUrl}/api/products/${prodId}/stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inStock: nextStock })
      });
    } catch (e) {}

    setProducts((prev) =>
      prev.map((p) => (p.id === prodId ? { ...p, inStock: nextStock } : p))
    );
  };

  // Изтриване на артикул
  const handleDeleteProduct = async (prodId: string) => {
    if (!confirm("Сигурни ли сте, че искате да изтриете този артикул от каталога?")) return;
    const baseUrl = getApiBaseUrl();
    try {
      await fetch(`${baseUrl}/api/products/${prodId}`, { method: "DELETE" });
    } catch (e) {}

    setProducts((prev) => prev.filter((p) => p.id !== prodId));
  };

  // Обработка на Excel файл
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
            imageUrl: String(row[6] || "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=500").trim()
          });
        }
        setParsedRows(extracted);
      } catch (err) {
        alert("Възникна грешка при разчитането на файла. Уверете се, че е валиден .xlsx, .xls или .csv файл.");
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
        supplierName: user?.company_name || "Официален Производител",
        supplierMinimum: brandMoq,
        imageUrl: row.imageUrl
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

    setImportStatus(`Успешно импортирани ${successCount} от ${parsedRows.length} артикула!`);
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
      {/* Хедър */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Link 
              href="/"
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Каталог
            </Link>
            <div className="h-4 w-px bg-slate-200" />
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-black text-sm">
                O
              </div>
              <span className="text-xl font-black tracking-tight text-slate-900">
                OPTOM<span className="text-emerald-600">.BG</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <HeaderAuthButton />
          </div>
        </div>
      </header>

      {/* Hero банер */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-2xl font-black shadow-lg">
                <Building2 className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black text-slate-950">
                    {user?.company_name || user?.companyName || "Панел на Производител"}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    Официален доставчик
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Управлявайте заводските квоти, наличностите, ценоразписа и поръчките от магазини.
                </p>
              </div>
            </div>

            {/* Бърза настройка на MOQ */}
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-2xl">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-500">Минимум за поръчка (MOQ):</p>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    value={brandMoq}
                    onChange={(e) => setBrandMoq(Number(e.target.value))}
                    className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                  <span className="text-xs font-bold text-slate-600">лв.</span>
                  <button
                    onClick={() => {
                      setMoqSaved(true);
                      setTimeout(() => setMoqSaved(false), 2000);
                    }}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {moqSaved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Запази</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Табове за навигация */}
          <div className="flex items-center gap-2 mt-8 border-b border-slate-100 -mb-8 pb-3 overflow-x-auto">
            <button
              onClick={() => setActiveTab("catalog")}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                activeTab === "catalog"
                  ? "bg-slate-950 text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Boxes className="w-3.5 h-3.5 text-emerald-400" />
              <span>Моят каталог & Цени ({supplierProducts.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("orders")}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                activeTab === "orders"
                  ? "bg-slate-950 text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Постъпили поръчки ({orders.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("import")}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                activeTab === "import"
                  ? "bg-slate-950 text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Масов Excel / CSV импорт</span>
            </button>

            <button
              onClick={() => setActiveTab("add_product")}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                activeTab === "add_product"
                  ? "bg-slate-950 text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Добави единичен стек</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-12">
        
        {/* ТАБ 1: МОЯТ КАТАЛОГ, НАЛИЧНОСТИ И РЕДАКЦИЯ НА ЦЕНИ */}
        {activeTab === "catalog" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-950">Управление на артикули и наличности</h2>
                <p className="text-xs text-slate-500">Променяйте цени на едро, препоръчителни цени и маркирайте наличности в реално време.</p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Търси стек, баркод или категория..."
                  className="w-full pl-10 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            {loading ? (
              <div className="py-20 text-center">
                <div className="inline-block w-8 h-8 border-3 border-slate-950 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-xs text-slate-500 font-semibold">Зареждане на каталога...</p>
              </div>
            ) : supplierProducts.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs">
                <Boxes className="w-12 h-12 stroke-1 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-800">Няма намерени артикули</h3>
                <p className="text-xs text-slate-400 mt-1">Качете ценоразпис от Excel или добавете стек ръчно.</p>
                <button
                  onClick={() => setActiveTab("import")}
                  className="mt-4 px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Към масовия импорт &rarr;
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-3.5 pl-5">Продукт</th>
                        <th className="p-3.5">Баркод</th>
                        <th className="p-3.5">Категория</th>
                        <th className="p-3.5">Едрова цена (стек)</th>
                        <th className="p-3.5">Препор. за 1 бр.</th>
                        <th className="p-3.5">Марж за магазин</th>
                        <th className="p-3.5 text-center">Наличност</th>
                        <th className="p-3.5 pr-5 text-right">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {supplierProducts.map((p) => {
                        const isEditing = editingId === p.id;
                        const retailTotal = p.rrpPrice * p.unitsPerCase;
                        const profit = Math.max(0, retailTotal - p.casePrice);
                        const marginPercent = retailTotal > 0 ? Math.round((profit / retailTotal) * 100) : 0;

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                            {/* Продукт */}
                            <td className="p-3.5 pl-5">
                              <div className="flex items-center gap-3">
                                <img
                                  src={p.imageUrl}
                                  alt={p.name}
                                  className="w-10 h-10 object-contain rounded-lg bg-slate-50 border border-slate-200 p-1 shrink-0"
                                />
                                <div>
                                  <p className="font-bold text-slate-900 line-clamp-1">{p.name}</p>
                                  <p className="text-[10px] text-slate-400">Стек от {p.unitsPerCase} бр.</p>
                                </div>
                              </div>
                            </td>

                            {/* Баркод */}
                            <td className="p-3.5 font-mono text-slate-500 text-[11px]">{p.barcode}</td>

                            {/* Категория */}
                            <td className="p-3.5">
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                                {p.category}
                              </span>
                            </td>

                            {/* Едрова цена */}
                            <td className="p-3.5">
                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editCasePrice}
                                    onChange={(e) => setEditCasePrice(parseFloat(e.target.value) || 0)}
                                    className="w-20 px-2 py-1 bg-white border border-emerald-500 rounded-lg text-xs font-mono font-bold"
                                  />
                                  <span className="font-mono text-xs">лв.</span>
                                </div>
                              ) : (
                                <span className="font-black font-mono text-slate-900 text-sm">
                                  {p.casePrice.toFixed(2)} лв.
                                </span>
                              )}
                            </td>

                            {/* Препоръчителна цена */}
                            <td className="p-3.5">
                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editRrpPrice}
                                    onChange={(e) => setEditRrpPrice(parseFloat(e.target.value) || 0)}
                                    className="w-16 px-2 py-1 bg-white border border-emerald-500 rounded-lg text-xs font-mono font-bold"
                                  />
                                  <span className="font-mono text-xs">лв.</span>
                                </div>
                              ) : (
                                <span className="font-bold font-mono text-emerald-700">
                                  {p.rrpPrice.toFixed(2)} лв.
                                </span>
                              )}
                            </td>

                            {/* Марж */}
                            <td className="p-3.5">
                              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                +{marginPercent}% (+{profit.toFixed(2)} лв.)
                              </span>
                            </td>

                            {/* Превключвател за наличност */}
                            <td className="p-3.5 text-center">
                              <button
                                onClick={() => handleToggleStock(p.id, p.inStock !== false)}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer ${
                                  p.inStock !== false
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                    : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                                }`}
                              >
                                {p.inStock !== false ? (
                                  <>
                                    <CheckCircle className="w-3 h-3 text-emerald-600" /> В наличност
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-3 h-3 text-red-500" /> Изчерпан
                                  </>
                                )}
                              </button>
                            </td>

                            {/* Действия */}
                            <td className="p-3.5 pr-5 text-right">
                              {isEditing ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleSavePrice(p.id)}
                                    disabled={savingEdit}
                                    className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                                    title="Запази"
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                                    title="Откажи"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleStartEdit(p)}
                                    className="p-1.5 text-slate-500 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                    title="Промени цена"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProduct(p.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                    title="Изтрий артикул"
                                  >
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
          </div>
        )}

        {/* ТАБ 2: ПОРЪЧКИ И СТАТУСИ */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-black text-slate-950">Заявки за изпълнение от магазини</h2>
              <p className="text-xs text-slate-500">Променяйте статусите, за да информирате обектите за натоварването и доставката.</p>
            </div>

            {loading ? (
              <div className="py-20 text-center">
                <div className="inline-block w-8 h-8 border-3 border-slate-950 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-xs text-slate-500 font-semibold">Зареждане на поръчките...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs">
                <Package className="w-12 h-12 stroke-1 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-800">Няма нови поръчки към момента</h3>
                <p className="text-xs text-slate-400 mt-1">Новите заявки от магазини ще се появяват тук за натоварване.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const currentStatus = order.status || "pending";
                  const storeName = order.storeName || order.store_name || "Супермаркет";
                  const total = order.total || order.subtotal || 0;

                  return (
                    <div 
                      key={order.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black font-mono text-slate-950 bg-slate-100 px-2 py-1 rounded-md">
                            #{String(order.id).slice(0, 8)}
                          </span>
                          <span className="text-sm font-bold text-slate-900">{storeName}</span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Адрес: <strong>{order.address || "гр. София"}</strong> &bull; ЕИК: <strong className="font-mono">{order.eik || "206894123"}</strong>
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Сума: <strong className="text-slate-900 font-mono">{Number(total).toFixed(2)} лв. с ДДС</strong> &bull; Условия: <strong className="uppercase">{order.paymentTerms || "Net 60"}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 shrink-0">
                        <span className="text-[11px] font-bold text-slate-500 mr-1">Статус:</span>
                        
                        <button
                          onClick={() => handleUpdateStatus(order.id, "pending")}
                          disabled={statusUpdating === order.id}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            currentStatus === "pending"
                              ? "bg-slate-900 text-white shadow-xs"
                              : "text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          Приета
                        </button>

                        <button
                          onClick={() => handleUpdateStatus(order.id, "processing")}
                          disabled={statusUpdating === order.id}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            currentStatus === "processing"
                              ? "bg-amber-500 text-slate-950 shadow-xs"
                              : "text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          В подготовка
                        </button>

                        <button
                          onClick={() => handleUpdateStatus(order.id, "shipped")}
                          disabled={statusUpdating === order.id}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            currentStatus === "shipped"
                              ? "bg-blue-600 text-white shadow-xs"
                              : "text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          Натоварена
                        </button>

                        <button
                          onClick={() => handleUpdateStatus(order.id, "delivered")}
                          disabled={statusUpdating === order.id}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            currentStatus === "delivered"
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "text-slate-600 hover:bg-slate-200"
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

        {/* ТАБ 3: МАСОВ EXCEL ИМПОРТ */}
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
                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-300 font-bold text-xs rounded-xl flex items-center gap-2 transition-colors cursor-pointer shrink-0"
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
                  ? "border-emerald-600 bg-emerald-50/50 scale-[0.99]" 
                  : "border-slate-300 hover:border-slate-400 bg-slate-50/60 hover:bg-slate-50"
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center mx-auto mb-3 text-emerald-600">
                <FileUp className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-slate-900">
                {fileName ? `Избран файл: ${fileName}` : "Провлачете Excel файл тук или кликнете за избор"}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Поддържат се файлове: <strong>.XLSX, .XLS, .CSV</strong> (до 10 MB)
              </p>
            </div>

            {importStatus && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{importStatus}</span>
              </div>
            )}

            {parsedRows.length > 0 && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Разпознати артикули ({parsedRows.length} бр.)
                  </span>
                  <button
                    onClick={() => { setParsedRows([]); setFileName(null); }}
                    className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Откажи
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-2xl bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 sticky top-0">
                      <tr>
                        <th className="p-2.5 pl-4">Артикул</th>
                        <th className="p-2.5">Баркод</th>
                        <th className="p-2.5">Цена стек</th>
                        <th className="p-2.5">Препор. цена</th>
                        <th className="p-2.5">Брой в стек</th>
                        <th className="p-2.5">Категория</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRows.map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2.5 pl-4 font-bold text-slate-900">{r.name}</td>
                          <td className="p-2.5 font-mono text-slate-500">{r.barcode}</td>
                          <td className="p-2.5 font-mono font-bold text-slate-900">{r.casePrice.toFixed(2)} лв.</td>
                          <td className="p-2.5 font-mono text-emerald-700">{r.rrpPrice.toFixed(2)} лв.</td>
                          <td className="p-2.5 font-mono">{r.unitsPerCase} бр.</td>
                          <td className="p-2.5">{r.category}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={handleUploadRows}
                  disabled={importing}
                  className="w-full py-3.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider disabled:opacity-50"
                >
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>{importing ? "Импортиране..." : `Качи всички ${parsedRows.length} артикула в каталога`}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ТАБ 4: РЪЧНО ДОБАВЯНЕ НА СТЕК */}
        {activeTab === "add_product" && (
          <div className="max-w-2xl bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-black text-slate-950">Добавяне на нов стек към каталога</h2>
              <p className="text-xs text-slate-500 mt-0.5">Въведете параметрите на опаковката и цената на едро.</p>
            </div>

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
                imageUrl: newProduct.imageUrl || "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=500"
              };
              try {
                const res = await fetch(`${baseUrl}/api/products`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload)
                });
                if (res.ok) {
                  setProductSuccess(true);
                  setNewProduct({ name: "", barcode: "", casePrice: "", rrpPrice: "", unitsPerCase: "24", category: "Напитки", imageUrl: "" });
                  await fetchDashboardData();
                  setTimeout(() => setProductSuccess(false), 2500);
                  setActiveTab("catalog");
                }
              } catch (e) {
                alert("Грешка при запис");
              } finally {
                setProductSaving(false);
              }
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Име на продукта / стека *</label>
                <input
                  type="text"
                  required
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="напр. Red Bull Sugarfree 250ml"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 focus:bg-white"
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
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Препоръчителна цена за 1бр (лв.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newProduct.rrpPrice}
                    onChange={(e) => setNewProduct({ ...newProduct, rrpPrice: e.target.value })}
                    placeholder="1.60"
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:border-emerald-600 focus:bg-white"
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
                    placeholder="24"
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Категория</label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 focus:bg-white"
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
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={productSaving}
                className="w-full py-3.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer uppercase tracking-wider disabled:opacity-50"
              >
                {productSaving ? "Публикуване..." : "Публикувай в каталога"}
              </button>
            </form>
          </div>
        )}

      </main>
    </div>
  );
}
