import * as React from "react";

/**
 * Logo platform (Vercel, Cloudflare, Railway) dari file SVG resmi.
 * Semua pakai `currentColor`, jadi warnanya ikut tema/tile di sekitarnya
 * (ungu di atas Mist/putih, Midnight di atas putih, dst.), bukan warna brand aslinya.
 *
 * `size` = sisi kotak tempat ikon digambar (angka = px, atau string CSS seperti "1.2em").
 * Tiap logo punya faktor optik supaya terlihat sama besar (Cloudflare lebih lebar, Vercel lebih rapat).
 */
interface PlatformIconProps extends Omit<React.SVGProps<SVGSVGElement>, "viewBox" | "children"> {
  size?: number | string;
}

function makeIcon(viewBox: string, k: number, paths: string[], displayName: string) {
  const Cmp = ({ size = 20, style, ...props }: PlatformIconProps) => {
    const s = typeof size === "number" ? `${size}px` : size;
    const dim = `calc(${s} * ${k})`;
    return (
      <svg
        viewBox={viewBox}
        fill="currentColor"
        width={dim}
        height={dim}
        style={{ width: dim, height: dim, flexShrink: 0, ...style }}
        aria-hidden="true"
        focusable="false"
        {...props}
      >
        {paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </svg>
    );
  };
  Cmp.displayName = displayName;
  return Cmp;
}

export const VercelIcon = makeIcon(
  "0 0 1154.69 1000",
  0.85,
  ["M577.34,0l577.35,1000H0L577.34,0Z"],
  "VercelIcon",
);

export const CloudflareIcon = makeIcon(
  "0 0 2000 894.5",
  1.3,
  [
    "M1387.27,835.97l-15.24,45.43c-2.63,7.83-9.96,13.1-18.22,13.1H19.22c-10.61,0-19.22-8.6-19.22-19.22v-34.31c0-164.81,131.38-298.92,295.13-303.34.07,0,.12-.06.1-.13-4.13-16.51-6.33-33.8-6.33-51.59h0c0-55.57,21.39-106.13,56.37-143.91,38.7-41.81,94.06-67.98,155.52-67.98,48.93,0,93.98,16.58,129.86,44.44.06.04.14.02.16-.05,23.61-68.51,62.54-129.89,112.69-180.04C828.99,52.88,947.1,0,1077.56,0s248.56,52.88,334.05,138.37c55.84,55.84,97.77,125.6,120.13,203.63.59,2.06,1.17,4.13,1.73,6.21,5.13,18.86,4.44,38.83-1.78,57.36l-17.61,52.49c-37.72,112.42-143.04,188.16-261.61,188.16h-690.95c-9.66,0-17.89,7.63-17.94,17.29-.03,4.84,1.93,9.24,5.09,12.4,3.15,3.15,7.5,5.1,12.3,5.1h714.85c80.35,0,137.02,78.79,111.46,154.96Z",
    "M2000,786.71c0,32.05-3.76,63.22-10.86,93.1-2.05,8.63-9.81,14.69-18.68,14.69h-553.24c-6.18,0-10.55-6.07-8.58-11.93l6.82-20.33c36.33-108.27,137.77-181.23,251.97-181.23h107.19c9.68,0,17.92-7.66,17.96-17.34.02-4.83-1.94-9.2-5.09-12.36-3.15-3.14-7.5-5.09-12.3-5.09h-123.79c-80.34,0-137.02-78.79-111.46-154.96l31.12-92.74c2.5-7.46,9.39-12.6,17.25-12.8,3.5-.09,7.01-.14,10.54-.14h.01c221.54,0,401.13,179.59,401.13,401.13Z",
  ],
  "CloudflareIcon",
);

export const RailwayIcon = makeIcon(
  "0 0 1999.99 1999.99",
  1,
  [
    "M9.29,855.81c-4.76,33.39-7.87,67-9.29,100.7h1519.13c-5.3-10.36-12.43-19.71-19.62-28.85-259.71-335.53-399.41-306.44-599.25-314.96-66.63-2.74-111.81-3.84-377.02-3.84-141.95,0-296.26.36-446.54.76-19.45,52.51-38.21,103.4-47.35,144.8h778.46v101.38H9.29ZM1531.11,1058H.78c1.6,27.05,4.12,53.74,7.77,80.08h1412.87c62.98,0,98.24-35.74,109.69-80.08h0ZM87.92,1414.66s234.23,575.12,911.02,585.34c404.51,0,752.09-240.25,909.97-585.34H87.92Z",
    "M998.93,0C624.91,0,299.43,205.39,127.56,509.01c134.32-.28,395.91-.44,395.91-.44h.06v-.1c309.2,0,320.69,1.38,381.09,3.9l37.4,1.38c130.27,4.34,290.4,18.33,416.39,113.65,68.39,51.7,167.13,165.81,225.99,247.11,54.42,75.19,70.07,161.63,33.07,244.45-34.05,76.11-107.33,121.51-196.06,121.51H32.6s8.27,35.05,20.66,73.73h1895.76c33.67-101.19,50.87-207.13,50.97-313.78C2000.01,447.96,1551.82,0,998.93,0Z",
  ],
  "RailwayIcon",
);
