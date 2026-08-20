"use client";

import React from "react";
import Link from "next/link";
import { LogIn, LogOut, User as UserIcon, Building2, Store, FileText, PackagePlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import AuthModal from "./AuthModal";

export default function HeaderAuthButton() {
  const { user, logout, setIsAuthOpen } = useAuth();

  if (!user) {
    return (
      <>
        <button
          onClick={() => setIsAuthOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer hover:scale-105"
        >
          <LogIn className="w-3.5 h-3.5 text-emerald-400" />
          <span>Вход / Регистрация</span>
        </button>
        <AuthModal />
      </>
    );
  }

  const isSupplier = user.role === "supplier";

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Бутон според ролята */}
        {isSupplier ? (
          <Link
            href="/supplier"
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-950 rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <PackagePlus className="w-3.5 h-3.5 text-emerald-700" />
            <span className="hidden sm:inline">Доставчик Панел</span>
          </Link>
        ) : (
          <Link
            href="/orders"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Фактури & Поръчки</span>
          </Link>
        )}

        {/* Профилен бейдж */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/90 border border-slate-200 rounded-xl">
          {isSupplier ? (
            <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          ) : (
            <Store className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          )}
          <div className="text-left hidden md:block max-w-[140px]">
            <p className="text-[11px] font-bold text-slate-900 truncate leading-tight">
              {user.company_name || user.companyName || user.email.split("@")[0]}
            </p>
            <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">
              {isSupplier ? "Производител" : "Търговски обект"}
            </p>
          </div>
        </div>

        {/* Бутон за изход */}
        <button
          onClick={logout}
          title="Изход от профила"
          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-200 transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
      <AuthModal />
    </>
  );
}
