"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FONT_ROLES, type FontRoleId } from "@/lib/ai-site-templates";

function RoleRow({
  label,
  hint,
  value,
  onPick,
  followLabel,
  onFollow,
}: {
  label: string;
  hint?: string;
  value: FontRoleId | null;
  onPick: (id: FontRoleId) => void;
  /** Bila terisi, tombol tambahan muncul untuk mengembalikan peran ini ke null ("ikut ..."). */
  followLabel?: string;
  onFollow?: () => void;
}) {
  return (
    <div>
      <div className="mb-1.5">
        <span className="text-[12.5px] font-medium text-text-muted">{label}</span>
        {hint && <span className="ml-1.5 text-[12px] text-text-faint">{hint}</span>}
      </div>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {followLabel && (
          <button
            type="button"
            role="radio"
            aria-checked={value === null}
            onClick={onFollow}
            className={cn(
              "min-h-[34px] rounded-full border px-3 text-[12.5px] font-medium transition",
              value === null ? "border-[var(--ring)] bg-tone-lilac" : "border-[var(--line)] bg-[var(--pill-bg)] text-text-muted hover:bg-[var(--card-hover)]",
            )}
          >
            {followLabel}
          </button>
        )}
        {FONT_ROLES.map((r) => (
          <button
            key={r.id}
            type="button"
            role="radio"
            aria-checked={value === r.id}
            onClick={() => onPick(r.id)}
            title={r.desc}
            style={{ fontFamily: r.stack }}
            className={cn(
              "min-h-[34px] rounded-full border px-3 text-[13.5px] transition",
              value === r.id ? "border-[var(--ring)] bg-tone-lilac" : "border-[var(--line)] bg-[var(--pill-bg)] hover:bg-[var(--card-hover)]",
            )}
          >
            Aa <span className="text-[11.5px] font-sans font-medium text-text-muted">{r.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function FontRolePicker({
  title,
  sub,
  body,
  onTitle,
  onSub,
  onSubFollow,
  onBody,
}: {
  /** null = ikut huruf bawaan Gaya desain yang aktif. */
  title: FontRoleId | null;
  /** null = ikut pilihan Judul (atau bawaan Gaya desain bila Judul juga belum diubah). */
  sub: FontRoleId | null;
  body: FontRoleId | null;
  onTitle: (id: FontRoleId) => void;
  onSub: (id: FontRoleId) => void;
  /** Kembalikan Sub-judul ke null ("Ikut Judul"). */
  onSubFollow: () => void;
  onBody: (id: FontRoleId) => void;
}) {
  return (
    <div className="space-y-4">
      <RoleRow label="Judul" hint="Judul besar di bagian atas halaman." value={title} onPick={onTitle} />
      <RoleRow
        label="Sub-judul"
        hint="Judul tiap bagian & judul kartu. Opsional."
        value={sub}
        onPick={onSub}
        followLabel="Ikut Judul"
        onFollow={onSubFollow}
      />
      <RoleRow label="Isi" hint="Paragraf & teks deskripsi." value={body} onPick={onBody} />
    </div>
  );
}
