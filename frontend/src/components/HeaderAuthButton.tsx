"use client";

import React from "react";
import Link from "next/link";
import { LogIn, LogOut, Building2, Store, FileText, PackagePlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function HeaderAuthButton() {
  const { user, logout, setIsAuthOpen } = useAuth();

  if (!user) {
    return (
      <button
        onClick={() => setIsAuthOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#121212] hover:bg-neutral-800 text-white rounded-md text-xs font-semibold shadow-xs transition-all cursor-pointer"
      >
        <LogIn className="w-3.5 h-3.5" />
        <span>Вход / Регистрация</span>
      </button>
    );
  }

  const isSupplier = user.role === "supplier";

  return (
    <div className="flex items-center gap-2">
      {/* Бутон според ролята */}
      {isSupplier ? (
        <Link
          href="/supplier"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF9F7] hover:bg-[#F2F0EB] border border-[#EBE8E3] text-[#121212] rounded-md text-xs font-semibold transition-all shadow-2xs"
        >
          <PackagePlus className="w-3.5 h-3.5 text-[#121212]" />
          <span className="hidden sm:inline">Доставчик Панел</span>
        </Link>
      ) : (
        <Link
          href="/orders"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF9F7] hover:bg-[#F2F0EB] border border-[#EBE8E3] text-[#121212] rounded-md text-xs font-semibold transition-all shadow-2xs"
        >
          <FileText className="w-3.5 h-3.5 text-[#121212]" />
          <span className="hidden sm:inline">Фактури & Заявки</span>
        </Link>
      )}

      {/* Профилен бейдж */}
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

      {/* Бутон за изход */}
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
