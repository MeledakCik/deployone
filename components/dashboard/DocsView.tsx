import { HelpCircle, ArrowUpRight } from "lucide-react";
import { ViewFade } from "@/components/ui/ViewFade";

const DOCS = [
  {
    title: "Cara mendapatkan Vercel Token",
    desc: "Buat token akses personal dari dashboard Vercel untuk dipakai saat deploy dari DeployOne.",
    href: "https://vercel.com/account/tokens",
  },
  {
    title: "Membuat GitHub PAT",
    desc: "Generate Personal Access Token GitHub dengan scope repo agar DeployOne bisa menarik source code kamu.",
    href: "https://github.com/settings/tokens",
  },
  {
    title: "Panduan Custom Domain CNAME",
    desc: "Langkah-langkah mengarahkan DNS CNAME domain kamu ke project yang sudah di-deploy.",
    href: "#",
  },
];

export function DocsView() {
  return (
    <ViewFade>
      <div className="space-y-6">
        <div>
          <h2 className="text-[22px] font-semibold">Docs</h2>
          <p className="text-[13px] text-text-muted">Panduan singkat untuk setup deployment kamu.</p>
        </div>

        <div className="space-y-3">
          {DOCS.map((doc) => (
            <a
              key={doc.title}
              href={doc.href}
              target="_blank"
              rel="noopener noreferrer"
              className="docs-item-glass flex items-start gap-4 p-5"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-violet-400">
                <HelpCircle size={28} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="flex items-center gap-1.5 text-[14px] font-semibold">
                  {doc.title}
                  <ArrowUpRight size={14} className="text-text-faint" />
                </h3>
                <p className="mt-1 text-[13px] leading-relaxed text-text-muted">{doc.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </ViewFade>
  );
}
