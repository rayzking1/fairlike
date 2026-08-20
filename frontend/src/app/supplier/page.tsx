"use client";

import React, { useState, useEffect } from "react";
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
  Layers, 
  Store, 
  Sparkles, 
  FileSpreadsheet, 
  Save, 
  Check, 
  AlertCircle 
} from "lucide-react";
import HeaderAuthButton from "@/components/HeaderAuthButton";
import { useAuth } from "@/context/AuthContext";

export default function SupplierDashboardPage() {
  const { user, setIsAuthOpen } = useAuth();
  
  const [activeTab, setActiveTab] = useState<"orders" | "import" | "add_product">("orders");
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  // Софтуерен MOQ праг
  const [brandMoq, setBrandMoq] = useState<number>(50);
  const [moqSaved, setMoqSaved] = useState(false);

  // Ръчно добавяне на артикул
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
  const [csvText, setCsvText] = useState("");
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
        setProducts(pData);
      }
    } catch (e) {
      console.error("Грешка при зареждане на данни:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Смяна на статус на поръчката
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setStatusUpdating(orderId);
    const baseUrl = getApiBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        // Fallback обновяване в локалния стейт ако бекенд рутът не е наличен
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
      } else {
        await fetchDashboardData();
      }
    } catch (e) {
      // Локално обновяване при мрежово забавяне
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } finally {
      setStatusUpdating(null);
    }
  };

  // Създаване на единичен продукт
  const handleCreateProduct = async (e: React.FormEvent) => {
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
      imageUrl: newProduct.imageUrl || "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=500&q=80"
    };

    try {
      const res = await fetch(`${baseUrl}/api/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setProductSuccess(true);
        setNewProduct({
          name: "",
          barcode: "",
          casePrice: "",
          rrpPrice: "",
          unitsPerCase: "24",
          category: "Напитки",
          imageUrl: ""
        });
        await fetchDashboardData();
        setTimeout(() => setProductSuccess(false), 2500);
      }
    } catch (e) {
      alert("Грешка при запис на продукта");
    } finally {
      setProductSaving(false);
    }
  };

  // Обработка на масов CSV импорт
  const handleCsvImport = async () => {
    if (!csvText.trim()) {
      alert("Моля, поставете или качете CSV съдържание.");
      return;
    }

    setImportStatus("Обработка на артикулите...");
    const lines = csvText.trim().split("\n");
    const baseUrl = getApiBaseUrl();
    let importedCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",").map((p) => p.trim());
      if (parts.length >= 4) {
        const [name, barcode, casePrice, rrpPrice, unitsPerCase, category, img] = parts;
        const payload = {
          name: name || "FMCG Продукт",
          barcode: barcode || String(Date.now() + i),
          casePrice: parseFloat(casePrice) || 20,
          rrpPrice: parseFloat(rrpPrice) || 28,
          unitsPerCase: parseInt(unitsPerCase, 10) || 24,
          category: category || "Напитки",
          supplierName: user?.company_name || "Официален Производител",
          supplierMinimum: brandMoq,
          imageUrl: img || "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=500&q=80"
        };

        try {
          await fetch(`${baseUrl}/api/products`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          importedCount++;
        } catch (e) {}
      }
    }

    setImportStatus(`Успешно импортирани ${importedCount} нови артикула!`);
    await fetchDashboardData();
    setTimeout(() => {
      setImportStatus(null);
      setCsvText("");
      setActiveTab("orders");
    }, 2000);
  };

  const handleDownloadCsvTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,Име на артикул,Баркод,Цена на стек (лв),Препоръчителна цена за 1бр (лв),Брой в стек,Категория,Линк към снимка\nCoca-Cola Кен 330ml,5449000000996,24.00,1.40,24,Напитки,https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=500\nChio Чипс Паприка 140g,4000436000000,32.00,2.60,16,Снаксове,https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "OPTOM_BG_Shablon_Impor_Stoki.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

      {/* Hero банер за доставчика */}
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
                  Управлявайте заводските квоти, поръчките от магазини и масовия импорт на стекове.
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
          <div className="flex items-center gap-2 mt-8 border-b border-slate-100 -mb-8 pb-3">
            <button
              onClick={() => setActiveTab("orders")}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
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
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "import"
                  ? "bg-slate-950 text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Масов CSV / Excel импорт</span>
            </button>

            <button
              onClick={() => setActiveTab("add_product")}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "add_product"
                  ? "bg-slate-950 text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Добави нов стек</span>
            </button>
          </div>
        </div>
      </div>

      {/* Съдържание */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-12">
        
        {/* ТАБ 1: ПОРЪЧКИ И СТАТУСИ */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-950">Заявки за изпълнение от магазини</h2>
                <p className="text-xs text-slate-500">Променяйте статусите, за да информирате обектите за доставката.</p>
              </div>
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
                  const dateStr = order.createdAt || order.created_at;
                  const total = order.total || order.subtotal || 0;

                  return (
                    <div 
                      key={order.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black font-mono text-slate-950 bg-slate-100 px-2 py-1 rounded-md">
                            #{order.id.slice(0, 8)}
                          </span>
                          <span className="text-sm font-bold text-slate-900">{storeName}</span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Адрес: <strong>{order.address || "гр. София"}</strong> &bull; ЕИК: <strong className="font-mono">{order.eik || "206894123"}</strong>
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Сума на заявката: <strong className="text-slate-900 font-mono">{Number(total).toFixed(2)} лв. с ДДС</strong> &bull; Условия: <strong className="uppercase">{order.paymentTerms || "Net 60"}</strong>
                        </p>
                      </div>

                      {/* Селектор за статус на поръчката */}
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

        {/* ТАБ 2: МАСОВ CSV/EXCEL ИМПОРТ */}
        {activeTab === "import" && (
          <div className="max-w-3xl bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-950">Масово качване на артикули</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Импортирайте стотици стекове наведнъж чрез стандартен CSV или Excel списък.
                </p>
              </div>
              <button
                onClick={handleDownloadCsvTemplate}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" /> Шаблон за импорт
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Поставете данните от CSV / Excel таблицата:
              </label>
              <textarea
                rows={8}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Име на артикул,Баркод,Цена на стек (лв),Препоръчителна цена (лв),Брой в стек,Категория,Линк към снимка&#10;Coca-Cola Кен 330ml,5449000000996,24.00,1.40,24,Напитки,https://...&#10;Red Bull 250ml,9002490100070,36.00,2.50,24,Напитки,https://..."
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white leading-relaxed"
              />
            </div>

            {importStatus && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{importStatus}</span>
              </div>
            )}

            <button
              onClick={handleCsvImport}
              className="w-full py-3.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Стартирай масов импорт</span>
            </button>
          </div>
        )}

        {/* ТАБ 3: РЪЧНО ДОБАВЯНЕ НА СТЕК */}
        {activeTab === "add_product" && (
          <div className="max-w-2xl bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-black text-slate-950">Добавяне на нов стек към каталога</h2>
              <p className="text-xs text-slate-500 mt-0.5">Въведете параметрите на опаковката и цената на едро.</p>
            </div>

            {productSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Артикулът беше успешно публикуван в каталога на едро!</span>
              </div>
            )}

            <form onSubmit={handleCreateProduct} className="space-y-4">
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Едрова цена за цял стек (лв.) *</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Препоръчителна цена за 1бр (RRP) *</label>
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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Линк към снимка на артикула</label>
                <input
                  type="url"
                  value={newProduct.imageUrl}
                  onChange={(e) => setNewProduct({ ...newProduct, imageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
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
