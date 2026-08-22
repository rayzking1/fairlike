"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { 
  ChevronLeft, 
  Upload, 
  Plus, 
  Package, 
  Download, 
  FileSpreadsheet, 
  Save, 
  Check, 
  Trash2, 
  Edit2, 
  Search, 
  XCircle, 
  Boxes,
  FileDown,
  Percent,
  FileUp,
  Truck,
  Lock,
  Building2
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
  const { user, setIsAuthOpen } = useAuth();
  
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
    category: "Безалкохолни & Води",
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
    if (!user || user.role !== "supplier") return;
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
  }, [user]);

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
            category: String(row[5] || "Безалкохолни & Води").trim(),
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
      ["Coca-Cola Кен 330ml", "5449000000996", 24.00, 1.40, 24, "Безалкохолни & Води", "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=500"],
      ["Chio Чипс Паприка 140g", "4000436000000", 32.00, 2.60, 16, "Чипс & Снаксове", "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500"]
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

  // ROUTE GUARD: Ако не е вписан с роля supplier, показваме изчистен екран за автентикация
  if (!user || user.role !== "supplier") {
    return (
      <div className="min-h-screen bg-white text-[#121212] antialiased">
        <header className="sticky top-0 z-40 bg-white border-b border-[#EBE8E3]">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-8 h-18 flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-1 text-xs font-semibold text-[#525252] hover:text-[#121212] transition-colors">
                <ChevronLeft className="w-4 h-4" /> Каталог
              </Link>
              <div className="h-4 w-px bg-[#EBE8E3]" />
              <Link href="/" className="text-xl font-serif font-black tracking-[0.2em] text-[#121212] uppercase">
                OPTOM
              </Link>
            </div>
            <HeaderAuthButton />
          </div>
        </header>

        <main className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#FAF9F7] border border-[#EBE8E3] flex items-center justify-center mx-auto text-[#121212]">
            <Lock className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-serif text-[#121212]">Панелът е достъпен само за фабрики и вносители</h1>
          <p className="text-xs text-[#737373] leading-relaxed">
            Влезте във вашия фирмен акаунт на производител, за да управлявате каталога, наличностите и постъпилите заявки.
          </p>
          <button
            onClick={() => setIsAuthOpen(true)}
            className="w-full py-2.5 bg-[#121212] hover:bg-neutral-800 text-white font-semibold text-xs rounded-md shadow-xs transition-all cursor-pointer"
          >
            Вход като производител
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#121212] antialiased selection:bg-[#121212] selection:text-white">
      
      {/* 1. НАВИГАЦИЯ */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#EBE8E3]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 h-18 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-1 text-xs font-semibold text-[#525252] hover:text-[#121212] transition-colors">
              <ChevronLeft className="w-4 h-4" /> Каталог
            </Link>
            <div className="h-4 w-px bg-[#EBE8E3]" />
            <Link href="/" className="text-xl font-serif font-black tracking-[0.2em] text-[#121212] uppercase">
              OPTOM
            </Link>
          </div>
          <HeaderAuthButton />
        </div>
      </header>

      {/* 2. БРАНД ХЕДЪР & MOQ */}
      <div className="border-b border-[#EBE8E3] bg-[#FAF9F7]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#121212] text-white flex items-center justify-center text-xl font-serif font-bold shadow-2xs">
                {(user?.company_name || user?.companyName || "P").slice(0, 1).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-serif text-[#121212]">
                  {user?.company_name || user?.companyName || "Панел на Фабриката"}
                </h1>
                <p className="text-xs text-[#737373] mt-0.5">Управлявайте ценоразписа, наличностите и обемните отстъпки.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white border border-[#EBE8E3] p-3 rounded-xl">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-[#737373] font-bold">Минимум за поръчка (MOQ):</p>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    value={brandMoq}
                    onChange={(e) => setBrandMoq(Number(e.target.value))}
                    className="w-20 px-2 py-1 bg-[#FAF9F7] border border-[#EBE8E3] rounded-md text-xs font-mono font-bold text-[#121212] focus:outline-none"
                  />
                  <span className="text-xs font-bold text-[#737373]">лв.</span>
                  <button
                    onClick={handleSaveMoq}
                    className="px-3 py-1 bg-[#121212] hover:bg-neutral-800 text-white rounded-md text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                  >
                    {moqSaved ? <Check className="w-3 h-3 text-white" /> : <Save className="w-3 h-3" />}
                    <span>Запази</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ТАБОВЕ */}
          <div className="flex items-center gap-2 mt-8 border-b border-[#EBE8E3] -mb-8 pb-3 overflow-x-auto">
            <button
              onClick={() => setActiveTab("catalog")}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 cursor-pointer shrink-0 transition-all ${
                activeTab === "catalog" 
                  ? "bg-[#121212] text-white shadow-2xs" 
                  : "bg-white text-[#525252] border border-[#EBE8E3] hover:text-[#121212]"
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Моят каталог ({supplierProducts.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("orders")}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 cursor-pointer shrink-0 transition-all ${
                activeTab === "orders" 
                  ? "bg-[#121212] text-white shadow-2xs" 
                  : "bg-white text-[#525252] border border-[#EBE8E3] hover:text-[#121212]"
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Постъпили поръчки ({supplierOrders.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("import")}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 cursor-pointer shrink-0 transition-all ${
                activeTab === "import" 
                  ? "bg-[#121212] text-white shadow-2xs" 
                  : "bg-white text-[#525252] border border-[#EBE8E3] hover:text-[#121212]"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Масов Excel импорт</span>
            </button>

            <button
              onClick={() => setActiveTab("add_product")}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 cursor-pointer shrink-0 transition-all ${
                activeTab === "add_product" 
                  ? "bg-[#121212] text-white shadow-2xs" 
                  : "bg-white text-[#525252] border border-[#EBE8E3] hover:text-[#121212]"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Добави стек & Отстъпки</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. ОСНОВНО СЪДЪРЖАНИЕ */}
      <main className="max-w-[1360px] mx-auto px-4 sm:px-8 py-12">
        
        {/* TAB: CATALOG */}
        {activeTab === "catalog" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-serif font-normal text-[#121212]">Ценоразпис и обемни отстъпки</h2>
                <p className="text-xs text-[#737373]">Конфигурирайте цени на едро и отстъпки за по-голям брой стекове.</p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Търси стек по име или баркод..."
                  className="w-full pl-9 pr-3 py-2 bg-[#FAF9F7] border border-[#EBE8E3] rounded-md text-xs focus:outline-none focus:border-[#121212] focus:bg-white"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#EBE8E3] overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#FAF9F7] border-b border-[#EBE8E3] text-[#737373] font-mono text-[10px] uppercase">
                  <tr>
                    <th className="p-3.5 pl-5">Продукт</th>
                    <th className="p-3.5">Цена стек</th>
                    <th className="p-3.5">Препор. на рафт</th>
                    <th className="p-3.5">Обемни отстъпки</th>
                    <th className="p-3.5 text-center">Наличност</th>
                    <th className="p-3.5 pr-5 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F0EB]">
                  {supplierProducts.map((p) => {
                    const isEditing = editingId === p.id;
                    return (
                      <tr key={p.id} className="hover:bg-[#FAF9F7]/60">
                        <td className="p-3.5 pl-5">
                          <p className="font-semibold text-[#121212]">{p.name}</p>
                          <p className="text-[10px] text-[#737373] font-mono">Стек: {p.unitsPerCase} бр. &bull; {p.barcode}</p>
                        </td>

                        <td className="p-3.5">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.casePrice}
                              onChange={(e) => setEditForm({ ...editForm, casePrice: parseFloat(e.target.value) || 0 })}
                              className="w-20 px-2 py-1 border border-[#121212] rounded text-xs font-mono"
                            />
                          ) : (
                            <span className="font-mono font-bold text-[#121212]">{p.casePrice.toFixed(2)} лв.</span>
                          )}
                        </td>

                        <td className="p-3.5">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.rrpPrice}
                              onChange={(e) => setEditForm({ ...editForm, rrpPrice: parseFloat(e.target.value) || 0 })}
                              className="w-16 px-2 py-1 border border-[#121212] rounded text-xs font-mono"
                            />
                          ) : (
                            <span className="font-mono text-[#525252]">{p.rrpPrice.toFixed(2)} лв.</span>
                          )}
                        </td>

                        <td className="p-3.5">
                          {isEditing ? (
                            <div className="space-y-1 bg-[#FAF9F7] p-2 rounded border border-[#EBE8E3]">
                              <label className="flex items-center gap-1.5 text-[11px] font-semibold">
                                <input
                                  type="checkbox"
                                  checked={editForm.hasTieredDiscount}
                                  onChange={(e) => setEditForm({ ...editForm, hasTieredDiscount: e.target.checked })}
                                />
                                <span>Активирай отстъпки</span>
                              </label>
                              {editForm.hasTieredDiscount && (
                                <div className="flex gap-2 text-[10px] pt-1 font-mono">
                                  <span>{editForm.tier1Qty}+ бр: -{editForm.tier1Discount}%</span>
                                  <span>{editForm.tier2Qty}+ бр: -{editForm.tier2Discount}%</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              {p.hasTieredDiscount !== false ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#121212] bg-[#FAF9F7] px-2 py-0.5 rounded border border-[#EBE8E3]">
                                  <Percent className="w-3 h-3 text-[#737373]" /> {p.tier1Qty || 5}+ (-{p.tier1Discount || 5}%) / {p.tier2Qty || 10}+ (-{p.tier2Discount || 10}%)
                                </span>
                              ) : (
                                <span className="text-[10px] text-[#737373]">Без отстъпки</span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handleToggleStock(p.id, p.inStock !== false)}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-mono cursor-pointer ${
                              p.inStock !== false 
                                ? "bg-white text-[#121212] border border-[#EBE8E3] shadow-2xs" 
                                : "bg-neutral-100 text-neutral-400"
                            }`}
                          >
                            {p.inStock !== false ? "В наличност" : "Изчерпан"}
                          </button>
                        </td>

                        <td className="p-3.5 pr-5 text-right">
                          {isEditing ? (
                            <div className="flex justify-end gap-1">
                              <button onClick={() => handleSavePrice(p.id)} className="p-1.5 bg-[#121212] text-white rounded cursor-pointer">
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setEditingId(null)} className="p-1.5 bg-[#FAF9F7] border border-[#EBE8E3] rounded cursor-pointer">
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-1">
                              <button onClick={() => handleStartEdit(p)} className="p-1.5 text-neutral-400 hover:text-[#121212] rounded cursor-pointer">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDeleteProduct(p.id)} className="p-1.5 text-neutral-400 hover:text-red-600 rounded cursor-pointer">
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

        {/* TAB: ORDERS */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-serif font-normal text-[#121212]">Заявки за изпълнение от магазини</h2>
                <p className="text-xs text-[#737373]">Променяйте статусите, за да информирате обектите за натоварването и доставката.</p>
              </div>

              {supplierOrders.length > 0 && (
                <button
                  onClick={handleExportOrdersToExcel}
                  className="px-3.5 py-2 bg-[#121212] hover:bg-neutral-800 text-white font-semibold text-xs rounded-md shadow-xs flex items-center gap-2 transition-all cursor-pointer shrink-0"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Експорт за склад (.xlsx)</span>
                </button>
              )}
            </div>

            {supplierOrders.length === 0 ? (
              <div className="bg-[#FAF9F7] rounded-xl border border-[#EBE8E3] p-12 text-center">
                <Package className="w-8 h-8 stroke-1 text-neutral-400 mx-auto mb-2" />
                <h3 className="text-xs font-bold text-[#121212]">Няма нови поръчки към момента</h3>
              </div>
            ) : (
              <div className="space-y-3">
                {supplierOrders.map((order) => {
                  const currentStatus = order.status || "pending";
                  return (
                    <div key={order.id} className="bg-white rounded-xl border border-[#EBE8E3] p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-bold font-mono text-[#121212] bg-[#FAF9F7] border border-[#EBE8E3] px-2 py-0.5 rounded">
                            #{String(order.id).slice(0, 8)}
                          </span>
                          <span className="text-xs font-bold text-[#121212]">{order.storeName}</span>
                        </div>
                        <p className="text-xs text-[#737373]">
                          Адрес: <strong className="text-[#121212]">{order.address || "гр. София"}</strong> &bull; ЕИК: <strong className="font-mono text-[#121212]">{order.eik || "206894123"}</strong>
                        </p>
                        <p className="text-[11px] text-[#737373]">
                          Сума: <strong className="text-[#121212] font-mono">{Number(order.total).toFixed(2)} лв. с ДДС</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 bg-[#FAF9F7] p-1.5 rounded-lg border border-[#EBE8E3] shrink-0">
                        <span className="text-[10px] font-mono uppercase text-[#737373] mr-1">Статус:</span>
                        <button
                          onClick={() => handleUpdateStatus(order.id, "pending")}
                          disabled={statusUpdating === order.id}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                            currentStatus === "pending" ? "bg-[#121212] text-white shadow-xs" : "text-[#525252] hover:bg-white"
                          }`}
                        >
                          Приета
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(order.id, "processing")}
                          disabled={statusUpdating === order.id}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                            currentStatus === "processing" ? "bg-[#121212] text-white shadow-xs" : "text-[#525252] hover:bg-white"
                          }`}
                        >
                          В подготовка
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(order.id, "shipped")}
                          disabled={statusUpdating === order.id}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                            currentStatus === "shipped" ? "bg-[#121212] text-white shadow-xs" : "text-[#525252] hover:bg-white"
                          }`}
                        >
                          Натоварена
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(order.id, "delivered")}
                          disabled={statusUpdating === order.id}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                            currentStatus === "delivered" ? "bg-[#121212] text-white shadow-xs" : "text-[#525252] hover:bg-white"
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

        {/* TAB: EXCEL IMPORT */}
        {activeTab === "import" && (
          <div className="max-w-3xl bg-white rounded-xl border border-[#EBE8E3] p-6 sm:p-8 space-y-6 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EBE8E3] pb-4">
              <div>
                <h2 className="text-lg font-serif font-normal text-[#121212] flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-[#121212]" />
                  Масов импорт на артикули от Excel
                </h2>
                <p className="text-xs text-[#737373] mt-0.5">
                  Качете файл във формат <strong>.xlsx</strong> или <strong>.csv</strong> с пълния ценоразпис.
                </p>
              </div>
              <button
                onClick={handleDownloadExcelTemplate}
                className="px-3.5 py-2 bg-[#FAF9F7] hover:bg-[#F2F0EB] text-[#121212] border border-[#EBE8E3] font-semibold text-xs rounded-md flex items-center gap-2 cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
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
              className={`border border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                dragActive 
                  ? "border-[#121212] bg-[#FAF9F7]" 
                  : "border-[#EBE8E3] hover:border-neutral-400 bg-[#FAF9F7]"
              }`}
            >
              <FileUp className="w-8 h-8 text-[#737373] mx-auto mb-2" />
              <p className="text-xs font-bold text-[#121212]">
                {fileName ? `Избран файл: ${fileName}` : "Провлачете Excel файл тук или кликнете за избор"}
              </p>
              <p className="text-[10px] text-[#737373] mt-1 font-mono">Поддържат се файлове: .XLSX, .XLS, .CSV</p>
            </div>

            {importStatus && (
              <div className="p-3 bg-[#FAF9F7] border border-[#EBE8E3] text-[#121212] text-xs font-semibold rounded-md flex items-center gap-2">
                <Check className="w-3.5 h-3.5" />
                <span>{importStatus}</span>
              </div>
            )}

            {parsedRows.length > 0 && (
              <div className="space-y-4 pt-2">
                <div className="max-h-60 overflow-y-auto border border-[#EBE8E3] rounded-md bg-white">
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead className="bg-[#FAF9F7] border-b border-[#EBE8E3] text-[#737373] sticky top-0 text-[10px] uppercase">
                      <tr>
                        <th className="p-2.5 pl-4">Артикул</th>
                        <th className="p-2.5">Баркод</th>
                        <th className="p-2.5">Цена стек</th>
                        <th className="p-2.5">Препор. цена</th>
                        <th className="p-2.5">Брой в стек</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F2F0EB]">
                      {parsedRows.map((r, idx) => (
                        <tr key={idx} className="hover:bg-[#FAF9F7]/60">
                          <td className="p-2.5 pl-4 font-sans font-semibold text-[#121212]">{r.name}</td>
                          <td className="p-2.5 text-[#737373]">{r.barcode}</td>
                          <td className="p-2.5 font-bold">{r.casePrice.toFixed(2)} лв.</td>
                          <td className="p-2.5 text-[#525252]">{r.rrpPrice.toFixed(2)} лв.</td>
                          <td className="p-2.5">{r.unitsPerCase} бр.</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={handleUploadRows}
                  disabled={importing}
                  className="w-full py-2.5 bg-[#121212] hover:bg-neutral-800 text-white font-semibold text-xs rounded-md shadow-xs cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{importing ? "Импортиране..." : `Качи всички ${parsedRows.length} артикула`}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB: ADD PRODUCT */}
        {activeTab === "add_product" && (
          <div className="max-w-xl bg-white rounded-xl border border-[#EBE8E3] p-6 sm:p-8 shadow-2xs">
            <h2 className="text-lg font-serif font-normal text-[#121212] mb-1">Добавяне на нов стек & Отстъпки</h2>
            <p className="text-xs text-[#737373] mb-6">Въведете параметрите на продукта и конфигурирайте ценовата си политика.</p>

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
            }} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-semibold text-[#121212] mb-1">Име на продукта / стека *</label>
                <input
                  type="text"
                  required
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="напр. Red Bull Sugarfree 250ml"
                  className="w-full text-xs px-3 py-2 bg-[#FAF9F7] border border-[#EBE8E3] rounded-md focus:outline-none focus:border-[#121212] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#121212] mb-1">Едрова цена за стек (лв.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newProduct.casePrice}
                    onChange={(e) => setNewProduct({ ...newProduct, casePrice: e.target.value })}
                    placeholder="24.50"
                    className="w-full text-xs px-3 py-2 bg-[#FAF9F7] border border-[#EBE8E3] rounded-md font-mono focus:outline-none focus:border-[#121212] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#121212] mb-1">Препоръчителна за 1бр (лв.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newProduct.rrpPrice}
                    onChange={(e) => setNewProduct({ ...newProduct, rrpPrice: e.target.value })}
                    placeholder="1.60"
                    className="w-full text-xs px-3 py-2 bg-[#FAF9F7] border border-[#EBE8E3] rounded-md font-mono focus:outline-none focus:border-[#121212] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#121212] mb-1">Брой в стек *</label>
                  <input
                    type="number"
                    required
                    value={newProduct.unitsPerCase}
                    onChange={(e) => setNewProduct({ ...newProduct, unitsPerCase: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-[#FAF9F7] border border-[#EBE8E3] rounded-md font-mono focus:outline-none focus:border-[#121212] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#121212] mb-1">Категория</label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-[#FAF9F7] border border-[#EBE8E3] rounded-md focus:outline-none focus:border-[#121212] focus:bg-white"
                  >
                    <option value="Безалкохолни & Води">Безалкохолни & Води</option>
                    <option value="Енергийни напитки">Енергийни напитки</option>
                    <option value="Чипс & Снаксове">Чипс & Снаксове</option>
                    <option value="Шоколади & Вафли">Шоколади & Вафли</option>
                    <option value="Кафе & Топъл бар">Кафе & Топъл бар</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#121212] mb-1">Баркод</label>
                  <input
                    type="text"
                    value={newProduct.barcode}
                    onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                    placeholder="3800..."
                    className="w-full text-xs px-3 py-2 bg-[#FAF9F7] border border-[#EBE8E3] rounded-md font-mono focus:outline-none focus:border-[#121212] focus:bg-white"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-[#FAF9F7] border border-[#EBE8E3] rounded-lg space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newProduct.hasTieredDiscount}
                    onChange={(e) => setNewProduct({ ...newProduct, hasTieredDiscount: e.target.checked })}
                    className="rounded text-[#121212]"
                  />
                  <span className="text-xs font-semibold text-[#121212]">Предлагай отстъпка за количество (Tiered Pricing)</span>
                </label>

                {newProduct.hasTieredDiscount && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="bg-white p-2 rounded-md border border-[#EBE8E3]">
                      <p className="text-[10px] font-mono uppercase text-[#737373]">Ниво 1 (Малък обем)</p>
                      <div className="flex gap-1.5 mt-1 font-mono">
                        <input
                          type="number"
                          value={newProduct.tier1Qty}
                          onChange={(e) => setNewProduct({ ...newProduct, tier1Qty: e.target.value })}
                          className="w-14 px-1.5 py-1 text-xs border border-[#EBE8E3] rounded"
                        />
                        <span className="text-xs self-center">бр. &rarr;</span>
                        <input
                          type="number"
                          step="0.5"
                          value={newProduct.tier1Discount}
                          onChange={(e) => setNewProduct({ ...newProduct, tier1Discount: e.target.value })}
                          className="w-14 px-1.5 py-1 text-xs border border-[#EBE8E3] rounded font-bold"
                        />
                        <span className="text-xs self-center">%</span>
                      </div>
                    </div>

                    <div className="bg-white p-2 rounded-md border border-[#EBE8E3]">
                      <p className="text-[10px] font-mono uppercase text-[#737373]">Ниво 2 (Палет)</p>
                      <div className="flex gap-1.5 mt-1 font-mono">
                        <input
                          type="number"
                          value={newProduct.tier2Qty}
                          onChange={(e) => setNewProduct({ ...newProduct, tier2Qty: e.target.value })}
                          className="w-14 px-1.5 py-1 text-xs border border-[#EBE8E3] rounded"
                        />
                        <span className="text-xs self-center">бр. &rarr;</span>
                        <input
                          type="number"
                          step="0.5"
                          value={newProduct.tier2Discount}
                          onChange={(e) => setNewProduct({ ...newProduct, tier2Discount: e.target.value })}
                          className="w-14 px-1.5 py-1 text-xs border border-[#EBE8E3] rounded font-bold"
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
                className="w-full py-2.5 bg-[#121212] hover:bg-neutral-800 text-white font-semibold text-xs rounded-md shadow-xs cursor-pointer uppercase tracking-wider"
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
