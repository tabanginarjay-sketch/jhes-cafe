"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  UserData,
  registerCustomer,
  fetchUserByEmail,
  bindSocialAccountApi,
  authWithGoogle,
  authWithGoogleCode,
  authWithFacebook,
  authRegister,
  authLogin,
  authGetMe,
  authLogout,
  AuthSessionResponse,
} from "@/lib/api";

interface AuthContextType {
  user: UserData | null;
  sessionToken: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isAuthenticated: boolean;
  refreshUser: () => Promise<UserData | null>;
  loginWithGoogle: (idToken: string, clientId?: string) => Promise<UserData>;
  loginWithGoogleCode: (code: string, redirectUri: string, clientId?: string) => Promise<UserData>;
  loginWithFacebook: (payload: { access_token?: string; code?: string; redirect_uri?: string }) => Promise<UserData>;
  registerWithEmail: (payload: {
    full_name: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<UserData>;
  loginWithEmail: (payload: { email: string; password: string }) => Promise<UserData>;
  register: (payload: { full_name: string; email: string; phone?: string }) => Promise<UserData>;
  login: (email: string) => Promise<UserData>;
  bindSocialAccount: (
    provider: "google" | "apple",
    email: string,
    name: string,
    avatarUrl?: string
  ) => Promise<UserData>;
  logout: () => Promise<void>;
  updateUserLocally: (updated: Partial<UserData>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "jhes_cafe_user";
const TOKEN_KEY = "jhes_cafe_token";
const LEGACY_KEYS = ["brew_and_co_user", "brew_and_co_token", "brew_and_co_last_device_email"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshUser = useCallback(async (): Promise<UserData | null> => {
    setIsRefreshing(true);
    try {
      const serverUser = await authGetMe();
      if (serverUser) {
        setUser(serverUser);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(serverUser));
        } catch {}
        return serverUser;
      }
      setUser(null);
      setSessionToken(null);
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(TOKEN_KEY);
      } catch {}
      return null;
    } catch {
      return null;
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Re-hydrate session strictly from server-verified HttpOnly cookie via /api/v1/auth/me
  useEffect(() => {
    async function initSession() {
      try {
        // Clean legacy brew_and_co keys
        LEGACY_KEYS.forEach((k) => {
          try {
            localStorage.removeItem(k);
          } catch {}
        });

        await refreshUser();
      } catch (e) {
        console.warn("Session initialization notice:", e);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    void initSession();
  }, [refreshUser]);

  // Keep Header, Account, and Checkout synchronized when returning to browser tab
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleFocus = () => {
      if (user) {
        void refreshUser();
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [user, refreshUser]);

  const loginWithGoogle = useCallback(async (idToken: string, clientId?: string): Promise<UserData> => {
    setIsLoading(true);
    try {
      const resp = await authWithGoogle(idToken, clientId);
      setUser(resp.user);
      setSessionToken(resp.access_token);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(resp.user));
      localStorage.setItem(TOKEN_KEY, resp.access_token);
      localStorage.setItem("jhes_cafe_last_device_email", resp.user.email);
      return resp.user;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithFacebook = useCallback(
    async (payload: { access_token?: string; code?: string; redirect_uri?: string }): Promise<UserData> => {
      setIsLoading(true);
      try {
        const resp = await authWithFacebook(payload);
        setUser(resp.user);
        setSessionToken(resp.access_token);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(resp.user));
        localStorage.setItem(TOKEN_KEY, resp.access_token);
        localStorage.setItem("jhes_cafe_last_device_email", resp.user.email);
        return resp.user;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const loginWithGoogleCode = useCallback(async (code: string, redirectUri: string, clientId?: string): Promise<UserData> => {
    setIsLoading(true);
    try {
      const resp = await authWithGoogleCode(code, redirectUri, clientId);
      setUser(resp.user);
      setSessionToken(resp.access_token);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(resp.user));
      localStorage.setItem(TOKEN_KEY, resp.access_token);
      localStorage.setItem("jhes_cafe_last_device_email", resp.user.email);
      return resp.user;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const registerWithEmail = async (payload: {
    full_name: string;
    email: string;
    password: string;
    phone?: string;
  }): Promise<UserData> => {
    setIsLoading(true);
    try {
      const resp = await authRegister(payload);
      setUser(resp.user);
      setSessionToken(resp.access_token);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(resp.user));
      localStorage.setItem(TOKEN_KEY, resp.access_token);
      localStorage.setItem("jhes_cafe_last_device_email", resp.user.email);
      return resp.user;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithEmail = async (payload: {
    email: string;
    password: string;
  }): Promise<UserData> => {
    setIsLoading(true);
    try {
      const resp = await authLogin(payload);
      setUser(resp.user);
      setSessionToken(resp.access_token);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(resp.user));
      localStorage.setItem(TOKEN_KEY, resp.access_token);
      localStorage.setItem("jhes_cafe_last_device_email", resp.user.email);
      return resp.user;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: {
    full_name: string;
    email: string;
    phone?: string;
  }): Promise<UserData> => {
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
      localStorage.setItem("jhes_cafe_last_device_email", cleanEmail);
      return created;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string): Promise<UserData> => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    try {
      const found = await fetchUserByEmail(cleanEmail);
      if (found) {
        setUser(found);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(found));
        localStorage.setItem("jhes_cafe_last_device_email", cleanEmail);
        return found;
      }

      const usernamePart = cleanEmail.split("@")[0] || "Valued Customer";
      const derivedName =
        usernamePart
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
      localStorage.setItem("jhes_cafe_last_device_email", cleanEmail);
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
      localStorage.setItem("jhes_cafe_last_device_email", cleanEmail);
      return bound;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authLogout();
    } catch {
      // ignore
    }
    setUser(null);
    setSessionToken(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
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
        sessionToken,
        isLoading,
        isRefreshing,
        isAuthenticated: !!user,
        refreshUser,
        loginWithGoogle,
        loginWithGoogleCode,
        loginWithFacebook,
        registerWithEmail,
        loginWithEmail,
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
