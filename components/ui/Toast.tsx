"use client";

import * as React from "react";

interface ToastContextValue {
  showToast: (message: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = React.useState("");
  const [visible, setVisible] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = React.useCallback((msg: string) => {
    setMessage(msg);
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    // Durasi mengikuti panjang teks: ±65ms per karakter, minimal 3,5 dtk, maksimal 14 dtk.
    const ms = Math.min(14000, Math.max(3500, msg.length * 65));
    timerRef.current = setTimeout(() => setVisible(false), ms);
  }, []);

  const pause = React.useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);
  const resume = React.useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 2500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        id="toast"
        className={`glass-flat ${visible ? "show" : ""}`}
        style={{ color: "var(--text)", maxWidth: "min(420px, calc(100vw - 32px))", cursor: "pointer" }}
        onMouseEnter={pause}
        onMouseLeave={resume}
        onClick={() => setVisible(false)}
        title="Klik untuk menutup"
        role="status"
        aria-live="polite"
      >
        {message}
      </div>
    </ToastContext.Provider>
  );
}
