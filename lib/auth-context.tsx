"use client";

import * as React from "react";
import type { AuthUser } from "@/types";
import { isNativeApp, listenForNativeAuth, startNativeLogin } from "@/lib/native-auth";

interface AuthContextValue {
  user: AuthUser | null;
  ready: boolean;
  /**
   * Web: full-page redirect into the real Google OAuth consent screen.
   * App mobile: buka Chrome Custom Tab (Google menolak OAuth di WebView).
   */
  login: () => void;
  /** Hanya di app mobile: sedang menunggu login di browser. */
  loggingIn: boolean;
  /** Hanya di app mobile: pesan error login terakhir. */
  loginError: string | null;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [ready, setReady] = React.useState(false);
  const [loggingIn, setLoggingIn] = React.useState(false);
  const [loginError, setLoginError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      const body = await res.json().catch(() => null);
      setUser(body?.ok ? body.data.user : null);
    } catch {
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  // App mobile: tangkap deep link depup://auth yang membawa hasil login dari Custom Tab.
  React.useEffect(() => {
    if (!isNativeApp()) return;
    return listenForNativeAuth(
      (r) => {
        setLoggingIn(false);
        if (r.status === "ok") {
          setLoginError(null);
          void refresh();
        } else if (r.status === "error") {
          setLoginError(r.message);
        }
      },
      () => setLoggingIn(false)
    );
  }, [refresh]);

  const login = React.useCallback(() => {
    if (isNativeApp()) {
      setLoginError(null);
      setLoggingIn(true);
      startNativeLogin().catch(() => {
        setLoggingIn(false);
        setLoginError("Tidak bisa membuka halaman login Google. Pastikan Chrome terpasang, lalu coba lagi.");
      });
      return;
    }
    window.location.href = "/api/auth/google";
  }, []);

  const logout = React.useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      // Cache lokal berisi token/env var — jangan tertinggal di browser
      // (mis. komputer bersama) setelah logout.
      try {
        Object.keys(window.localStorage)
          .filter((k) => k.startsWith("depup-fallback:"))
          .forEach((k) => window.localStorage.removeItem(k));
      } catch {
        /* storage tidak tersedia — abaikan */
      }
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, login, loggingIn, loginError, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
