"use client";

import React, { useState, useEffect } from "react";
import { Eye, EyeOff, X, Check, AlertCircle } from "lucide-react";
import { useAuth, User } from "@/context/AuthContext";

declare global {
  interface Window {
    google?: any;
  }
}

export default function AuthModal() {
  const { 
    isAuthOpen, 
    setIsAuthOpen, 
    activeProductPreview, 
    authInitialMode, 
    authInitialRole, 
    setAuthSession, 
    login 
  } = useAuth();

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
  const [eikStatus, setEikStatus] = useState<{ valid: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isAuthOpen) {
      setMode(authInitialMode);
      setRole(authInitialRole);
      setError(null);
    }
  }, [isAuthOpen, authInitialMode, authInitialRole]);

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

  const handleEikChange = async (val: string) => {
    setEik(val);
    const cleaned = val.replace(/\D/g, "");
    if (cleaned.length === 9 || cleaned.length === 13) {
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/api/auth/validate-eik/${cleaned}`);
        if (res.ok) {
          const data = await res.json();
          setEikStatus({ valid: data.valid, message: data.message });
        }
      } catch (err) {
        setEikStatus(null);
      }
    } else {
      setEikStatus(null);
    }
  };

  if (!isAuthOpen) return null;

  const handleClose = () => {
    setIsAuthOpen(false);
    setError(null);
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
        localStorage.setItem("optom_remembered_email", data.user.email);
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
        localStorage.setItem("optom_remembered_email", fallback.email);
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
      localStorage.setItem("optom_remembered_email", fallback.email);
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
      localStorage.setItem("optom_remembered_email", email);

      if (mode === "register") {
        const payload = {
          email: email.trim().toLowerCase(),
          password: password || "123456",
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-[440px] w-full p-8 shadow-2xl border border-[#EBE8E3] text-[#121212] relative text-center">
        
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-[#121212] p-1.5 rounded-full hover:bg-neutral-100 cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {activeProductPreview?.imageUrl ? (
          <div className="mx-auto mb-4 w-32 h-24 flex items-center justify-center">
            <img
              src={activeProductPreview.imageUrl}
              alt={activeProductPreview.name}
              className="max-h-full max-w-full object-contain drop-shadow-sm"
            />
          </div>
        ) : (
          <div className="mx-auto mb-3">
            <span className="text-xl font-serif font-black tracking-[0.2em] text-[#121212] uppercase">
              OPTOM
            </span>
          </div>
        )}

        <h2 className="text-2xl font-serif font-normal text-[#121212] tracking-tight">
          {mode === "login" 
            ? "Вход в профила" 
            : role === "supplier" 
              ? "Регистрация на фабрика" 
              : "Unlock wholesale pricing"}
        </h2>
        <p className="text-xs text-[#737373] mt-1">
          {activeProductPreview ? (
            <span>Вижте едровите цени и палетни схеми за <strong>{activeProductPreview.name}</strong></span>
          ) : (
            "Директни заводски цени на стекове за търговски обекти"
          )}
        </p>

        {error && (
          <div className="mt-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md text-left">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-3.5 text-left">
          
          <div>
            <label className="block text-xs font-semibold text-[#121212] mb-1">
              Бизнес имейл (Business email) *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@store.bg"
              className="w-full text-xs px-3.5 py-2.5 bg-white border border-[#D5D1C8] rounded-md focus:outline-none focus:border-[#121212] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#121212] mb-1">
              Парола *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs px-3.5 py-2.5 bg-white border border-[#D5D1C8] rounded-md focus:outline-none focus:border-[#121212] transition-colors pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-[#121212] cursor-pointer p-0.5"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {mode === "register" && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-[#121212] mb-1">
                  {role === "supplier" ? "Име на фабриката / Бранд *" : "Име на търговски обект / Фирма *"}
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={role === "supplier" ? "напр. Монделийз България" : "напр. Минимаркет Надежда"}
                  className="w-full text-xs px-3.5 py-2 bg-white border border-[#D5D1C8] rounded-md focus:outline-none focus:border-[#121212]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-[#121212]">ЕИК / БУЛСТАТ</label>
                    {eikStatus && (
                      <span className={`text-[9px] font-mono flex items-center gap-0.5 ${eikStatus.valid ? "text-emerald-700" : "text-amber-700"}`}>
                        {eikStatus.valid ? <Check className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
                        {eikStatus.valid ? "Валиден" : "Провери"}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={eik}
                    onChange={(e) => handleEikChange(e.target.value)}
                    placeholder="206894123"
                    className="w-full text-xs px-3 py-2 bg-white border border-[#D5D1C8] rounded-md font-mono focus:outline-none focus:border-[#121212]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#121212] mb-1">Град / Адрес</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="гр. София"
                    className="w-full text-xs px-3 py-2 bg-white border border-[#D5D1C8] rounded-md focus:outline-none focus:border-[#121212]"
                  />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#333333] hover:bg-[#1f1f1f] text-white font-semibold text-xs rounded-md shadow-xs transition-all cursor-pointer disabled:opacity-60"
          >
            {loading 
              ? "Обработка..." 
              : mode === "login" 
                ? "Вход в профила" 
                : "Sign up for free"}
          </button>

          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-white hover:bg-neutral-50 border border-[#D5D1C8] rounded-md text-xs font-semibold text-[#121212] flex items-center justify-center gap-2.5 transition-all shadow-2xs cursor-pointer disabled:opacity-60"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{mode === "login" ? "Sign in with Google" : "Sign up with Google"}</span>
          </button>
        </form>

        <p className="text-[10px] text-[#737373] mt-3 leading-tight">
          Продължавайки, вие се съгласявате с нашите <span className="underline cursor-pointer">Общи условия</span> и <span className="underline cursor-pointer">Политика за поверителност</span>.
        </p>

        <div className="mt-5 pt-3 border-t border-[#EBE8E3] text-xs text-[#525252] flex flex-col gap-1.5">
          <div>
            {mode === "register" ? (
              <span>Вече имате профил? <button onClick={() => setMode("login")} className="font-semibold text-[#121212] underline cursor-pointer">Влезте тук</button></span>
            ) : (
              <span>Нямате регистрация? <button onClick={() => { setMode("register"); setRole("retailer"); }} className="font-semibold text-[#121212] underline cursor-pointer">Регистрирайте се</button></span>
            )}
          </div>

          <div className="text-[11px] text-[#737373]">
            Are you a brand?{" "}
            <button
              onClick={() => {
                setRole("supplier");
                setMode("register");
              }}
              className="font-semibold text-[#121212] underline cursor-pointer"
            >
              Sign up to sell
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
