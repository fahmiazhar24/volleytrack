import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VolleyTrack — Sistem Rapor & Evaluasi Klub Voli",
    short_name: "VolleyTrack",
    description:
      "Aplikasi absensi lapangan, penilaian skill voli, dan rapor digital atlet.",
    start_url: "/dashboard",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    lang: "id",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}