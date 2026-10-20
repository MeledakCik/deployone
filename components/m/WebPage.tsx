"use client";
import * as React from "react";

/**
 * Membungkus tampilan dashboard web (yang sudah responsif) supaya tampil rapi di shell app.
 * Fungsinya 100% sama dengan web karena komponen & datanya memang yang itu juga.
 */
export function WebPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="m-web -mx-1 text-[var(--text)]">
      {/* Judul halaman sudah ada di top bar app — sembunyikan judul besar bawaan web. */}
      <style>{`.m-web .page-title{display:none}`}</style>
      {children}
    </div>
  );
}
