"use client";

import * as React from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ChipLabel, chipCls } from "./shared";
import { FONT_ROLES, FONT_WEIGHTS, type FontRoleId, type FontWeightId } from "@/lib/ai-site-templates";

export interface RoleSetting {
  /** null = ikut jenis huruf bawaan Gaya desain yang aktif (atau Judul, untuk Sub-judul). */
  family: FontRoleId | null;
  /** null = ikut ketebalan bawaan Gaya desain yang aktif (atau Judul, untuk Sub-judul). */
  weight: FontWeightId | null;
}

function RoleBlock({
  label,
  hint,
  value,
  onFamily,
  onWeight,
  weightFollowLabel,
  canReset,
  onReset,
  resetLabel,
}: {
  label: string;
  hint?: string;
  value: RoleSetting;
  onFamily: (id: FontRoleId) => void;
  onWeight: (w: FontWeightId) => void;
  /** Teks placeholder dropdown ketebalan saat nilainya null (ikut bawaan). */
  weightFollowLabel: string;
  /** Tampilkan tautan reset hanya bila ada nilai yang sudah diubah. */
  canReset: boolean;
  onReset: () => void;
  resetLabel: string;
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1 basis-[12rem]">
          <span className="text-[13px] font-medium text-text-muted">{label}</span>
          {hint && <span className="ml-1.5 text-[12px] text-text-faint">{hint}</span>}
        </div>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          {canReset && (
            <button type="button" onClick={onReset} className="shrink-0 text-[13px] text-text-muted underline max-md:min-h-[40px]">
              {resetLabel}
            </button>
          )}
          <Select value={value.weight === null ? "" : String(value.weight)} onValueChange={(v) => onWeight(Number(v) as FontWeightId)}>
            <SelectTrigger aria-label={`${label} — ketebalan`} className="h-10 min-w-0 flex-1 sm:w-[176px] sm:flex-none">
              <SelectValue placeholder={weightFollowLabel} />
            </SelectTrigger>
            <SelectContent>
              {FONT_WEIGHTS.map((w) => (
                <SelectItem key={w.id} value={String(w.id)}>
                  <span style={{ fontWeight: w.id }}>{w.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div role="radiogroup" aria-label={`${label} — jenis huruf`} className="flex flex-wrap gap-1.5">
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
            <ChipLabel selected={value.family === r.id}>Aa</ChipLabel> <span className={`text-[12px] font-sans font-medium ${value.family === r.id ? "opacity-90" : "text-text-muted"}`}>{r.name}</span>
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
        canReset={title.weight !== null}
        onReset={onTitleWeightFollow}
        resetLabel="Ikut Gaya desain"
      />
      <RoleBlock
        label="Sub-judul"
        hint="Judul tiap bagian & judul kartu. Opsional."
        value={sub}
        onFamily={onSubFamily}
        onWeight={onSubWeight}
        weightFollowLabel="Ikut Judul"
        canReset={sub.family !== null || sub.weight !== null}
        onReset={() => {
          onSubFamilyFollow();
          onSubWeightFollow();
        }}
        resetLabel="Ikut Judul"
      />
      <RoleBlock
        label="Isi"
        hint="Paragraf & teks deskripsi."
        value={body}
        onFamily={onBodyFamily}
        onWeight={onBodyWeight}
        weightFollowLabel="Ikut Gaya desain"
        canReset={body.weight !== null}
        onReset={onBodyWeightFollow}
        resetLabel="Ikut Gaya desain"
      />
    </div>
  );
}
