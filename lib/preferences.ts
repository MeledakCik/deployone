"use client";

import * as React from "react";

/**
 * Preferensi tampilan per-perangkat (disimpan di localStorage).
 * - deployAnimation: animasi saat loading deploy ("default" = spinner lama, "spider" = spider crawler AI)
 * - showDebug: tampilkan log proses debug saat deploy
 *
 * Tema dark/light tetap dikelola next-themes (lihat theme-provider.tsx).
 */
export type DeployAnimation = "default" | "spider";

export interface DeployPreferences {
  deployAnimation: DeployAnimation;
  showDebug: boolean;
}

const STORAGE_KEY = "depup-deploy-prefs";
const EVENT_NAME = "depup-deploy-prefs-change";

export const DEFAULT_DEPLOY_PREFS: DeployPreferences = {
  deployAnimation: "default",
  showDebug: false,
};

function sanitize(raw: unknown): DeployPreferences {
  const o = (raw && typeof raw === "object" ? raw : {}) as Partial<DeployPreferences>;
  return {
    deployAnimation: o.deployAnimation === "spider" ? "spider" : "default",
    showDebug: o.showDebug === true,
  };
}

let cached: DeployPreferences = DEFAULT_DEPLOY_PREFS;
let cachedRaw: string | null = null;

function readSnapshot(): DeployPreferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    // Kembalikan referensi yang sama selama isi storage tidak berubah (syarat useSyncExternalStore).
    if (raw === cachedRaw) return cached;
    cachedRaw = raw;
    cached = raw ? sanitize(JSON.parse(raw)) : DEFAULT_DEPLOY_PREFS;
  } catch {
    cached = DEFAULT_DEPLOY_PREFS;
  }
  return cached;
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT_NAME, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT_NAME, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useDeployPreferences() {
  const prefs = React.useSyncExternalStore(
    subscribe,
    readSnapshot,
    () => DEFAULT_DEPLOY_PREFS
  );

  const update = React.useCallback((patch: Partial<DeployPreferences>) => {
    const next = sanitize({ ...readSnapshot(), ...patch });
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // quota/private mode: abaikan, preferensi berlaku sampai halaman ditutup
      cached = next;
      cachedRaw = null;
    }
    window.dispatchEvent(new Event(EVENT_NAME));
  }, []);

  return [prefs, update] as const;
}
