"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { UserData, registerCustomer, fetchUserByEmail, fetchUsers } from "@/lib/api";

interface AuthContextType {
  user: UserData | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  register: (payload: { full_name: string; email: string; phone?: string }) => Promise<UserData>;
  login: (email: string) => Promise<UserData>;
  logout: () => void;
  updateUserLocally: (updated: Partial<UserData>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "jhes_cafe_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Re-hydrate session from localStorage on initial render
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      } else {
        setUser(null);
      }
    } catch (e) {
      console.warn("Failed to read user from localStorage", e);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = async (payload: { full_name: string; email: string; phone?: string }): Promise<UserData> => {
    setIsLoading(true);
    try {
      const created = await registerCustomer(payload);
      setUser(created);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(created));
      return created;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string): Promise<UserData> => {
    setIsLoading(true);
    try {
      const found = await fetchUserByEmail(email);
      if (!found) {
        throw new Error(`No account found with email "${email}". Please register or check your spelling.`);
      }
      setUser(found);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(found));
      return found;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const updateUserLocally = (updated: Partial<UserData>) => {
    if (!user) return;
    const nextUser = { ...user, ...updated };
    setUser(nextUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        register,
        login,
        logout,
        updateUserLocally,
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
