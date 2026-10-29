import { jsonLdString } from "@/lib/seo";

/** Menyisipkan satu atau beberapa blok JSON-LD. Server component; isinya ikut di HTML awal. */
export function JsonLd({ data }: { data: unknown | unknown[] }) {
  const list = Array.isArray(data) ? data : [data];
  return (
    <>
      {list.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdString(item) }}
        />
      ))}
    </>
  );
}
