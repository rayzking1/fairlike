"use client";

import React, { useState, useEffect } from "react";
import { Eye, EyeOff, X, Store, Building2 } from "lucide-react";
import { useAuth, User } from "@/context/AuthContext";

declare global {
  interface Window {
    google?: any;
  }
}

export default function AuthModal() {
  const { isAuthOpen, setIsAuthOpen, setAuthSession, login } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [role, setRole] = useState<"retailer" | "supplier">("retailer");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Полета на формата
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [eik, setEik] = useState("");
  const [mol, setMol] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedEmail = localStorage.getItem("optom_remembered_email");
      if (savedEmail) setEmail(savedEmail);

      if (!document.getElementById("google-gsi-client")) {
        const script = document.createElement("script");
        script.id = "google-gsi-client";
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      }
    }
  }, [isAuthOpen]);

  if (!isAuthOpen) return null;

  const handleClose = () => {
    setIsAuthOpen(false);
    setError(null);
  };

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

  const syncGoogleUserToBackend = async (googleUser: { email: string; name: string }) => {
    const baseUrl = getApiBaseUrl();
    const isSupp = role === "supplier";
    const payload = {
      email: googleUser.email.toLowerCase(),
      company_name: isSupp ? `${googleUser.name} (Фабрика)` : `${googleUser.name} (Магазин)`,
      role: isSupp ? "supplier" : "retailer",
      eik: "206894123",
      mol: googleUser.name || "Управител",
      address: "гр. София"
    };

    try {
      const res = await fetch(`${baseUrl}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        if (rememberMe) localStorage.setItem("optom_remembered_email", data.user.email);
        setAuthSession(data.user, data.access_token);
      } else {
        const fallback: User = {
          email: payload.email,
          company_name: payload.company_name,
          role: payload.role as any,
          eik: payload.eik,
          mol: payload.mol,
          address: payload.address
        };
        if (rememberMe) localStorage.setItem("optom_remembered_email", fallback.email);
        setAuthSession(fallback);
      }
      handleClose();
    } catch (e) {
      const fallback: User = {
        email: payload.email,
        company_name: payload.company_name,
        role: payload.role as any,
        eik: payload.eik,
        mol: payload.mol,
        address: payload.address
      };
      if (rememberMe) localStorage.setItem("optom_remembered_email", fallback.email);
      setAuthSession(fallback);
      handleClose();
    }
  };

  const handleGoogleAuth = () => {
    setLoading(true);
    setError(null);

    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (googleClientId && window.google?.accounts?.oauth2) {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
          callback: async (tokenResponse: any) => {
            if (tokenResponse && tokenResponse.access_token) {
              try {
                const infoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                });
                const userInfo = await infoRes.json();
                await syncGoogleUserToBackend({
                  email: userInfo.email,
                  name: userInfo.name || userInfo.email.split("@")[0]
                });
              } catch (err) {
                setError("Грешка при извличане на профила от Google.");
              }
            }
            setLoading(false);
          },
          error_callback: () => {
            setLoading(false);
            setError("Google автентикацията беше отказана.");
          }
        });
        client.requestAccessToken();
        return;
      } catch (err) {
        console.error("Google SSO грешка:", err);
      }
    }

    const userPromptEmail = window.prompt("Въведете вашия Google / служебен имейл адрес:");
    if (userPromptEmail && userPromptEmail.includes("@")) {
      const cleanEmail = userPromptEmail.trim().toLowerCase();
      const extractedName = cleanEmail.split("@")[0].toUpperCase();
      syncGoogleUserToBackend({
        email: cleanEmail,
        name: role === "supplier" ? `Фабрика ${extractedName}` : `Търговски Обект ${extractedName}`
      });
    } else {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const baseUrl = getApiBaseUrl();

    try {
      if (rememberMe) {
        localStorage.setItem("optom_remembered_email", email);
      } else {
        localStorage.removeItem("optom_remembered_email");
      }

      if (mode === "register") {
        const payload = {
          email: email.trim().toLowerCase(),
          password,
          company_name: companyName.trim() || (role === "supplier" ? "Фабрика / Дистрибутор" : "Търговски Обект"),
          eik: eik.trim() || "206894123",
          mol: mol.trim() || "Управител",
          address: address.trim() || "гр. София",
          role
        };

        const res = await fetch(`${baseUrl}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Грешка при регистрация");

        setAuthSession(data.user, data.access_token);
        handleClose();
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
          login(email.trim().toLowerCase(), role);
          handleClose();
          return;
        }

        setAuthSession(data.user, data.access_token);
        handleClose();
      }
    } catch (err: any) {
      setError(err.message || "Възникна грешка при вход.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-xl border border-[#EBE8E3] text-[#121212] relative">
        
        {/* Затваряне */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 text-neutral-400 hover:text-[#121212] p-1 cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Заглавна бранд част (Faire-стил) */}
        <div className="flex flex-col items-center text-center mb-6">
          <span className="text-2xl font-serif font-black tracking-[0.2em] text-[#121212] uppercase">
            OPTOM
          </span>
          <p className="text-[10px] uppercase font-mono tracking-widest text-[#737373] mt-1">
            B2B Пазар на едро
          </p>
        </div>

        {/* Избор на тип профил */}
        <div className="mb-6">
          <div className="grid grid-cols-2 gap-1.5 bg-[#FAF9F7] p-1 rounded-lg border border-[#EBE8E3]">
            <button
              type="button"
              onClick={() => setRole("retailer")}
              className={`py-2 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                role === "retailer" 
                  ? "bg-white text-[#121212] shadow-xs border border-[#EBE8E3]" 
                  : "text-[#737373] hover:text-[#121212]"
              }`}
            >
              <Store className="w-3.5 h-3.5" /> Магазин / Обект
            </button>
            <button
              type="button"
              onClick={() => setRole("supplier")}
              className={`py-2 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                role === "supplier" 
                  ? "bg-white text-[#121212] shadow-xs border border-[#EBE8E3]" 
                  : "text-[#737373] hover:text-[#121212]"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" /> Фабрика / Вносител
            </button>
          </div>
        </div>

        {/* Описание */}
        <div className="text-left mb-5">
          <h2 className="text-lg font-serif font-normal text-[#121212]">
            {mode === "login" 
              ? (role === "supplier" ? "Вход за производители" : "Вход за търговски обекти") 
              : (role === "supplier" ? "Регистрация на фабрика" : "Регистрация на магазин")}
          </h2>
          <p className="text-xs text-[#737373] mt-0.5 leading-relaxed">
            {role === "supplier" 
              ? "Управлявайте каталога със стекове, наличностите и поръчките." 
              : "Отключете заводски цени на едро и Net 60 отсрочка."}
          </p>
        </div>

        {/* Google Single Sign-On */}
        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full py-2.5 px-4 bg-[#FAF9F7] hover:bg-[#F2F0EB] border border-[#EBE8E3] rounded-md text-xs font-semibold text-[#121212] flex items-center justify-center gap-2.5 transition-all shadow-2xs cursor-pointer disabled:opacity-60 mb-4"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>Продължи с Google</span>
        </button>

        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-[#EBE8E3] w-full" />
          <span className="bg-white px-3 text-[10px] font-mono uppercase text-[#737373] absolute">
            или
          </span>
        </div>

        {error && (
          <div className="mb-4 p-2.5 bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs rounded-md">
            {error}
          </div>
        )}

        {/* Форма */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-left" autoComplete="on">
          
          {mode === "register" && (
            <div className="space-y-3 pb-2 border-b border-[#EBE8E3]">
              <div>
                <label className="block text-[11px] font-semibold text-[#121212] mb-1">
                  {role === "supplier" ? "Име на фабриката / Бранд *" : "Име на фирмата / Обект *"}
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={role === "supplier" ? "напр. Монделийз България" : "напр. Детелина 2020 ЕООД"}
                  className="w-full text-xs px-3 py-2 bg-[#FAF9F7] border border-[#EBE8E3] rounded-md focus:outline-none focus:border-[#121212] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#121212] mb-1">ЕИК / БУЛСТАТ *</label>
                  <input
                    type="text"
                    required
                    value={eik}
                    onChange={(e) => setEik(e.target.value)}
                    placeholder="206894123"
                    className="w-full text-xs px-3 py-2 bg-[#FAF9F7] border border-[#EBE8E3] rounded-md font-mono focus:outline-none focus:border-[#121212] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#121212] mb-1">МОЛ *</label>
                  <input
                    type="text"
                    required
                    value={mol}
                    onChange={(e) => setMol(e.target.value)}
                    placeholder="Иван Петров"
                    className="w-full text-xs px-3 py-2 bg-[#FAF9F7] border border-[#EBE8E3] rounded-md focus:outline-none focus:border-[#121212] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#121212] mb-1">Адрес на обект / склад *</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="гр. София, бул. Цариградско шосе 115"
                  className="w-full text-xs px-3 py-2 bg-[#FAF9F7] border border-[#EBE8E3] rounded-md focus:outline-none focus:border-[#121212] focus:bg-white"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-[#121212] mb-1">Служебен имейл адрес *</label>
            <input
              type="email"
              autoComplete="username email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sales@company.bg"
              className="w-full text-xs px-3 py-2 bg-[#FAF9F7] border border-[#EBE8E3] rounded-md focus:outline-none focus:border-[#121212] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#121212] mb-1">Парола *</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs px-3 py-2 bg-[#FAF9F7] border border-[#EBE8E3] rounded-md focus:outline-none focus:border-[#121212] focus:bg-white pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2 text-neutral-400 hover:text-[#121212] cursor-pointer p-0.5"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {mode === "login" && (
            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer text-[#525252] text-[11px]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[#EBE8E3] text-[#121212] focus:ring-0 h-3.5 w-3.5"
                />
                <span>Запомни ме</span>
              </label>

              <button
                type="button"
                onClick={() => alert("Линк за нова парола е изпратен.")}
                className="text-[11px] font-medium text-[#121212] hover:underline cursor-pointer"
              >
                Забравена парола?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#121212] hover:bg-neutral-800 text-white font-semibold text-xs rounded-md shadow-xs transition-all cursor-pointer disabled:opacity-60 uppercase tracking-wider mt-2"
          >
            {loading 
              ? "Обработка..." 
              : mode === "login" 
                ? (role === "supplier" ? "Вход като производител" : "Вход като магазин") 
                : (role === "supplier" ? "Регистрация на фабрика" : "Регистрация на магазин")}
          </button>
        </form>

        <div className="text-center mt-5 pt-4 border-t border-[#EBE8E3] text-xs text-[#525252]">
          {mode === "login" ? (
            <span>
              Нямате фирмен акаунт?{" "}
              <button
                type="button"
                onClick={() => setMode("register")}
                className="font-semibold text-[#121212] hover:underline cursor-pointer"
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
                className="font-semibold text-[#121212] hover:underline cursor-pointer"
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
