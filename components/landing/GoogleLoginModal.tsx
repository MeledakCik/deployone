"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import type { DummyUser } from "@/types";

const DUMMY_ACCOUNTS: DummyUser[] = [
  { name: "Ival", email: "ival@example.com", avatar: "IV", color: "violet" },
  { name: "Demo User", email: "demo@deploy.one", avatar: "D", color: "blue" },
];

export function GoogleLoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { login } = useAuth();
  const { showToast } = useToast();
  const [pending, setPending] = React.useState<string | null>(null);

  if (!open) return null;

  function handlePick(account: DummyUser) {
    setPending(account.email);
    setTimeout(() => {
      login(account);
      setPending(null);
      onClose();
      showToast(`Login berhasil — selamat datang ${account.name}`);
      router.push("/dashboard");
    }, 800);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <GlassPanel
        className="w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[17px] font-semibold">Pilih akun</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-[var(--card-hover)]"
          >
            <X size={16} />
          </button>
        </div>
        <p className="text-[13px] text-text-muted mb-5">
          untuk melanjutkan ke <span className="font-medium">DeployOne</span>
        </p>

        <div className="space-y-2">
          {DUMMY_ACCOUNTS.map((account) => {
            const isLoading = pending === account.email;
            return (
              <button
                key={account.email}
                type="button"
                disabled={pending !== null}
                onClick={() => handlePick(account)}
                className="pill flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-[var(--card-hover)] disabled:opacity-60"
              >
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-semibold text-white ${
                    account.color === "violet" ? "bg-violet-500" : "bg-blue-500"
                  }`}
                >
                  {account.avatar}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-medium truncate">{account.name}</span>
                  <span className="block text-[12px] text-text-muted truncate">{account.email}</span>
                </span>
                {isLoading && <Loader2 size={16} className="animate-spin text-text-muted" />}
              </button>
            );
          })}
        </div>

        <p className="mt-5 text-[11px] text-text-faint">
          Ini adalah simulasi login — tidak ada data akun asli yang digunakan.
        </p>
      </GlassPanel>
    </div>
  );
}
