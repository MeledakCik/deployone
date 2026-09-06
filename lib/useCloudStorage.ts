"use client";

import * as React from "react";

/**
 * Same shape as useLocalStorage ([value, setValue, ready]) but persists to
 * the signed-in Google account on the server (see app/api/user-data)
 * instead of the browser's localStorage. This is what makes deploy
 * history, domains, env vars, and settings tokens follow the user across
 * devices/browsers instead of being stuck on whichever one they used last.
 *
 * On first load per slice, if the server has nothing yet but the browser
 * still has an old localStorage copy (from before this change), that copy
 * is migrated up automatically and then cleared locally so it isn't a
 * dead end for existing users.
 */
export function useCloudStorage<T>(slice: string, initial: T, legacyLocalStorageKey?: string) {
  const [value, setValueState] = React.useState<T>(initial);
  const [ready, setReady] = React.useState(false);
  const loadedRef = React.useRef(false);

  React.useEffect(() => {
    let cancelled = false;
    loadedRef.current = false;

    (async () => {
      try {
        const res = await fetch(`/api/user-data?slice=${encodeURIComponent(slice)}`, {
          cache: "no-store",
        });
        const body = await res.json().catch(() => null);

        if (cancelled) return;

        if (body?.ok && body.data.value !== null && body.data.value !== undefined) {
          setValueState(body.data.value as T);
        } else if (legacyLocalStorageKey) {
          // Nothing saved server-side yet — check for a pre-migration local copy.
          try {
            const raw = window.localStorage.getItem(legacyLocalStorageKey);
            if (raw) {
              const parsed = JSON.parse(raw) as T;
              setValueState(parsed);
              window.localStorage.removeItem(legacyLocalStorageKey);
              void fetch("/api/user-data", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ slice, value: parsed }),
              });
            }
          } catch {
            // ignore malformed/legacy data
          }
        }
      } catch {
        // Offline or logged out — keep the in-memory default; nothing to migrate blindly.
      } finally {
        if (!cancelled) {
          loadedRef.current = true;
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slice]);

  const setValue = React.useCallback(
    (updater: React.SetStateAction<T>) => {
      setValueState((prev) => {
        const next = typeof updater === "function" ? (updater as (p: T) => T)(prev) : updater;
        if (loadedRef.current) {
          fetch("/api/user-data", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slice, value: next }),
          }).catch(() => {
            // Best-effort — a transient network error here shouldn't block the UI.
          });
        }
        return next;
      });
    },
    [slice]
  );

  return [value, setValue, ready] as const;
}
