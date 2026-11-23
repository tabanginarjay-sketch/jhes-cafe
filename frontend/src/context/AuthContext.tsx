"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { UserData, registerCustomer, fetchUserByEmail, bindSocialAccountApi } from "@/lib/api";

interface AuthContextType {
  user: UserData | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  register: (payload: { full_name: string; email: string; phone?: string }) => Promise<UserData>;
  login: (email: string) => Promise<UserData>;
  bindSocialAccount: (
    provider: "google" | "apple",
    email: string,
    name: string,
    avatarUrl?: string
  ) => Promise<UserData>;
  logout: () => void;
  updateUserLocally: (updated: Partial<UserData>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "brew_and_co_user";

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
    const cleanEmail = payload.email.trim().toLowerCase();
    try {
      let created: UserData;
      try {
        created = await registerCustomer({
          ...payload,
          email: cleanEmail,
        });
      } catch {
        created = {
          id: `cust-${Date.now()}`,
          full_name: payload.full_name,
          email: cleanEmail,
          phone: payload.phone,
          role: "customer",
          loyalty_points: 25,
        };
      }
      setUser(created);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(created));
      localStorage.setItem("brew_and_co_last_device_email", cleanEmail);
      return created;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string): Promise<UserData> => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    try {
      // 1. Try finding in backend/Airtable
      const found = await fetchUserByEmail(cleanEmail);
      if (found) {
        setUser(found);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(found));
        localStorage.setItem("brew_and_co_last_device_email", cleanEmail);
        return found;
      }

      // 2. If not found yet, auto-register customer seamlessly with derived friendly name
      const usernamePart = cleanEmail.split("@")[0] || "Valued Customer";
      const derivedName = usernamePart
        .replace(/[._-]/g, " ")
        .split(" ")
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ") || "Valued Customer";

      let created: UserData;
      try {
        created = await registerCustomer({
          full_name: derivedName,
          email: cleanEmail,
        });
      } catch {
        created = {
          id: `cust-${Date.now()}`,
          full_name: derivedName,
          email: cleanEmail,
          role: "customer",
          loyalty_points: 25,
        };
      }

      setUser(created);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(created));
      localStorage.setItem("brew_and_co_last_device_email", cleanEmail);
      return created;
    } finally {
      setIsLoading(false);
    }
  };

  const bindSocialAccount = async (
    provider: "google" | "apple",
    email: string,
    name: string,
    avatarUrl?: string
  ): Promise<UserData> => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    try {
      let bound: UserData;
      try {
        bound = await bindSocialAccountApi({
          provider,
          email: cleanEmail,
          full_name: name,
          avatar_url: avatarUrl,
        });
      } catch {
        bound = {
          id: `social-${Date.now()}`,
          full_name: name,
          email: cleanEmail,
          role: "customer",
          loyalty_points: 50,
          auth_provider: provider,
        };
      }
      setUser(bound);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bound));
      localStorage.setItem("brew_and_co_last_device_email", cleanEmail);
      return bound;
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
        bindSocialAccount,
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
