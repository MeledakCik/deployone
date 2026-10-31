"use client";

import * as React from "react";
import { chipCls } from "./shared";
import { FONT_ROLES, FONT_WEIGHTS, type FontRoleId, type FontWeightId } from "@/lib/ai-site-templates";

export interface RoleSetting {
  /** null = ikut jenis huruf bawaan Gaya desain yang aktif (atau Judul, untuk Sub-judul). */
  family: FontRoleId | null;
  /** null = ikut ketebalan bawaan Gaya desain yang aktif (atau Judul, untuk Sub-judul). */
  weight: FontWeightId | null;
}

function WeightRow({
  label,
  value,
  onPick,
  followLabel,
  onFollow,
}: {
  label: string;
  value: FontWeightId | null;
  onPick: (w: FontWeightId) => void;
  followLabel: string;
  onFollow: () => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      <button
        type="button"
        role="radio"
        aria-checked={value === null}
        onClick={onFollow}
        className={chipCls(value === null, true)}
      >
        {followLabel}
      </button>
      {FONT_WEIGHTS.map((w) => (
        <button
          key={w.id}
          type="button"
          role="radio"
          aria-checked={value === w.id}
          onClick={() => onPick(w.id)}
          style={{ fontWeight: w.id }}
          className={chipCls(value === w.id)}
        >
          {w.name}
        </button>
      ))}
    </div>
  );
}

function RoleBlock({
  label,
  hint,
  value,
  onFamily,
  onWeight,
  familyFollowLabel,
  onFamilyFollow,
  weightFollowLabel,
  onWeightFollow,
}: {
  label: string;
  hint?: string;
  value: RoleSetting;
  onFamily: (id: FontRoleId) => void;
  onWeight: (w: FontWeightId) => void;
  /** Bila terisi, tombol tambahan muncul untuk mengembalikan jenis huruf peran ini ke null. */
  familyFollowLabel?: string;
  onFamilyFollow?: () => void;
  weightFollowLabel: string;
  onWeightFollow: () => void;
}) {
  return (
    <div>
      <div className="mb-1.5">
        <span className="text-[12.5px] font-medium text-text-muted">{label}</span>
        {hint && <span className="ml-1.5 text-[12px] text-text-faint">{hint}</span>}
      </div>
      <div role="radiogroup" aria-label={`${label} — jenis huruf`} className="flex flex-wrap gap-1.5">
        {familyFollowLabel && onFamilyFollow && (
          <button
            type="button"
            role="radio"
            aria-checked={value.family === null}
            onClick={onFamilyFollow}
            className={chipCls(value.family === null, true)}
          >
            {familyFollowLabel}
          </button>
        )}
        {FONT_ROLES.map((r) => (
          <button
            key={r.id}
            type="button"
            role="radio"
            aria-checked={value.family === r.id}
            onClick={() => onFamily(r.id)}
            title={r.desc}
            style={{ fontFamily: r.stack }}
            className={chipCls(value.family === r.id)}
          >
            Aa <span className={`text-[12px] font-sans font-medium ${value.family === r.id ? "opacity-90" : "text-text-muted"}`}>{r.name}</span>
          </button>
        ))}
      </div>
      <div className="mt-1.5">
        <span className="mb-1 block text-[12px] text-text-faint">Ketebalan</span>
        <WeightRow label={`${label} — ketebalan`} value={value.weight} onPick={onWeight} followLabel={weightFollowLabel} onFollow={onWeightFollow} />
      </div>
    </div>
  );
}

export function FontRolePicker({
  title,
  sub,
  body,
  onTitleFamily,
  onTitleWeight,
  onTitleWeightFollow,
  onSubFamily,
  onSubFamilyFollow,
  onSubWeight,
  onSubWeightFollow,
  onBodyFamily,
  onBodyWeight,
  onBodyWeightFollow,
}: {
  title: RoleSetting;
  sub: RoleSetting;
  body: RoleSetting;
  onTitleFamily: (id: FontRoleId) => void;
  onTitleWeight: (w: FontWeightId) => void;
  /** Kembalikan ketebalan Judul ke null ("Ikut Gaya desain"). */
  onTitleWeightFollow: () => void;
  onSubFamily: (id: FontRoleId) => void;
  /** Kembalikan jenis huruf Sub-judul ke null ("Ikut Judul"). */
  onSubFamilyFollow: () => void;
  onSubWeight: (w: FontWeightId) => void;
  /** Kembalikan ketebalan Sub-judul ke null ("Ikut Judul"). */
  onSubWeightFollow: () => void;
  onBodyFamily: (id: FontRoleId) => void;
  onBodyWeight: (w: FontWeightId) => void;
  /** Kembalikan ketebalan Isi ke null ("Ikut Gaya desain"). */
  onBodyWeightFollow: () => void;
}) {
  return (
    <div className="space-y-5">
      <RoleBlock
        label="Judul"
        hint="Judul besar di bagian atas halaman."
        value={title}
        onFamily={onTitleFamily}
        onWeight={onTitleWeight}
        weightFollowLabel="Ikut Gaya desain"
        onWeightFollow={onTitleWeightFollow}
      />
      <RoleBlock
        label="Sub-judul"
        hint="Judul tiap bagian & judul kartu. Opsional."
        value={sub}
        onFamily={onSubFamily}
        onWeight={onSubWeight}
        familyFollowLabel="Ikut Judul"
        onFamilyFollow={onSubFamilyFollow}
        weightFollowLabel="Ikut Judul"
        onWeightFollow={onSubWeightFollow}
      />
      <RoleBlock
        label="Isi"
        hint="Paragraf & teks deskripsi."
        value={body}
        onFamily={onBodyFamily}
        onWeight={onBodyWeight}
        weightFollowLabel="Ikut Gaya desain"
        onWeightFollow={onBodyWeightFollow}
      />
    </div>
  );
}
