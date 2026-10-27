"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ImagePlus, X } from "lucide-react";
import { Btn } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { formatBytes, IMAGE_ACCEPT, MAX_PRELOAD_BYTES } from "@/lib/ai-site-images";
import type { PhotoDraft } from "@/lib/ai-site-photos";
import { hintCls } from "./shared";

const miniBtn =
  "grid h-8 w-8 place-items-center rounded-full bg-black/70 text-white hover:bg-black/85 disabled:opacity-40 disabled:hover:bg-black/70 max-sm:h-9 max-sm:w-9";

/** Foto yang disiapkan sebelum generate: dipasang berurutan ke artikel/produk setelah situs jadi. */
export function PhotoPool({
  photos,
  adding,
  usedCount,
  hasContent,
  onAdd,
  onRemove,
  onMove,
  onClear,
}: {
  photos: PhotoDraft[];
  adding: boolean;
  usedCount: number | null;
  hasContent: boolean;
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onClear: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [drag, setDrag] = React.useState(false);
  const bytes = photos.reduce((n, p) => n + p.file.size, 0);
  const pct = Math.min(100, (bytes / MAX_PRELOAD_BYTES) * 100);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        onAdd(Array.from<File>(e.dataTransfer.files));
      }}
      className={cn(
        "space-y-3 rounded-2xl border border-dashed p-3.5 transition",
        drag ? "border-[var(--accent)] bg-tone-lilac" : "border-[var(--line-strong)] bg-[var(--pill-bg)]",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Btn busy={adding} onClick={() => inputRef.current?.click()}>
          <ImagePlus size={13} /> {photos.length ? "Tambah foto" : "Pilih foto"}
        </Btn>
        {photos.length > 0 && (
          <Btn variant="ghost" onClick={onClear}>
            Hapus semua
          </Btn>
        )}
        <span className={`ml-auto tabular-nums ${hintCls}`}>
          {photos.length} foto · {formatBytes(bytes)} / {formatBytes(MAX_PRELOAD_BYTES)}
        </span>
      </div>

      {photos.length > 0 && (
        <>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-[var(--line)]"
            role="progressbar"
            aria-label="Ukuran foto terpakai"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pct)}
          >
            <div className="h-full rounded-full bg-[var(--accent)] transition-[width] motion-reduce:transition-none" style={{ width: `${pct}%` }} />
          </div>
          <ul className="grid grid-cols-3 gap-2 min-[480px]:grid-cols-4 sm:grid-cols-5">
            {photos.map((p, i) => (
              <li key={p.id} className="relative aspect-square overflow-hidden rounded-xl ring-1 ring-[var(--line)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt={`Foto ${i + 1}: ${p.file.name}`} className="h-full w-full object-cover" />
                <span className="absolute left-1 top-1 rounded-full bg-black/70 px-2 text-[12px] font-semibold leading-5 text-white" aria-hidden>
                  {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(p.id)}
                  aria-label={`Hapus foto ${i + 1}`}
                  className={cn(miniBtn, "absolute right-1 top-1")}
                >
                  <X size={14} />
                </button>
                <div className="absolute inset-x-1 bottom-1 flex justify-between">
                  <button
                    type="button"
                    onClick={() => onMove(p.id, -1)}
                    disabled={i === 0}
                    aria-label={`Geser foto ${i + 1} ke depan`}
                    className={miniBtn}
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMove(p.id, 1)}
                    disabled={i === photos.length - 1}
                    aria-label={`Geser foto ${i + 1} ke belakang`}
                    className={miniBtn}
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className={hintCls}>
        {photos.length === 0
          ? "Opsional. Seret foto ke sini atau pilih sekaligus banyak (PNG, JPG, WebP, GIF; total maks 10 MB). Tanpa foto pun bisa: tambahkan nanti di bagian 3. Gambar."
          : "Foto dipasang berurutan ke sampul artikel atau foto produk setelah websitenya jadi. Urutannya sesuai nomor di pojok foto; geser dengan tombol panah untuk menukar. Gambar juga bisa diganti nanti di bagian 3. Gambar."}
        {hasContent && usedCount !== null && photos.length > 0 && usedCount < photos.length && (
          <span className="mt-1 block font-medium text-text">
            {photos.length - usedCount} foto belum terpakai (tempatnya sudah penuh atau gagal diproses).
          </span>
        )}
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={IMAGE_ACCEPT}
        className="hidden"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const list = Array.from<File>(e.target.files ?? []);
          e.target.value = "";
          onAdd(list);
        }}
      />
    </div>
  );
}
