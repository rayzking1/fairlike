"use client";

import React, { useState } from "react";
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, X, Download } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CsvImportModal({ isOpen, onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const getApiBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
    }
    if (typeof window !== 'undefined') {
      const currentHost = window.location.hostname;
      if (currentHost.includes('-3000.app.github.dev')) {
        return `https://${currentHost.replace('-3000.app.github.dev', '-8000.app.github.dev')}`;
      }
    }
    return "https://fairlike.onrender.com";
  };

  const handleDownloadTemplate = () => {
    const csvContent = "name,category,barcode,units_per_case,case_price,rrp_price,supplier_name,supplier_minimum,image_url\n" +
      "Шоколад Milka Alpine Milk 100g,Шоколади,7622210286124,24,38.40,2.29,Монделийз България,50.0,https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&q=80\n" +
      "Чипс Chio Паприка 140g,Снаксове,5900547001234,18,43.20,3.19,Интерснак България,50.0,https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&q=80\n" +
      "Минерална вода Банкя 1.5L,Води,3800001234567,6,4.80,1.20,Кока-Кола ХБК България,60.0,https://images.unsplash.com/photo-1559839914-17aae19cec71?w=500&q=80";

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "OPTOM_BG_Shablon_Tsenova_Lista.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setResultMessage(null);
    setErrorMessage(null);

    const baseUrl = getApiBaseUrl();
    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("optom_b2b_token");
      const res = await fetch(`${baseUrl}/api/products/import`, {
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Грешка при импорта на файла");

      setResultMessage(data.message);
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || "Грешка при връзка със сървъра");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 border border-slate-200 animate-in fade-in zoom-in duration-200 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Масов импорт на ценова листа</h3>
            <p className="text-xs text-slate-500">Качете .xlsx или .csv файл от вашата складова програма</p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {resultMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{resultMessage}</span>
          </div>
        )}

        <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl p-6 text-center transition-colors bg-slate-50 mb-4">
          <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-800">
            {file ? file.name : "Изберете или пуснете файл тук"}
          </p>
          <p className="text-xs text-slate-400 mt-1">Поддържа .xlsx, .xls и .csv</p>
          
          <input
            type="file"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setErrorMessage(null);
              setResultMessage(null);
            }}
            className="hidden"
            id="excelFileInput"
          />
          <label
            htmlFor="excelFileInput"
            className="mt-3 inline-block px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer shadow-sm"
          >
            Избери файл от устройството
          </label>
        </div>

        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl mb-5 border border-slate-200/80">
          <span className="text-xs text-slate-600 font-medium">Нямате готова таблица?</span>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Свали примерен CSV шаблон
          </button>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Затвори
          </button>
          <button
            type="button"
            disabled={!file || loading}
            onClick={handleUpload}
            className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Импортиране..." : "Качи в каталога"}
          </button>
        </div>
      </div>
    </div>
  );
}
