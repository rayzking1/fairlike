"use client";

import React from "react";
import Link from "next/link";
import { User, LogIn, LogOut, Building2, Store } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function HeaderAuthButton() {
  const { user, setIsAuthOpen, logout } = useAuth();

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => setIsAuthOpen(true)}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold transition-all cursor-pointer"
      >
        <LogIn className="w-3.5 h-3.5" />
        <span>Вход / Регистрация</span>
      </button>
    );
  }

  const isSupplier = user.role === "supplier";

  return (
    <div className="flex items-center gap-2">
      {isSupplier ? (
        <Link
          href="/supplier"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold hover:bg-emerald-100 transition-all"
        >
          <Building2 className="w-3.5 h-3.5 text-emerald-700" />
          <span className="truncate max-w-[130px]">{user.company_name || "Доставчик"}</span>
        </Link>
      ) : (
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold">
          <Store className="w-3.5 h-3.5 text-slate-600" />
          <span className="truncate max-w-[130px]">{user.company_name || user.email}</span>
        </div>
      )}

      <button
        type="button"
        onClick={logout}
        title="Изход от профила"
        className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
      >
        <LogOut className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
