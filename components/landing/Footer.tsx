export function Footer() {
  return (
    <footer id="docs" style={{ borderTop: "1px solid var(--line)" }}>
      <div className="mx-auto max-w-[1200px] px-6 h-[72px] flex flex-col sm:flex-row items-center justify-between gap-3 text-[13px]">
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-[0_0_0_1px_rgba(15,23,42,0.08)]">
            <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />
          </div>
          <span className="font-semibold text-[var(--text)]">Depush</span>
          <span className="text-[var(--text-faint)]">© {new Date().getFullYear()} Depush, Inc.</span>
        </div>

        <div className="flex items-center gap-6 text-[var(--text-faint)]">
          <a href="#docs" className="hover:text-[var(--text)] transition">
            Docs
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--text)] transition"
          >
            GitHub
          </a>
          <a
            href="https://saweria.co"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--text)] transition"
          >
            Saweria Donasi
          </a>
        </div>
      </div>
    </footer>
  );
}
