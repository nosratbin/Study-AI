import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IccheGhuri",
    short_name: "IccheGhuri",
    description: "AI education, projects and verified opportunities for students in Bangladesh.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFF7ED",
    theme_color: "#F97316",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
