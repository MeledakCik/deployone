"use client";

import * as React from "react";
import { addHistory, useUserData } from "@/lib/m-data";
import type { CreateDeployResult, DeployStatusResult } from "@/types";

type Api<T> = { ok: boolean; data?: T; error?: string };

/** Deploy versi simpel: Vercel saja. Token diisi sekali lewat Settings di web. */
export default function MobileDeploy() {
  const { tokens, loading } = useUserData();
  const [githubUrl, setGithubUrl] = React.useState("");
  const [name, setName] = React.useState("");
  const [msg, setMsg] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [liveUrl, setLiveUrl] = React.useState("");

  async function run() {
    if (!tokens.vercelToken) return setMsg("Isi token Vercel dulu lewat Settings di versi web.");
    setBusy(true);
    setLiveUrl("");
    setMsg("Memulai deploy…");
    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: name.trim(),
          githubUrl: githubUrl.trim(),
          vercelToken: tokens.vercelToken,
          githubPat: tokens.githubPat,
        }),
      });
      const body = (await res.json()) as Api<CreateDeployResult>;
      if (!body.ok || !body.data) throw new Error(body.error || "Deploy gagal.");
      const { deploymentId } = body.data;

      let state = body.data.readyState;
      let url = body.data.url;
      for (let i = 0; i < 90 && state !== "READY" && state !== "ERROR" && state !== "CANCELED"; i++) {
        setMsg(`Status: ${state}…`);
        await new Promise((r) => setTimeout(r, 4000));
        const s = await fetch(`/api/deploy/${deploymentId}`, { headers: { "x-vercel-token": tokens.vercelToken } });
        const sb = (await s.json()) as Api<DeployStatusResult>;
        if (sb.ok && sb.data) {
          state = sb.data.readyState;
          url = sb.data.url;
        }
      }

      const okDeploy = state === "READY";
      await addHistory({
        id: deploymentId,
        name: name.trim(),
        platform: "vercel",
        domain: url,
        date: new Date().toISOString().slice(0, 10),
        status: okDeploy ? "ready" : "failed",
        repo: githubUrl.replace(/^https?:\/\/github\.com\//, ""),
      });
      setMsg(okDeploy ? "Selesai! Situsmu sudah online." : `Deploy berakhir: ${state}.`);
      if (okDeploy) setLiveUrl(url.startsWith("http") ? url : `https://${url}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Terjadi kesalahan.");
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full rounded-xl border border-black/15 bg-transparent px-3 py-3 text-base dark:border-white/15";
  return (
    <div className="space-y-3">
      <input className={input} placeholder="https://github.com/user/repo" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} />
      <input className={input} placeholder="nama-project" value={name} onChange={(e) => setName(e.target.value)} />
      <button
        onClick={run}
        disabled={busy || loading || !githubUrl || !name}
        className="w-full rounded-xl bg-violet-600 px-4 py-3 font-medium text-white disabled:opacity-50"
      >
        {busy ? "Sedang deploy…" : "Deploy ke Vercel"}
      </button>
      {msg && <p className="text-sm opacity-80">{msg}</p>}
      {liveUrl && (
        <a href={liveUrl} target="_blank" rel="noreferrer" className="block text-sm text-violet-600">
          Buka {liveUrl}
        </a>
      )}
    </div>
  );
}
