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

export interface LockedProductPreview {
  name: string;
  imageUrl: string;
  unitsPerCase?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthOpen: boolean;
  authInitialMode: "login" | "register";
  authInitialRole: "retailer" | "supplier";
  activeProductPreview: LockedProductPreview | null;
  setIsAuthOpen: (open: boolean) => void;
  openAuthMode: (mode: "login" | "register", role?: "retailer" | "supplier") => void;
  openAuthWithProduct: (product: LockedProductPreview) => void;
  setAuthSession: (user: User, token?: string) => void;
  login: (userDataOrEmail: User | string, roleOrCompany?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "optom_b2b_session";
const TOKEN_STORAGE_KEY = "optom_b2b_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<"login" | "register">("login");
  const [authInitialRole, setAuthInitialRole] = useState<"retailer" | "supplier">("retailer");
  const [activeProductPreview, setActiveProductPreview] = useState<LockedProductPreview | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem("b2b_user");
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.email) {
          setUser(parsed);
        }
      }
      if (storedToken) {
        setToken(storedToken);
      }
    } catch (e) {
      console.error("Грешка при зареждане на сесията:", e);
    }
  }, []);

  const openAuthMode = (mode: "login" | "register", role: "retailer" | "supplier" = "retailer") => {
    setAuthInitialMode(mode);
    setAuthInitialRole(role);
    setActiveProductPreview(null);
    setIsAuthOpen(true);
  };

  const openAuthWithProduct = (product: LockedProductPreview) => {
    setActiveProductPreview(product);
    setAuthInitialMode("register");
    setAuthInitialRole("retailer");
    setIsAuthOpen(true);
  };

  const handleSetIsAuthOpen = (open: boolean) => {
    setIsAuthOpen(open);
    if (!open) {
      setActiveProductPreview(null);
    }
  };

  const setAuthSession = (userData: User, jwtToken?: string) => {
    setUser(userData);
    if (jwtToken) setToken(jwtToken);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
      localStorage.setItem("b2b_user", JSON.stringify(userData));
      if (jwtToken) localStorage.setItem(TOKEN_STORAGE_KEY, jwtToken);
    } catch (e) {}
  };

  const login = (userDataOrEmail: User | string, roleOrCompany?: string) => {
    let finalUser: User;

    if (typeof userDataOrEmail === "object") {
      finalUser = userDataOrEmail;
    } else {
      const email = userDataOrEmail;
      const role = (roleOrCompany === "supplier" ? "supplier" : "retailer") as "retailer" | "supplier";
      finalUser = {
        email,
        role,
        company_name: `Търговски Обект (${email.split("@")[0].toUpperCase()})`,
        eik: "206894123",
        mol: "Управител",
        address: "гр. София"
      };
    }

    setAuthSession(finalUser);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem("b2b_user");
      localStorage.removeItem("auth_user");
    } catch (e) {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthOpen,
        authInitialMode,
        authInitialRole,
        activeProductPreview,
        setIsAuthOpen: handleSetIsAuthOpen,
        openAuthMode,
        openAuthWithProduct,
        setAuthSession,
        login,
        logout
      }}
    >
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
