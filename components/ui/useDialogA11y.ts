"use client";

import * as React from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Perilaku dasar dialog yang benar untuk semua modal:
 * - Esc menutup (bisa dimatikan lewat `closeOnEscape: false`, mis. saat deploy berjalan)
 * - Tab / Shift+Tab berputar di dalam dialog (focus trap)
 * - fokus pindah ke dalam dialog saat dibuka, dan dikembalikan ke tombol pemicu saat ditutup
 * - scroll halaman di belakang dikunci selama dialog terbuka
 *
 * Pasang `ref` di elemen dialog dan beri `tabIndex={-1}`, `role="dialog"`, `aria-modal`.
 */
export function useDialogA11y<T extends HTMLElement>(
  open: boolean,
  onClose: () => void,
  options: { closeOnEscape?: boolean } = {}
) {
  const ref = React.useRef<T>(null);
  const onCloseRef = React.useRef(onClose);
  const escapeRef = React.useRef(options.closeOnEscape ?? true);
  onCloseRef.current = onClose;
  escapeRef.current = options.closeOnEscape ?? true;

  React.useEffect(() => {
    if (!open) return;

    const node = ref.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // autoFocus milik input di dalam dialog tetap dihormati.
    if (node && !node.contains(document.activeElement)) {
      (node.querySelector<HTMLElement>(FOCUSABLE) ?? node).focus();
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (escapeRef.current) {
          e.stopPropagation();
          onCloseRef.current();
        }
        return;
      }
      if (e.key !== "Tab" || !node) return;

      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );
      if (items.length === 0) {
        e.preventDefault();
        node.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !node.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !node.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  return ref;
}
