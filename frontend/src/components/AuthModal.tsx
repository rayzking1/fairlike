"use client";

import React, { useState } from "react";
import { Eye, EyeOff, X, Building2, Store, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function AuthModal() {
  const { isAuthOpen, setIsAuthOpen, setAuthSession } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [role, setRole] = useState<"retailer" | "supplier">("retailer");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [eik, setEik] = useState("");
  const [mol, setMol] = useState("");
  const [address, setAddress] = useState("");

  if (!isAuthOpen) return null;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const baseUrl = getApiBaseUrl();

    try {
      if (mode === "register") {
        const payload = {
          email: email.trim().toLowerCase(),
          password,
          company_name: companyName.trim(),
          eik: eik.trim(),
          mol: mol.trim(),
          address: address.trim(),
          role
        };

        const res = await fetch(`${baseUrl}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || "Грешка при регистрация");
        }

        setAuthSession(data.user, data.access_token);
        setIsAuthOpen(false);
      } else {
        const res = await fetch(`${baseUrl}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            email: email.trim().toLowerCase(), 
            password 
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || "Грешен имейл адрес или парола");
        }

        setAuthSession(data.user, data.access_token);
        setIsAuthOpen(false);
      }
    } catch (err: any) {
      setError(err.message || "Грешка при връзка със сървъра.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-100 relative">
        <button 
          onClick={() => setIsAuthOpen(false)} 
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-slate-900">
            OPTOM<span className="text-emerald-600">.BG</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {mode === "login" ? "Вход в търговския B2B профил" : "Регистрация на търговски обект / фабрика"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl mb-4">
          <button
            type="button"
            onClick={() => setRole("retailer")}
            className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              role === "retailer" 
                ? "bg-white text-slate-950 shadow-sm" 
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Store className="w-3.5 h-3.5 text-emerald-600" /> Магазин
          </button>
          <button
            type="button"
            onClick={() => setRole("supplier")}
            className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              role === "supplier" 
                ? "bg-slate-950 text-white shadow-sm" 
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-emerald-400" /> Производител
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "register" && (
            <>
              <input
                type="text"
                required
                placeholder={role === "supplier" ? "Име на фирма / фабрика / марка *" : "Име на фирма / търговски обект *"}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-slate-950 font-medium"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="ЕИК / БУЛСТАТ *"
                  value={eik}
                  onChange={(e) => setEik(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none focus:border-slate-950"
                />
                <input
                  type="text"
                  required
                  placeholder="МОЛ *"
                  value={mol}
                  onChange={(e) => setMol(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-slate-950"
                />
              </div>
              <input
                type="text"
                required
                placeholder="Адрес на склад / обект за доставка *"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-slate-950 font-medium"
              />
            </>
          )}

          <input
            type="email"
            required
            placeholder="Имейл адрес (за фактури и вход) *"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-slate-950 font-medium"
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              placeholder="Парола *"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl pr-10 focus:bg-white focus:outline-none focus:border-slate-950 font-medium"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{mode === "login" ? "Вход в профила" : "Създай профил"}</span>
          </button>
        </form>

        <div className="text-center mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
          {mode === "login" ? (
            <span>
              Нямате фирмен акаунт?{" "}
              <button 
                type="button" 
                onClick={() => { setMode("register"); setError(null); }} 
                className="font-bold text-emerald-700 hover:underline cursor-pointer"
              >
                Регистрация
              </button>
            </span>
          ) : (
            <span>
              Вече имате профил?{" "}
              <button 
                type="button" 
                onClick={() => { setMode("login"); setError(null); }} 
                className="font-bold text-emerald-700 hover:underline cursor-pointer"
              >
                Влезте тук
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
