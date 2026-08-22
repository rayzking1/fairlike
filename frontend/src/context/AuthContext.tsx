"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface User {
  id?: string;
  email: string;
  role: "retailer" | "supplier" | "admin";
  company_name?: string;
  companyName?: string;
  eik?: string;
  mol?: string;
  address?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthOpen: boolean;
  setIsAuthOpen: (open: boolean) => void;
  setAuthSession: (user: User, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "optom_b2b_session";
const TOKEN_STORAGE_KEY = "optom_b2b_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      }
    } catch (e) {
      console.error("Грешка при зареждане на сесията:", e);
    }
  }, []);

  const setAuthSession = (userData: User, jwtToken: string) => {
    setUser(userData);
    setToken(jwtToken);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
    localStorage.setItem(TOKEN_STORAGE_KEY, jwtToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem("b2b_user");
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthOpen, setIsAuthOpen, setAuthSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
