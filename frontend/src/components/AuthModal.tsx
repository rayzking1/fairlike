"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { X, Building2, Store, Lock, Mail, User, MapPin, Hash } from "lucide-react";

export default function AuthModal() {
  const { isAuthOpen, setIsAuthOpen, login } = useAuth();
  const [isLoginView, setIsLoginView] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [eik, setEik] = useState("");
  const [address, setAddress] = useState("");
  const [mol, setMol] = useState("");
  const [role, setRole] = useState<"retailer" | "supplier">("retailer");

  if (!isAuthOpen) return null;

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://fairlike.onrender.com";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLoginView) {
        const res = await fetch(`${backendUrl}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Грешка при вход");
        login(data.access_token, data.user);
        setIsAuthOpen(false);
      } else {
        const res = await fetch(`${backendUrl}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            company_name: companyName,
            eik,
            address,
            mol,
            role,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Грешка при регистрация");
        login(data.access_token, data.user);
        setIsAuthOpen(false);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
        
        {/* Хедър */}
        <div className="bg-slate-900 text-white p-6 relative">
          <button 
            onClick={() => setIsAuthOpen(false)}
            className="absolute top-4 right-4 text-slate-300 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold tracking-tight">
            {isLoginView ? "Вход в OPTOM.BG" : "B2B Регистрация"}
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            {isLoginView 
              ? "Управлявайте поръчките и фактурите на вашия магазин" 
              : "Зареждайте магазини или продавайте на едро"}
          </p>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          {!isLoginView && (
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200 mb-2">
              <button
                type="button"
                onClick={() => setRole("retailer")}
                className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  role === "retailer" 
                    ? "bg-white text-blue-600 shadow-sm border border-slate-200/60" 
                    : "text-slate-700 hover:text-slate-900"
                }`}
              >
                <Store className="w-4 h-4" /> Магазин
              </button>
              <button
                type="button"
                onClick={() => setRole("supplier")}
                className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  role === "supplier" 
                    ? "bg-white text-blue-600 shadow-sm border border-slate-200/60" 
                    : "text-slate-700 hover:text-slate-900"
                }`}
              >
                <Building2 className="w-4 h-4" /> Бранд / Вносител
              </button>
            </div>
          )}

          {!isLoginView && (
            <>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Фирма / Търговски обект
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    required
                    type="text"
                    placeholder="напр. ЕТ Ивелина 99"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    ЕИК / Булстат
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      required
                      type="text"
                      placeholder="205123456"
                      value={eik}
                      onChange={(e) => setEik(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    МОЛ
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      required
                      type="text"
                      placeholder="Име Фамилия"
                      value={mol}
                      onChange={(e) => setMol(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Адрес за доставка и регистрация
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    required
                    type="text"
                    placeholder="гр. София, ул. Търговска 10"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Служебен имейл
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                required
                type="email"
                placeholder="store@domain.bg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Парола
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                required
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 mt-2 cursor-pointer"
          >
            {loading ? "Обработка..." : isLoginView ? "Вход в профила" : "Завърши B2B регистрация"}
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => { setIsLoginView(!isLoginView); setError(null); }}
              className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
            >
              {isLoginView 
                ? "Нямате профил? Регистрирайте фирмата си тук" 
                : "Вече имате профил? Влезте оттук"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
