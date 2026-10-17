"use client";

import * as React from "react";
import { CheckCircle2, XCircle } from "@/components/ui/icons";
import { adminFetch, useAdminData } from "./api";
import { Btn, Card, ErrorBox, Loading, PageHead, SelectField, Toggle } from "./ui";

interface Settings {
  signupOpen: boolean;
  sitesEnabled: boolean;
  tunnelEnabled: boolean;
  announcement: { active: boolean; text: string; level: "info" | "warn" | "critical" };
}
interface Data {
  settings: Settings;
  system: {
    admins: string[];
    baseDomain: string | null;
    siteLimits: { maxMb: number; perUser: number };
    redis: { ok: boolean; keys: number | null };
    supabase: { ok: boolean };
    env: { name: string; label: string; ok: boolean }[];
  };
}

export function SettingsTab({ toast }: { toast: (m: string) => void }) {
  const { data, error, reload } = useAdminData<Data>("/api/admin/settings");
  const [s, setS] = React.useState<Settings | null>(null);
  const [saving, setSaving] = React.useState<string | null>(null);
  const [testing, setTesting] = React.useState(false);

  React.useEffect(() => {
    if (data) setS(data.settings);
  }, [data]);

  async function save(patch: Partial<Settings>, key: string, okMsg = "Pengaturan disimpan.") {
    setSaving(key);
    try {
      const r = await adminFetch<{ settings: Settings }>("/api/admin/settings", { method: "PUT", body: patch });
      setS(r.settings);
      toast(okMsg);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setSaving(null);
    }
  }

  async function testNotify() {
    setTesting(true);
    try {
      const r = await adminFetch<{ telegram: { ok: boolean; note: string }; webhook: boolean }>("/api/admin/settings", { method: "POST", body: { action: "test_notify" } });
      toast(`Telegram: ${r.telegram.note}${r.webhook ? " · Webhook: terkirim." : ""}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Tes gagal.");
    } finally {
      setTesting(false);
    }
  }

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data || !s) return <Loading />;

  const rows: { key: "signupOpen" | "sitesEnabled" | "tunnelEnabled"; title: string; desc: string }[] = [
    { key: "signupOpen", title: "Pendaftaran akun baru", desc: "Matikan untuk menutup pendaftaran. Pengguna yang sudah memiliki akun tetap bisa login." },
    { key: "sitesEnabled", title: "Link Instan (hosting statis)", desc: "Matikan untuk menghentikan upload situs baru, mis. saat ada gelombang phishing atau Redis hampir penuh." },
    { key: "tunnelEnabled", title: "Link Gaib (tunnel CLI)", desc: "Matikan untuk menolak pembuatan tunnel baru. Tunnel yang sudah berjalan sampai kedaluwarsa." },
  ];
  const ann = s.announcement;

  return (
    <div className="space-y-5">
      <PageHead title="Pengaturan" desc="Perubahan langsung berlaku (maks. ±15 detik di semua server)." />

      <Card title="Saklar layanan">
        <ul>
          {rows.map((r) => (
            <li key={r.key} className="flex items-center justify-between gap-4 border-b border-[var(--surface-line)] px-6 py-4 last:border-0">
              <div className="min-w-0">
                <p className="text-[14px] font-medium">{r.title}</p>
                <p className="text-[12.5px] text-text-muted">{r.desc}</p>
              </div>
              <Toggle checked={s[r.key]} label={r.title} disabled={saving === r.key} onChange={(v) => void save({ [r.key]: v } as Partial<Settings>, r.key)} />
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Banner pengumuman di dashboard">
        <div className="space-y-3 p-6">
          <textarea
            value={ann.text}
            onChange={(e) => setS({ ...s, announcement: { ...ann, text: e.target.value.slice(0, 300) } })}
            rows={2}
            maxLength={300}
            aria-label="Teks pengumuman"
            placeholder="Mis. Maintenance Link Instan malam ini pukul 23.00 WIB."
            className="input-solid w-full resize-none px-4 py-2.5 text-[13px]"
          />
          <div className="flex flex-wrap items-center gap-3">
            <SelectField
              value={ann.level}
              onValueChange={(v) => setS({ ...s, announcement: { ...ann, level: v as Settings["announcement"]["level"] } })}
              label="Tingkat pengumuman"
              options={[
                { value: "info", label: "Info" },
                { value: "warn", label: "Peringatan" },
                { value: "critical", label: "Penting" },
              ]}
            />
            <label className="flex items-center gap-2 text-[13px]">
              <Toggle checked={ann.active} label="Tampilkan pengumuman" onChange={(v) => setS({ ...s, announcement: { ...ann, active: v } })} /> Tampilkan ke pengguna
            </label>
            <Btn variant="primary" className="ml-auto" busy={saving === "ann"} onClick={() => void save({ announcement: ann }, "ann", "Pengumuman disimpan.")}>
              Simpan pengumuman
            </Btn>
          </div>
          <span className="text-[12px] text-text-muted">{ann.text.length}/300 karakter</span>
        </div>
      </Card>

      <Card
        title="Status sistem"
        action={
          <Btn onClick={() => void testNotify()} busy={testing}>
            Tes notifikasi
          </Btn>
        }
      >
        <ul className="grid gap-x-6 sm:grid-cols-2">
          <StatusRow ok={data.system.redis.ok} label="Redis (KV) terhubung" extra={data.system.redis.keys !== null ? `${data.system.redis.keys} key` : undefined} />
          {data.system.env.map((e) => (
            <StatusRow key={e.name} ok={e.ok} label={e.label} extra={e.ok ? undefined : `isi ${e.name}`} />
          ))}
        </ul>
        <div className="border-t border-[var(--surface-line)] px-6 py-4 text-[12.5px] text-text-muted">
          <p>
            Admin: <span className="text-text">{data.system.admins.join(", ")}</span>
          </p>
          <p className="mt-1">
            Domain link: <span className="text-text">{data.system.baseDomain ?? "mode path (/t/…)"}</span> · Batas situs: {data.system.siteLimits.maxMb} MB, {data.system.siteLimits.perUser} link per akun (ubah lewat env SITES_MAX_MB / SITES_MAX_PER_USER).
          </p>
        </div>
      </Card>
    </div>
  );
}

function StatusRow({ ok, label, extra }: { ok: boolean; label: string; extra?: string }) {
  return (
    <li className="flex items-center gap-2.5 px-6 py-2.5 text-[13px]">
      {ok ? <CheckCircle2 size={16} className="shrink-0 text-ok-fg" /> : <XCircle size={16} className="shrink-0 text-bad-fg" />}
      <span>{label}</span>
      <span className="ml-auto text-[12px] text-text-muted">{ok ? (extra ?? "OK") : (extra ?? "belum diatur")}</span>
    </li>
  );
}
