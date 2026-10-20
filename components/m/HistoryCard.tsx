"use client";
import * as React from "react";
import { Copy, Check, GitBranch } from "lucide-react";
import type { HistoryItem } from "@/types";
import { CARD, MiniButton, OpenLink, PLATFORM_LABEL, PlatformTile, StatusPill, hostOf, hrefOf, prettyDate, useCopy } from "./ui";

export function HistoryCard({ item }: { item: HistoryItem }) {
  const { copied, copy } = useCopy();
  const hasUrl = !!item.domain && item.status !== "deleted";
  return (
    <li className={`${CARD} p-4`}>
      <div className="flex items-start gap-3">
        <PlatformTile platform={item.platform} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[15px] font-bold tracking-[-0.01em]">{item.name}</p>
            <StatusPill status={item.status} />
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-[12px] text-[#64748B]">
            <span className="font-semibold">{PLATFORM_LABEL[item.platform] ?? item.platform}</span>
            <span>·</span>
            <span>{prettyDate(item.date)}</span>
          </p>
          {item.repo && (
            <p className="mt-1 flex items-center gap-1 truncate font-mono text-[11.5px] text-[#7B7487]">
              <GitBranch className="h-3 w-3 shrink-0" />
              <span className="truncate">{item.repo}</span>
            </p>
          )}
        </div>
      </div>
      {hasUrl && (
        <div className="mt-3 flex items-center gap-2">
          <MiniButton onClick={() => copy(item.id, hrefOf(item.domain))}>
            {copied === item.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied === item.id ? "Tersalin" : "Salin URL"}
          </MiniButton>
          <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-[#4A4455]">{hostOf(item.domain)}</span>
          <OpenLink domain={item.domain} />
        </div>
      )}
    </li>
  );
}
