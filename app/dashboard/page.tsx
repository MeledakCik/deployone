
"use client";

import * as React from "react";
import { BarChart3, Bell, CalendarDays, ChevronRight, LayoutDashboard, LineChart, Menu, Search, Sparkles, Users, Zap } from "lucide-react";
import { ProfessionalKpiChart } from "@/components/dashboard/ProfessionalKpiChart";

const STATS = [
  { label: "MRR", value: "$128.4k", delta: "+12.4%", tone: "from-indigo-500 to-violet-500" },
  { label: "Active users", value: "8,294", delta: "+8.1%", tone: "from-cyan-500 to-sky-500" },
  { label: "Conversion", value: "4.82%", delta: "+1.2%", tone: "from-emerald-500 to-teal-500" },
  { label: "Latency", value: "142ms", delta: "-18ms", tone: "from-amber-500 to-orange-500" },
];

const TASKS = [
  "Review deployment health",
  "Approve pending domain mapping",
  "Check analytics anomalies",
  "Follow up onboarding users",
];

export default function DashboardPage() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eef2ff,transparent_35%),linear-gradient(180deg,#f8fafc,white)] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-5 p-4 md:p-6">
        <aside className={`fixed inset-y-4 left-4 z-20 w-72 rounded-[28px] bg-slate-950 text-white shadow-2xl transition-transform duration-300 md:static md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-[110%] md:translate-x-0"}`}>
          <div className="flex h-full flex-col p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10"><LayoutDashboard size={20} /></div>
              <div>
                <div className="text-lg font-semibold">DeployOne</div>
                <div className="text-xs text-white/60">Professional KPI Suite</div>
              </div>
            </div>
            <div className="mt-8 space-y-2 text-sm">
              {["Dashboard","Analytics","Projects","Messages","Settings"].map((i, idx)=>(
                <button key={i} className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition-all duration-300 hover:bg-white/10 ${idx===0?"bg-white/10":"bg-transparent"}`}>
                  <span className="flex items-center gap-3"><Sparkles size={16}/> {i}</span><ChevronRight size={16} className="text-white/40"/>
                </button>
              ))}
            </div>
            <div className="mt-auto rounded-3xl bg-white/10 p-4">
              <div className="flex items-center gap-3"><Users size={18}/> Team collaboration</div>
              <div className="mt-2 text-xs text-white/60">Fluid interactions, micro-animated states, and KPI focus.</div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="glass-panel sticky top-4 z-10 flex items-center gap-3 rounded-[28px] px-4 py-3 backdrop-blur-xl">
            <button onClick={()=>setMobileOpen(v=>!v)} className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-900 text-white md:hidden"><Menu size={18}/></button>
            <div className="flex flex-1 items-center gap-3 rounded-2xl bg-slate-100 px-4 py-3">
              <Search size={16} className="text-slate-400" />
              <input className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="Search KPI, project, task..." />
            </div>
            <button className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 transition-transform duration-300 hover:scale-105"><Bell size={16}/></button>
            <div className="h-11 w-11 rounded-2xl bg-[url('https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80')] bg-cover bg-center" />
          </header>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
            <div className="space-y-6">
              <div className="glass-panel rounded-[32px] p-6 md:p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-semibold tracking-[-0.04em] md:text-5xl">Dashboard</h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-500">Tampilan baru yang terasa seperti OS: elegan, halus, dan fokus pada metrik bisnis utama.</p>
                  </div>
                  <div className="hidden rounded-3xl bg-slate-900 px-4 py-3 text-white md:flex md:items-center md:gap-3">
                    <Zap size={16}/> Live status
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {STATS.map((s)=>(
                    <div key={s.label} className="group rounded-[28px] bg-white p-5 shadow-[0_10px_40px_rgba(15,23,42,.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(15,23,42,.10)]">
                      <div className={`h-1.5 w-20 rounded-full bg-gradient-to-r ${s.tone}`} />
                      <div className="mt-4 text-sm text-slate-500">{s.label}</div>
                      <div className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{s.value}</div>
                      <div className="mt-2 text-sm text-emerald-600">{s.delta}</div>
                    </div>
                  ))}
                </div>
              </div>

              <ProfessionalKpiChart />

              <div className="glass-panel rounded-[32px] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Today’s focus</h2>
                    <p className="text-sm text-slate-500">Task list with crisp hover states and subtle motion.</p>
                  </div>
                  <div className="text-sm text-slate-500 flex items-center gap-2"><CalendarDays size={16}/> Updated just now</div>
                </div>
                <div className="mt-5 space-y-3">
                  {TASKS.map((t, i)=>(
                    <div key={t} className="flex items-center justify-between rounded-3xl bg-slate-50 px-4 py-4 transition-all duration-300 hover:bg-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-900 text-white">{i+1}</div>
                        <div>
                          <div className="font-medium">{t}</div>
                          <div className="text-xs text-slate-500">Professional microinteraction enabled</div>
                        </div>
                      </div>
                      <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,.12)]" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className="space-y-6">
              <div className="glass-panel rounded-[32px] p-6">
                <h2 className="text-xl font-semibold">Revenue pulse</h2>
                <div className="mt-4 rounded-[28px] bg-slate-950 p-5 text-white">
                  <div className="text-sm text-white/60">This week</div>
                  <div className="mt-2 text-4xl font-semibold tracking-[-0.05em]">$128.4k</div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-emerald-300"><LineChart size={16}/> +12.4% from last week</div>
                </div>
              </div>

              <div className="glass-panel rounded-[32px] p-6">
                <h2 className="text-xl font-semibold">Team snapshot</h2>
                <div className="mt-4 space-y-4">
                  {["Alya","Rizky","Mira","Dimas"].map((name)=>(
                    <div key={name} className="flex items-center justify-between rounded-3xl bg-white p-3 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-100" />
                        <div>
                          <div className="font-medium">{name}</div>
                          <div className="text-xs text-slate-500">On track</div>
                        </div>
                      </div>
                      <div className="text-sm text-slate-500">98%</div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </section>
        </main>
      </div>
    </div>
  );
}
