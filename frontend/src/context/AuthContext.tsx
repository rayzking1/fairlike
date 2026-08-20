"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface User {
  id?: string;
  email: string;
  role: "retailer" | "supplier" | "admin";
  company_name?: string;
  companyName?: string;
  storeName?: string;
  name?: string;
  eik?: string;
  mol?: string;
  address?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthOpen: boolean;
  setIsAuthOpen: (open: boolean) => void;
  login: (userDataOrEmail: User | string, roleOrCompany?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "optom_b2b_session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // 1. Автоматично възстановяване на сесията при първоначално зареждане
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem("b2b_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.email) {
          setUser(parsed);
        }
      }
    } catch (e) {
      console.error("Грешка при четене на запазената сесия:", e);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // 2. Вход и автоматично запазване в localStorage
  const login = (userDataOrEmail: User | string, roleOrCompany?: string) => {
    let finalUser: User;

    if (typeof userDataOrEmail === "object") {
      finalUser = userDataOrEmail;
    } else {
      const email = userDataOrEmail;
      const role = (roleOrCompany === "supplier" ? "supplier" : "retailer") as "retailer" | "supplier";
      const fallbackName = email.split("@")[0].toUpperCase();
      
      finalUser = {
        email,
        role,
        company_name: `Търговски Обект (${fallbackName})`,
        eik: "206894123",
        mol: "Управител",
        address: "гр. София, бул. България 1"
      };
    }

    setUser(finalUser);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(finalUser));
      localStorage.setItem("b2b_user", JSON.stringify(finalUser));
    } catch (e) {
      console.error("Неуспешно записване на сесията:", e);
    }
  };

  // 3. Изход и изчистване на паметта
  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem("b2b_user");
      localStorage.removeItem("auth_user");
    } catch (e) {}
  };

  return (
    <AuthContext.Provider value={{ user, isAuthOpen, setIsAuthOpen, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
