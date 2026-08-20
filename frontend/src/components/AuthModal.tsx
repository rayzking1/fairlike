"use client";

import React, { useState, useEffect } from "react";
import { Eye, EyeOff, X, Building2, Store, Lock, Mail, Building, MapPin, CheckCircle2 } from "lucide-react";
import { useAuth, User } from "@/context/AuthContext";

export default function AuthModal() {
  const { isAuthOpen, setIsAuthOpen, login } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [role, setRole] = useState<"retailer" | "supplier">("retailer");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [eik, setEik] = useState("");
  const [mol, setMol] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedEmail = localStorage.getItem("optom_remembered_email");
      if (savedEmail) {
        setEmail(savedEmail);
      }
    }
  }, [isAuthOpen]);

  if (!isAuthOpen) return null;

  const handleClose = () => {
    setIsAuthOpen(false);
    setError(null);
  };

  const handleGoogleAuth = () => {
    setLoading(true);
    setTimeout(() => {
      const isSupp = role === "supplier";
      const demoUser: User = {
        email: isSupp ? "factory.sales@optom.bg" : "store.manager@gmail.com",
        company_name: isSupp ? "Монделийз България ЕООД" : "Супермаркет Надежда 4",
        role: isSupp ? "supplier" : "retailer",
        eik: "206894123",
        mol: "Димитър Георгиев",
        address: isSupp ? "гр. София, Складова зона Искър" : "гр. София, бул. Цариградско шосе 115"
      };
      if (rememberMe) {
        localStorage.setItem("optom_remembered_email", demoUser.email);
      }
      login(demoUser);
      setLoading(false);
      handleClose();
    }, 600);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (rememberMe) {
        localStorage.setItem("optom_remembered_email", email);
      } else {
        localStorage.removeItem("optom_remembered_email");
      }

      const userData: User = {
        email,
        company_name: companyName || (role === "supplier" ? "Фабрика / Дистрибутор" : "Търговски Обект"),
        role,
        eik: eik || "206894123",
        mol: mol || "Управител",
        address: address || "гр. София"
      };
      
      login(userData);
      handleClose();
    } catch (err: any) {
      setError(err.message || "Възникна грешка при автентикацията.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
      
      <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-100 text-slate-800 relative animate-in zoom-in-95 duration-200">
        
        {/* Лого */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-black text-base shadow-sm">
              O
            </div>
            <span className="text-2xl font-black tracking-tight text-slate-900">
              OPTOM<span className="text-emerald-600">.BG</span>
            </span>
          </div>
          <p className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400">
            Официален B2B Маркетплейс
          </p>
        </div>

        {/* Избор на роля (Винаги видим за лесно превключване) */}
        <div className="mb-5">
          <label className="block text-[11px] font-bold text-slate-500 mb-1.5 text-center">Изберете типа на вашия бизнес:</label>
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setRole("retailer")}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                role === "retailer" 
                  ? "bg-white text-slate-950 shadow-sm" 
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Store className="w-3.5 h-3.5" /> Магазин / Обект
            </button>
            <button
              type="button"
              onClick={() => setRole("supplier")}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                role === "supplier" 
                  ? "bg-slate-950 text-white shadow-sm" 
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-emerald-400" /> Производител
            </button>
          </div>
        </div>

        {/* Заглавие */}
        <div className="text-left mb-4">
          <h2 className="text-xl font-black text-slate-900">
            {mode === "login" 
              ? (role === "supplier" ? "Вход за Производители" : "Вход за Магазини") 
              : (role === "supplier" ? "Регистрация на Фабрика" : "Регистрация на Магазин")}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            {role === "supplier" 
              ? "Достъп до панела за доставки, поръчки и качване на стекове." 
              : "Отключете заводските цени на едро и Net 60 отсрочка."}
          </p>
        </div>

        {/* Google Single Sign-On */}
        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2.5 transition-all shadow-xs cursor-pointer disabled:opacity-60 mb-4 hover:border-slate-300"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>Продължи с Google ({role === "supplier" ? "Производител" : "Магазин"})</span>
        </button>

        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-slate-200 w-full" />
          <span className="bg-white px-3 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider absolute">
            ИЛИ
          </span>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-left" autoComplete="on">
          
          {mode === "register" && (
            <div className="space-y-3 pb-2 border-b border-slate-100">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {role === "supplier" ? "Име на фабриката / Бранд *" : "Име на фирмата / Обект *"}
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={role === "supplier" ? "напр. Монделийз България" : "напр. Детелина 2020 ЕООД"}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">ЕИК / БУЛСТАТ *</label>
                  <input
                    type="text"
                    required
                    value={eik}
                    onChange={(e) => setEik(e.target.value)}
                    placeholder="206894123"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">МОЛ *</label>
                  <input
                    type="text"
                    required
                    value={mol}
                    onChange={(e) => setMol(e.target.value)}
                    placeholder="Иван Петров"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Адрес на седалище / склад *</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="гр. София, бул. Цариградско шосе 115"
                  className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Имейл адрес *</label>
            <input
              type="email"
              autoComplete="username email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sales@company.bg"
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Парола *</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 focus:bg-white pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === "login" && (
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 text-[11px]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                />
                <span>Запомни ме</span>
              </label>

              <button
                type="button"
                onClick={() => alert("Линк за нова парола е изпратен.")}
                className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
              >
                Забравена парола?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#7CB342] hover:bg-[#689F38] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-60 uppercase tracking-wider mt-2"
          >
            {loading 
              ? "Обработка..." 
              : mode === "login" ? `Вход като ${role === "supplier" ? "Производител" : "Магазин"}` : `Регистрация на ${role === "supplier" ? "Производител" : "Магазин"}`}
          </button>
        </form>

        <div className="text-center mt-5 pt-4 border-t border-slate-100 text-xs text-slate-500">
          {mode === "login" ? (
            <span>
              Нямате фирмен акаунт?{" "}
              <button
                type="button"
                onClick={() => setMode("register")}
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
                onClick={() => setMode("login")}
                className="font-bold text-emerald-700 hover:underline cursor-pointer"
              >
                Влезте тук
              </button>
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleClose}
        className="mt-4 px-5 py-2 bg-white/90 hover:bg-white text-slate-800 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105"
      >
        <X className="w-3.5 h-3.5" />
        <span>Затвори</span>
      </button>
    </div>
  );
}
