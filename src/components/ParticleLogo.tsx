import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const PARTICLE_COUNT = 52000;

function seeded(index: number, salt: number) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function createTextParticles() {
  const canvas = document.createElement("canvas");
  canvas.width = 1800;
  canvas.height = 480;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return new Float32Array();

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#000";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = '900 276px Arial Black, Arial, sans-serif';
  context.fillText("ARCANE LABS", canvas.width / 2, canvas.height / 2 + 8);

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const valid: Array<[number, number]> = [];
  for (let y = 0; y < canvas.height; y += 2) {
    for (let x = 0; x < canvas.width; x += 2) {
      if (pixels[(y * canvas.width + x) * 4 + 3] > 80) valid.push([x, y]);
    }
  }

  const positions = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    const source = valid[Math.floor(seeded(i, 1) * valid.length)] ?? [900, 240];
    const edgeNoise = (seeded(i, 2) - 0.5) * 7;
    positions[i * 3] = (source[0] - canvas.width / 2 + edgeNoise) / 95;
    positions[i * 3 + 1] = -(source[1] - canvas.height / 2 + (seeded(i, 3) - 0.5) * 7) / 95;
    positions[i * 3 + 2] = (seeded(i, 4) - 0.5) * 1.15;
  }
  return positions;
}

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uPointer;
  uniform float uPointSize;
  attribute float aRandom;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    float drift = sin(uTime * 0.72 + p.x * 1.38 + aRandom * 9.0) *
                  cos(uTime * 0.48 + p.y * 1.72 + aRandom * 5.0);
    p.z += drift * 0.105;
    p.y += sin(uTime * 0.38 + p.x * 0.53 + aRandom * 7.0) * 0.018;

    vec2 delta = p.xy - uPointer;
    float distanceToPointer = length(delta);
    float influence = 1.0 - smoothstep(0.0, 2.25, distanceToPointer);
    vec2 direction = distanceToPointer > 0.001 ? delta / distanceToPointer : vec2(0.0);
    float ripple = sin(distanceToPointer * 7.0 - uTime * 4.2 + aRandom * 2.5);
    p.xy += direction * influence * (0.34 + ripple * 0.11);
    p.z += influence * (0.46 + ripple * 0.18);

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = uPointSize * (8.0 / max(1.0, -mvPosition.z));
    vAlpha = 0.58 + aRandom * 0.42;
  }
`;

const fragmentShader = /* glsl */ `
  varying float vAlpha;
  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    if (dot(center, center) > 0.25) discard;
    gl_FragColor = vec4(0.015, 0.015, 0.018, vAlpha);
  }
`;

function ParticleWordmark() {
  const points = useRef<THREE.Points>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const pointerTarget = useRef(new THREE.Vector2(100, 100));
  const drag = useRef({ active: false, x: 0, y: 0, rx: 0, ry: 0 });
  const { size, viewport } = useThree();

  const geometryData = useMemo(() => {
    const positions = createTextParticles();
    const random = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i += 1) random[i] = seeded(i, 8);
    return { positions, random };
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(100, 100) },
      uPointSize: { value: 3.9 },
    }),
    [],
  );

  useEffect(() => {
    const element = document.querySelector("canvas");
    if (!(element instanceof HTMLCanvasElement)) return;
    const updatePointer = (clientX: number, clientY: number) => {
      const rect = element.getBoundingClientRect();
      pointerTarget.current.set(
        ((clientX - rect.left) / rect.width - 0.5) * viewport.width,
        -((clientY - rect.top) / rect.height - 0.5) * viewport.height,
      );
    };
    const down = (event: PointerEvent) => {
      drag.current.active = true;
      drag.current.x = event.clientX;
      drag.current.y = event.clientY;
      element.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      updatePointer(event.clientX, event.clientY);
      if (!drag.current.active) return;
      drag.current.ry += (event.clientX - drag.current.x) * 0.004;
      drag.current.rx += (event.clientY - drag.current.y) * 0.003;
      drag.current.x = event.clientX;
      drag.current.y = event.clientY;
    };
    const up = () => { drag.current.active = false; };
    const leave = () => { pointerTarget.current.set(100, 100); };
    element.addEventListener("pointerdown", down);
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerup", up);
    element.addEventListener("pointercancel", up);
    element.addEventListener("pointerleave", leave);
    return () => {
      element.removeEventListener("pointerdown", down);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerup", up);
      element.removeEventListener("pointercancel", up);
      element.removeEventListener("pointerleave", leave);
    };
  }, [viewport.height, viewport.width]);

  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    if (material.current) {
      material.current.uniforms.uTime.value = clock.elapsedTime;
      material.current.uniforms.uPointer.value.lerp(pointerTarget.current, 1 - Math.exp(-8 * delta));
      material.current.uniforms.uPointSize.value = Math.min(5.2, Math.max(3.25, size.width / 360));
    }
    if (points.current) {
      points.current.rotation.x = THREE.MathUtils.lerp(points.current.rotation.x, drag.current.rx, 1 - Math.exp(-7 * delta));
      points.current.rotation.y = THREE.MathUtils.lerp(points.current.rotation.y, drag.current.ry, 1 - Math.exp(-7 * delta));
    }
  });

  const scale = Math.min(viewport.width / 21, viewport.height / 7.2);
  return (
    <points ref={points} scale={scale}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[geometryData.positions, 3]} />
        <bufferAttribute attach="attributes-aRandom" args={[geometryData.random, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </points>
  );
}

export function ParticleLogo() {
  return (
    <main className="particle-stage" aria-label="Interactive Arcane Labs particle logo">
      <h1 className="sr-only">Arcane Labs</h1>
      <Canvas
        flat
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: false, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 8], fov: 45 }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      >
        <ParticleWordmark />
      </Canvas>
    </main>
  );
}
