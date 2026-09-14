import { createFileRoute } from "@tanstack/react-router";
import { ParticleTextLogo } from "@/components/particles/ParticleTextLogo";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Arcane Labs — 3D Particle Logo" },
      { name: "description", content: "Interactive 3D particle logo for Arcane Labs." },
      { property: "og:title", content: "Arcane Labs — 3D Particle Logo" },
      { property: "og:description", content: "Interactive 3D particle logo for Arcane Labs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="flex h-svh w-screen items-center justify-center overflow-hidden bg-transparent">
      <h1 className="sr-only">Arcane Labs</h1>
      <div className="h-full w-full">
        <ParticleTextLogo text="ARCANE LABS" />
      </div>
    </main>
  );
}
