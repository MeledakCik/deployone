import Link from "next/link";
import { Rocket } from "lucide-react";

export function Footer() {
  return (
    <footer id="docs" className="px-4 py-12 border-t border-[var(--line)]">
      <div className="mx-auto max-w-6xl flex flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-white">
            <Rocket size={14} />
          </span>
          <span className="text-[13px] font-semibold">DeployOne</span>
          <span className="text-[12px] text-text-faint">© {new Date().getFullYear()}</span>
        </div>
        <div className="flex items-center gap-6 text-[13px] text-text-muted">
          <a href="#docs" className="hover:text-text">Docs</a>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-text">
            GitHub
          </a>
          <a href="https://saweria.co" target="_blank" rel="noopener noreferrer" className="hover:text-text">
            Saweria Donasi
          </a>
        </div>
      </div>
    </footer>
  );
}
