"use client";

import React from "react";
import Link from "next/link";
import { LogOut, Building2, Store, FileText, PackagePlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function HeaderAuthButton() {
  const { user, logout, openAuthMode } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center gap-4 sm:gap-6 text-xs">
        {/* 1. Sign up to sell -> Отваря Регистрация за Фабрика/Вносител */}
        <button
          onClick={() => openAuthMode("register", "supplier")}
          className="text-[#525252] hover:text-[#121212] font-medium transition-colors cursor-pointer hidden md:inline-block"
        >
          Sign up to sell
        </button>

        {/* 2. Sign in -> Отваря Вход */}
        <button
          onClick={() => openAuthMode("login")}
          className="text-[#121212] font-medium hover:underline transition-all cursor-pointer"
        >
          Sign in
        </button>

        {/* 3. Sign up to buy -> Отваря Регистрация за Магазини/Купувачи */}
        <button
          onClick={() => openAuthMode("register", "retailer")}
          className="px-4 py-2 bg-[#262626] hover:bg-[#121212] text-white rounded-md font-semibold text-xs transition-all shadow-xs cursor-pointer"
        >
          Sign up to buy
        </button>
      </div>
    );
  }

  const isSupplier = user.role === "supplier";

  return (
    <div className="flex items-center gap-2.5 text-xs">
      {isSupplier ? (
        <Link
          href="/supplier"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF9F7] hover:bg-[#F2F0EB] border border-[#EBE8E3] text-[#121212] rounded-md font-semibold transition-all shadow-2xs"
        >
          <PackagePlus className="w-3.5 h-3.5 text-[#121212]" />
          <span className="hidden sm:inline">Доставчик Панел</span>
        </Link>
      ) : (
        <Link
          href="/orders"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF9F7] hover:bg-[#F2F0EB] border border-[#EBE8E3] text-[#121212] rounded-md font-semibold transition-all shadow-2xs"
        >
          <FileText className="w-3.5 h-3.5 text-[#121212]" />
          <span className="hidden sm:inline">Фактури & Заявки</span>
        </Link>
      )}

      <div className="flex items-center gap-2 px-2.5 py-1 bg-white border border-[#EBE8E3] rounded-md">
        {isSupplier ? (
          <Building2 className="w-3.5 h-3.5 text-[#121212] shrink-0" />
        ) : (
          <Store className="w-3.5 h-3.5 text-[#121212] shrink-0" />
        )}
        <div className="text-left hidden md:block max-w-[130px]">
          <p className="text-[11px] font-bold text-[#121212] truncate leading-tight">
            {user.company_name || user.companyName || user.email.split("@")[0]}
          </p>
          <p className="text-[9px] text-[#737373] font-medium uppercase tracking-wider">
            {isSupplier ? "Фабрика" : "Обект"}
          </p>
        </div>
      </div>

      <button
        onClick={logout}
        title="Изход от профила"
        className="p-1.5 text-neutral-400 hover:text-[#121212] hover:bg-[#FAF9F7] rounded-md border border-transparent hover:border-[#EBE8E3] transition-all cursor-pointer"
      >
        <LogOut className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
