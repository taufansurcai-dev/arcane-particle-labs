import { createFileRoute } from "@tanstack/react-router";
import { ParticleTextLogo } from "@/components/particles/ParticleTextLogo";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent">
      <div className="h-[60vh] w-full max-w-5xl">
        <ParticleTextLogo text="ARCANE LABS" />
      </div>
    </div>
  );
}
