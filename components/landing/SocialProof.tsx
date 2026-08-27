export function SocialProof() {
  const logos = ["Vercel", "Cloudflare", "GitHub"];
  return (
    <section className="px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <p className="text-center text-[12px] uppercase tracking-widest text-text-faint mb-6">
          Terintegrasi dengan platform yang kamu percaya
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 opacity-60">
          {logos.map((logo) => (
            <span key={logo} className="text-[20px] font-semibold tracking-tight">
              {logo}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
