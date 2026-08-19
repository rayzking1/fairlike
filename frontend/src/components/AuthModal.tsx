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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-200">
        <div className="bg-slate-900 text-white p-6 relative">
          <button 
            onClick={() => setIsAuthOpen(false)}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold">
            {isLoginView ? "Вход в OPTOM.BG" : "B2B Регистрация"}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isLoginView 
              ? "Управлявайте поръчките и фактурите на вашия магазин" 
              : "Зареждайте магазини или продавайте на едро"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-600">
              {error}
            </div>
          )}

          {!isLoginView && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-3">
              <button
                type="button"
                onClick={() => setRole("retailer")}
                className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  role === "retailer" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600"
                }`}
              >
                <Store className="w-3.5 h-3.5" /> Магазин
              </button>
              <button
                type="button"
                onClick={() => setRole("supplier")}
                className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  role === "supplier" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" /> Бранд / Вносител
              </button>
            </div>
          )}

          {!isLoginView && (
            <>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  required
                  type="text"
                  placeholder="Име на фирма (напр. ЕТ Ивелина)"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    required
                    type="text"
                    placeholder="ЕИК / Булстат"
                    value={eik}
                    onChange={(e) => setEik(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    required
                    type="text"
                    placeholder="МОЛ"
                    value={mol}
                    onChange={(e) => setMol(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  required
                  type="text"
                  placeholder="Адрес по регистрация"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
            </>
          )}

          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              required
              type="email"
              placeholder="Служебен имейл адрес"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              required
              type="password"
              placeholder="Парола"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Зареждане..." : isLoginView ? "Вход в профила" : "Завърши B2B регистрация"}
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => { setIsLoginView(!isLoginView); setError(null); }}
              className="text-xs text-slate-500 hover:text-blue-600 font-medium cursor-pointer"
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
