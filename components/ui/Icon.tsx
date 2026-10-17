import * as React from "react";
import { ArrowRight, Check, CheckCircle2, Rocket } from "./icons";

/** Nama Material yang sudah dialihkan ke icon pack Depup. */
const FROM_PACK = { rocket_launch: Rocket, check: Check, arrow_forward: ArrowRight, check_circle: CheckCircle2 } as const;

/**
 * Google Material Symbols (Rounded, weight 400) — SVG inline, tanpa font tambahan.
 * Sumber: @material-symbols/svg-400 (Apache-2.0). Tambah ikon baru dengan menyalin path dari
 * node_modules/@material-symbols/svg-400/rounded/<nama>.svg (pakai "-fill" untuk varian solid).
 */
const PATHS = {
  rocket_launch: "M263-465q26-69 64.5-130.5T415-712l-77-15q-20-4-39.5 2T265-705L129-568q-11 11-8 26.5t17 21.5l125 55Zm580-398q-109-8-206.5 37.5T461-702q-50 50-88.5 106.5T309-473q-4 10-4 20t8 18l135 135q8 8 18 8t20-4q66-24 122.5-63T715-448q78-78 124-175.5T877-830q-1-6-3.5-11.5T866-852q-5-5-10.5-7.5T843-863ZM566-622.5q0-29.5 20-49.5t49.5-20q29.5 0 49.5 20t20 49.5q0 29.5-20 49.5t-49.5 20q-29.5 0-49.5-20t-20-49.5ZM479-250l54 125q6 15 22 17.5t27-8.5l136-136q14-14 20-33.5t2-39.5l-14-77q-55 49-116.5 87.5T479-250Zm-317-68q35-35 85-35.5t85 34.5q35 35 35 85t-35 85q-48 48-113.5 57T87-74q9-66 18.5-131.5T162-318Z",
  waving_hand: "M690-40q-12 0-21-9t-9-21q0-13 8.5-21.5T690-100q72 0 121-49.5T860-270q0-13 8.5-21.5T890-300q12 0 21 9t9 21q0 96-67.5 163T690-40ZM70-659q-12 0-21-9t-9-21q0-96 67.5-163.5T270-920q13 0 22 9t9 21q0 13-8.5 21.5T271-860q-71 0-121 49.5T100-690q0 13-8.5 22T70-659Zm125 460q-91-91-91.5-218T194-635l67-67q16-16 29.5-7.5T315-690q21 21 21.5 50T315-589l-46 46q-9 9-9 21t9 21l12 13q27 27 27 65.5T281-357q-7 7-7 17t7 17q7 7 17 7t17-7q41-41 41-99t-41-99l33-34q21-21 30-47.5t4-51.5l167-167q9-9 21.5-9t21.5 9q9 9 9 21.5t-9 21.5L373-559l61 61 276-275q9-9 21-9t21 9q9 9 9 21t-9 21L477-456l61 62 247-247q9-9 21.5-9t21.5 9q9 9 9 21t-9 21L581-352l61 62 189-189q9-9 21.5-9t21.5 9q9 9 9 21t-9 21L633-196q-91 91-218.5 90T195-199Z",
  change_history: "M134-160q-18 0-26.5-15.5T109-206l347-553q9-14 25-14t25 14l345 553q9 15 1 30.5T826-160H134Z",
  cloud: "M251-160q-88 0-149.5-61.5T40-371q0-78 50-137t127-71q20-97 94-158.5T482-799q112 0 189 81.5T748-522v24q72-2 122 46.5T920-329q0 69-50 119t-119 50H251Z",
  train: "M160-340v-380q0-41 19-71.5t58.5-50q39.5-19.5 100-29T480-880q86 0 146.5 9t99 28.5Q764-823 782-793t18 73v380q0 59-40.5 99.5T660-200l26 26q15 15 7 34.5T663-120q-6 0-11.5-2t-10.5-7l-71-71H390l-71 71q-5 5-10.5 7t-11.5 2q-21 0-29.5-19.5T274-174l26-26q-59 0-99.5-40.5T160-340Zm60-205h234v-155H220v155Zm294 0h226v-155H514v155ZM374-331q16-16 16-39t-16-39q-16-16-39-16t-39 16q-16 16-16 39t16 39q16 16 39 16t39-16Zm290 0q16-16 16-39t-16-39q-16-16-39-16t-39 16q-16 16-16 39t16 39q16 16 39 16t39-16Z",
  circle: "M480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-156t86-127Q252-817 325-848.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 82-31.5 155T763-197.5q-54 54.5-127 86T480-80Z",
  check_circle: "m421-389-98-98q-9-9-22-9t-23 10q-9 9-9 22t9 22l122 123q9 9 21 9t21-9l239-239q10-10 10-23t-10-23q-10-9-23.5-8.5T635-603L421-389Zm59 309q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-156t86-127Q252-817 325-848.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 82-31.5 155T763-197.5q-54 54.5-127 86T480-80Z",
  check: "m378-332 363-363q9-9 21.5-9t21.5 9q9 9 9 21.5t-9 21.5L399-267q-9 9-21 9t-21-9L175-449q-9-9-8.5-21.5T176-492q9-9 21.5-9t21.5 9l159 160Z",
  arrow_forward: "M686-450H190q-13 0-21.5-8.5T160-480q0-13 8.5-21.5T190-510h496L459-737q-9-9-9-21t9-21q9-9 21-9t21 9l278 278q5 5 7 10t2 11q0 6-2 11t-7 10L501-181q-9 9-21 9t-21-9q-9-9-9-21t9-21l227-227Z",
} as const;

export type IconName = keyof typeof PATHS;

interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  /** Ukuran (px). Default 1em supaya ikut ukuran teks di sekitarnya. */
  size?: number | string;
}

export function Icon({ name, size = "1em", className, ...props }: IconProps) {
  const Packed = (FROM_PACK as Record<string, React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number | string }>>)[name];
  if (Packed) return <Packed size={size} className={className} {...props} />;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 -960 960 960"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/** Ikon sebaris sejajar baseline teks (untuk dipakai di dalam kalimat). */
export function InlineIcon({ name, className }: { name: IconName; className?: string }) {
  return <Icon name={name} className={`inline-block shrink-0 align-[-0.15em] ${className ?? ""}`} />;
}

/** Ganti simbol teks ✓ → ● jadi ikon Material, sisanya tetap teks. */
export function GlyphText({ children }: { children: string }) {
  const parts = children.split(/(✓|→|●)/g);
  return (
    <>
      {parts.map((part, i) =>
        part === "✓" ? (
          <InlineIcon key={i} name="check" className="mr-[0.2em]" />
        ) : part === "→" ? (
          <InlineIcon key={i} name="arrow_forward" className="mx-[0.15em]" />
        ) : part === "●" ? (
          <InlineIcon key={i} name="circle" className="mr-[0.3em] text-[0.55em] align-[0.05em]" />
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  );
}
