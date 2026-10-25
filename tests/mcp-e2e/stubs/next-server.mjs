export class NextResponse extends Response {
  static json(body, init = {}) { const h = new Headers(init.headers); h.set("content-type", "application/json"); return new NextResponse(JSON.stringify(body), { ...init, headers: h }); }
  static redirect(url, status = 307) { return new NextResponse(null, { status, headers: { location: String(url) } }); }
}
export class NextRequest extends Request {
  constructor(url, init = {}) {
    super(url, init);
    const raw = this.headers.get("cookie") || "";
    const jar = new Map(raw.split(/;\s*/).filter(Boolean).map((c) => { const i = c.indexOf("="); return [c.slice(0, i), { name: c.slice(0, i), value: decodeURIComponent(c.slice(i + 1)) }]; }));
    this.cookies = { get: (n) => jar.get(n) };
    this.nextUrl = new URL(url);
  }
}
