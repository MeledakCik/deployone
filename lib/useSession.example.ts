"use client";
import { useEffect, useState } from "react";

/**
 * CONTOH useSession untuk mendukung useCloudStorage.ts.
 * Kalau kamu sudah punya hook/context session sendiri, cukup pastikan
 * hook itu expose { email, loading } dengan perilaku berikut:
 *
 * - loading = true selama proses hydrate awal (GET /api/auth/session).
 * - email = null kalau tidak ada session valid ATAU segera setelah
 *   logout berhasil (JANGAN nunggu refetch untuk set null).
 * - email harus lowercase+trim, konsisten dengan userKey() di store.ts.
 */
export function useSession() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/session", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        setEmail(data?.email ? data.email.trim().toLowerCase() : null);
      })
      .catch(() => {
        if (!cancelled) setEmail(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { email, loading };
}

/**
 * Panggil ini dari tombol/aksi logout di UI SEBELUM atau SESAAT SETELAH
 * memanggil POST /api/auth/logout, supaya email langsung jadi null tanpa
 * menunggu refetch — ini yang memastikan useCloudStorage langsung
 * berhenti sync begitu user klik logout.
 *
 * Contoh pemakaian di komponen:
 *
 *   await fetch("/api/auth/logout", { method: "POST" });
 *   // lalu trigger context/hook session kamu untuk set email -> null,
 *   // atau reload halaman / redirect ke halaman login.
 */
