import { createFileRoute } from "@tanstack/react-router";
import { ParticleLogo } from "../components/ParticleLogo";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Arcane Labs — Particle Logo" },
      { name: "description", content: "Interactive 3D particle wordmark for Arcane Labs." },
      { property: "og:title", content: "Arcane Labs — Particle Logo" },
      { property: "og:description", content: "Interactive 3D particle wordmark for Arcane Labs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ParticleLogo,
});
