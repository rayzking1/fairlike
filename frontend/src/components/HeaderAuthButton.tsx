"use client";

import { useAuth } from "@/context/AuthContext";
import { LogOut, Store, Building2 } from "lucide-react";

export default function HeaderAuthButton() {
  const { user, logout, setIsAuthOpen } = useAuth();

  if (!user) {
    return (
      <button
        onClick={() => setIsAuthOpen(true)}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
      >
        Вход / Регистрация
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-semibold text-slate-800 border border-slate-200">
        {user.role === "supplier" ? (
          <Building2 className="w-3.5 h-3.5 text-blue-600" />
        ) : (
          <Store className="w-3.5 h-3.5 text-emerald-600" />
        )}
        <span>{user.company_name}</span>
        <span className="text-[10px] text-slate-400 uppercase">({user.role})</span>
      </div>
      
      <button
        onClick={logout}
        title="Изход"
        className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
}
