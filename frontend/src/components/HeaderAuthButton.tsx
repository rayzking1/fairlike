"use client";

import React from "react";
import Link from "next/link";
import { LogIn, LogOut, Building2, Store, FileText } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function HeaderAuthButton() {
  const { user, logout, setIsAuthOpen } = useAuth();

  if (user) {
    return (
      <div className="flex items-center gap-2">
        {user.role === "supplier" ? (
          <Link
            href="/supplier"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all border border-blue-200 shadow-sm"
          >
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>Бранд Портал</span>
          </Link>
        ) : (
          <div className="flex items-center gap-1.5">
            {/* Единствен кликаем бутон за фактури и поръчки */}
            <Link
              href="/orders"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold border border-blue-200 shadow-sm transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Фактури & Поръчки</span>
            </Link>

            {/* Статичен бадж с името на магазина/фирмата */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 select-none">
              <Store className="w-3.5 h-3.5 text-slate-500" />
              <span className="max-w-[140px] truncate">{user.company_name}</span>
            </div>
          </div>
        )}

        <button
          onClick={logout}
          title="Изход от профила"
          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsAuthOpen(true)}
      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all cursor-pointer"
    >
      <LogIn className="w-3.5 h-3.5" />
      <span>Вход / Регистрация</span>
    </button>
  );
}
