import {
  Zap,
  Globe,
  KeyRound,
  History,
  Activity,
  Layers,
  ShieldCheck,
  GitPullRequest,
  Gauge,
} from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";

const FEATURES = [
  {
    icon: Zap,
    title: "1-Click Deploy",
    desc: "Import repo GitHub dan deploy ke edge network cuma dengan satu klik, tanpa config ribet.",
  },
  {
    icon: Globe,
    title: "Custom Domain & DNS Check",
    desc: "Tambah domain sendiri lengkap dengan pengecekan status DNS secara realtime.",
  },
  {
    icon: KeyRound,
    title: "Env Vault / Secret Manager",
    desc: "Simpan environment variable dan token secara terenkripsi, terpisah per project.",
  },
  {
    icon: History,
    title: "Smart History",
    desc: "Riwayat deploy tersimpan otomatis, maksimal 10 entri terbaru dengan counter yang selalu akurat.",
  },
  {
    icon: Activity,
    title: "Realtime Status",
    desc: "Status Ready, Building, atau Failed lengkap dengan dot glow yang mudah dipantau sekilas.",
  },
  {
    icon: Layers,
    title: "Multi Platform",
    desc: "Satu dashboard untuk Vercel dan Cloudflare Pages, tanpa perlu buka dua tab berbeda.",
  },
  {
    icon: ShieldCheck,
    title: "Secure by Default",
    desc: "Token platform dan GitHub disimpan aman, tidak pernah dikirim ke pihak ketiga.",
  },
  {
    icon: GitPullRequest,
    title: "Preview per Branch",
    desc: "Setiap push ke branch baru otomatis dapat preview URL sendiri untuk review cepat.",
  },
  {
    icon: Gauge,
    title: "Build Insight",
    desc: "Lihat durasi build, ukuran output, dan log lengkap tanpa keluar dari dashboard.",
  },
];

export function FeaturesGrid() {
  return (
    <section id="features" className="px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-xl mb-14">
          <p className="text-[13px] font-medium text-violet-400 mb-3">Features</p>
          <h2 className="text-[32px] sm:text-[40px] font-semibold tracking-tight leading-[1.1]">
            Semua yang kamu butuhkan untuk deploy, dalam satu tempat.
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <GlassPanel
              key={feature.title}
              className="p-6 transition hover:-translate-y-1"
            >
              <span className="stat-icon mb-4 text-violet-400">
                <feature.icon size={20} />
              </span>
              <h3 className="text-[15px] font-semibold mb-1.5">{feature.title}</h3>
              <p className="text-[13px] leading-relaxed text-text-muted">{feature.desc}</p>
            </GlassPanel>
          ))}
        </div>
      </div>
    </section>
  );
}
