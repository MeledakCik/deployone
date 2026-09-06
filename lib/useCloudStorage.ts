"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "./useSession"; // hook existing: { email, loading }

/**
 * useCloudStorage
 *
 * Hook seperti useState tapi sync ke /api/user-data.
 *
 * FIX BUG UTAMA (data hilang setelah logout -> login lagi):
 * - Effect PUT ke server SEKARANG hanya jalan kalau:
 *     1. ada email (sudah login)
 *     2. sudah selesai load awal dari server (isInitialized)
 *     3. perubahan state ini berasal dari aksi eksplisit user,
 *        bukan dari proses load/reset (skipSyncRef === false)
 * - Saat logout (email jadi null), hook langsung reset state lokal ke
 *   `initial` TANPA memicu PUT sama sekali.
 * - Ganti akun (email berubah) memicu fetch ulang dari server, bukan
 *   pakai state lama.
 */
export function useCloudStorage<T>(key: string, initial: T) {
  const { email, loading: sessionLoading } = useSession();

  const [state, setState] = useState<T>(initial);
  const [isInitialized, setIsInitialized] = useState(false);

  // true = perubahan state berikutnya JANGAN di-PUT ke server.
  // Dipakai saat kita sendiri yang set state dari hasil fetch/reset,
  // bukan dari aksi eksplisit user.
  const skipSyncRef = useRef(true);
  const emailRef = useRef<string | null>(null);

  // --- 1. LOAD: fetch dari server, guard ketat terhadap status login ---
  useEffect(() => {
    // Session masih resolve -> jangan lakukan apa-apa dulu, jangan
    // sentuh state supaya tidak "kedip" kosong sesaat.
    if (sessionLoading) return;

    // GUARD UTAMA: tidak ada session (baru logout / belum pernah login).
    // Reset state lokal ke initial TAPI matikan sync supaya reset ini
    // tidak ikut ter-PUT ke server dan menghapus data yang tersimpan.
    if (!email) {
      skipSyncRef.current = true;
      setState(initial);
      setIsInitialized(false);
      emailRef.current = null;
      return;
    }

    // Sudah pernah load untuk email yang sama -> tidak perlu fetch lagi.
    if (emailRef.current === email && isInitialized) return;
    emailRef.current = email;

    let cancelled = false;
    skipSyncRef.current = true; // matikan sync selama proses load berjalan

    (async () => {
      try {
        const res = await fetch("/api/user-data", { credentials: "include" });
        if (!res.ok) throw new Error(`fetch user-data failed: ${res.status}`);
        const data = await res.json();
        if (cancelled) return;

        if (Array.isArray(data?.[key]) && data[key].length > 0) {
          setState(data[key]);
        } else {
          // Data server kosong -> coba migrasi SEKALI dari localStorage lama
          // (depush-history / depush-domains / depush-env). Migrasi hanya
          // dianggap valid kalau server memang belum punya data, dan
          // hasilnya langsung di-PUT secara eksplisit di sini — bukan lewat
          // effect sync generik di bawah.
          const legacy = localStorage.getItem(`depush-${key}`);
          let migrated = false;

          if (legacy) {
            try {
              const parsed = JSON.parse(legacy);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setState(parsed);
                await fetch("/api/user-data", {
                  method: "PUT",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ [key]: parsed }),
                });
                localStorage.removeItem(`depush-${key}`);
                migrated = true;
              }
            } catch (parseErr) {
              console.error(
                `useCloudStorage[${key}] gagal parse localStorage legacy:`,
                parseErr
              );
            }
          }

          if (!migrated) {
            setState(Array.isArray(data?.[key]) ? data[key] : initial);
          }
        }
      } catch (err) {
        console.error(`useCloudStorage[${key}] load error:`, err);
        // Gagal load -> JANGAN kosongkan state yang mungkin sudah ada di UI,
        // dan JANGAN tandai initialized supaya auto-PUT tidak ter-trigger
        // dengan data yang belum tentu benar.
        return;
      } finally {
        if (!cancelled) {
          setIsInitialized(true);
          // Beri jeda 1 microtask sebelum sync diaktifkan, supaya setState
          // di atas (hasil load/migrasi) tidak dianggap "perubahan dari user"
          // oleh effect sync di bawah.
          queueMicrotask(() => {
            if (!cancelled) skipSyncRef.current = false;
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, sessionLoading, key]);

  // --- 2. SYNC: PUT ke server hanya kalau semua syarat terpenuhi ---
  useEffect(() => {
    if (!email) return; // tidak login -> jangan pernah PUT
    if (!isInitialized) return; // load awal belum selesai -> jangan PUT
    if (skipSyncRef.current) return; // perubahan bukan dari aksi user -> skip

    const controller = new AbortController();

    fetch("/api/user-data", {
      method: "PUT",
      credentials: "include",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: state }),
    }).catch((err) => {
      if (err?.name !== "AbortError") {
        console.error(`useCloudStorage[${key}] sync error:`, err);
      }
    });

    return () => controller.abort();
  }, [state, email, isInitialized, key]);

  // --- 3. Setter untuk aksi eksplisit user (addHistory, addDomain, dll) ---
  // Ini yang membedakan "perubahan dari user" (harus sync) vs
  // "perubahan dari load/reset internal" (tidak boleh sync).
  const setStateAndSync = useCallback((updater: T | ((prev: T) => T)) => {
    skipSyncRef.current = false; // tandai: perubahan ini WAJIB di-sync
    setState(updater);
  }, []);

  return [state, setStateAndSync] as const;
}
