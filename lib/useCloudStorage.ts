"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import type { ApiResponse } from "@/types";

/**
 * useCloudStorage
 *
 * Hook mirip useState, tapi state-nya disinkronkan ke /api/user-data
 * (Vercel KV), di-key oleh email akun Google yang sedang login.
 *
 * FIX BUG UTAMA (data hilang setelah logout -> login lagi dengan akun sama):
 * Sebelumnya hook ini nge-PUT `state` ke server di SETIAP render, termasuk
 * saat komponen baru mount dengan `state` masih berupa initial value ([])
 * sebelum sempat fetch data yang benar dari server — PUT itu menimpa data
 * valid di KV dengan array/objek kosong.
 *
 * Fix-nya, effect sync (PUT) sekarang HANYA jalan kalau ketiganya benar:
 *   1. `email` ada (user sedang login — dari useAuth() yang asli, BUKAN
 *      hook session terpisah yang bisa telat update saat logout).
 *   2. `isInitialized` true (fetch awal dari server sudah selesai).
 *   3. `skipSyncRef.current` false (perubahan state ini berasal dari aksi
 *      eksplisit user lewat setter yang dikembalikan hook ini — bukan dari
 *      proses load/reset internal).
 * Saat logout (`email` jadi null), hook reset state lokal ke `initial`
 * TANPA pernah memicu PUT.
 *
 * @param key    nama field di payload /api/user-data (history/domains/envVars/settingsTokens)
 * @param initial nilai default sebelum data ke-load / saat logout
 * @param legacyLocalStorageKey key localStorage lama untuk migrasi satu kali
 *                              (mis. "depush-history"). Opsional.
 */
export function useCloudStorage<T>(
  key: string,
  initial: T,
  legacyLocalStorageKey?: string
) {
  const { user, ready: sessionReady } = useAuth();
  const email = user?.email ?? null;

  const [state, setState] = useState<T>(initial);
  const [isInitialized, setIsInitialized] = useState(false);

  // true = perubahan `state` berikutnya JANGAN di-PUT ke server. Dipakai
  // saat KITA yang set state dari hasil fetch/migrasi/reset — bukan dari
  // aksi eksplisit user.
  const skipSyncRef = useRef(true);
  const emailRef = useRef<string | null>(null);

  // --- 1. LOAD: fetch dari server, guard ketat terhadap status login ---
  useEffect(() => {
    // Session masih resolve (GET /api/auth/session belum selesai) -> jangan
    // sentuh state dulu supaya tidak "kedip" kosong sesaat.
    if (!sessionReady) return;

    // GUARD UTAMA: tidak ada session (baru logout / belum pernah login).
    // Reset state lokal ke initial TAPI matikan sync, supaya reset ini
    // tidak ikut ter-PUT ke server dan menghapus data yang tersimpan.
    if (!email) {
      skipSyncRef.current = true;
      setState(initial);
      setIsInitialized(false);
      emailRef.current = null;
      return;
    }

    // Sudah pernah load untuk email yang sama -> tidak perlu fetch ulang.
    if (emailRef.current === email && isInitialized) return;
    emailRef.current = email;

    let cancelled = false;
    skipSyncRef.current = true; // matikan sync selama proses load berjalan

    (async () => {
      try {
        const res = await fetch("/api/user-data", { credentials: "include" });
        const body = (await res.json().catch(() => null)) as ApiResponse<
          Record<string, unknown>
        > | null;

        if (!res.ok || !body || body.ok !== true) {
          const message =
            body && body.ok === false ? body.error : `Gagal memuat data (${res.status})`;
          throw new Error(message);
        }
        if (cancelled) return;

        const serverValue = body.data[key];

        if (isNonEmpty(serverValue)) {
          setState(serverValue as T);
          return;
        }

        // Data server kosong -> coba migrasi SEKALI dari localStorage lama.
        // Migrasi hanya dianggap valid kalau server memang belum punya
        // data, dan hasilnya langsung di-PUT eksplisit di sini — bukan
        // lewat effect sync generik di bawah.
        const legacyKey = legacyLocalStorageKey ?? `depush-${key}`;
        const legacy = window.localStorage.getItem(legacyKey);

        if (legacy) {
          try {
            const parsed = JSON.parse(legacy);
            if (isNonEmpty(parsed)) {
              setState(parsed as T);
              await fetch("/api/user-data", {
                method: "PUT",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [key]: parsed }),
              });
              window.localStorage.removeItem(legacyKey);
              return;
            }
          } catch (parseErr) {
            console.error(
              `useCloudStorage[${key}] gagal parse localStorage legacy:`,
              parseErr
            );
          }
        }

        setState(isNonEmpty(serverValue) ? (serverValue as T) : initial);
      } catch (err) {
        console.error(`useCloudStorage[${key}] load error:`, err);
        // Gagal load -> JANGAN kosongkan state yang mungkin sudah ada di UI,
        // dan JANGAN tandai initialized, supaya effect sync di bawah tidak
        // ter-trigger PUT dengan data yang belum tentu benar.
        return;
      } finally {
        if (!cancelled) {
          setIsInitialized(true);
          // Kasih jeda 1 microtask sebelum sync diaktifkan, supaya setState
          // di atas (hasil load/migrasi) tidak dianggap "perubahan dari
          // user" oleh effect sync di bawah.
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
  }, [email, sessionReady, key, legacyLocalStorageKey]);

  // --- 2. SYNC: PUT ke server HANYA kalau semua syarat terpenuhi ---
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
  // Ini yang membedakan "perubahan dari user" (wajib sync) vs "perubahan
  // dari load/reset internal" (tidak boleh sync) di effect #1.
  const setStateAndSync = useCallback((updater: T | ((prev: T) => T)) => {
    skipSyncRef.current = false; // tandai: perubahan ini WAJIB di-sync
    setState(updater);
  }, []);

  return [state, setStateAndSync, isInitialized] as const;
}

/** Array non-kosong ATAU objek non-kosong ATAU primitif yang ada isinya. */
function isNonEmpty(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return value !== undefined && value !== null && value !== "";
}
