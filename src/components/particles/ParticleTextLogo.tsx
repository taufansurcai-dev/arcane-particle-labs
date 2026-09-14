import { useEffect, useRef } from "react";
import * as THREE from "three";

export interface ParticleTextLogoProps {
  text?: string;
  fontFamily?: string;
  fontWeight?: string | number;
  particleDensity?: number; // particles per solid pixel
  particleSize?: number; // px
  volumeDepth?: number; // 0-200 (%) -> extrude depth
  bevel?: number; // 0-100 (%) -> edge puff
  scale?: number; // world scale factor
  color1?: string; // highlight color
  color2?: string; // midtone color
  lightColor?: string;
  shadowColor?: string;
  animationSpeed?: number; // idle noise speed
  noiseAmplitude?: number; // idle sway
  mouseRadius?: number; // px-equivalent influence radius
  mouseForce?: number; // scatter power
  cameraDistance?: number;
  enableRotation?: boolean;
  rotationSpeed?: number;
  className?: string;
}

const VERTEX_SHADER = `
  uniform float uTime;
  uniform vec3 uMouse;
  uniform float uHoverStrength;
  uniform float uMouseRadius;
  uniform float uMouseForce;
  uniform float uParticleSize;
  uniform float uNoiseSpeed;
  uniform float uNoiseAmplitude;

  attribute vec3 aColor;
  attribute vec3 aNormal;
  attribute float aRandom;

  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec3 vMvPos;
  varying float vLocalZ;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
      const vec2  C = vec2(1.0/6.0, 1.0/3.0);
      const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy) );
      vec3 x0 = v - i + dot(i, C.xxx) ;
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min( g.xyz, l.zxy );
      vec3 i2 = max( g.xyz, l.zxy );
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute( permute( permute(
                  i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
      vec3  ns = 0.142857142857 * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_ );
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4( x.xy, y.xy );
      vec4 b1 = vec4( x.zw, y.zw );
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }
  vec3 curlNoise( vec3 p ){
      const float e = 0.1;
      vec3 dx = vec3( e , 0.0 , 0.0 );
      vec3 dy = vec3( 0.0 , e , 0.0 );
      vec3 dz = vec3( 0.0 , 0.0 , e );
      vec3 p_x0 = vec3( snoise(p - dx), snoise(p - dx + 13.5), snoise(p - dx + 31.2) );
      vec3 p_x1 = vec3( snoise(p + dx), snoise(p + dx + 13.5), snoise(p + dx + 31.2) );
      vec3 p_y0 = vec3( snoise(p - dy), snoise(p - dy + 13.5), snoise(p - dy + 31.2) );
      vec3 p_y1 = vec3( snoise(p + dy), snoise(p + dy + 13.5), snoise(p - dy + 31.2) );
      vec3 p_z0 = vec3( snoise(p - dz), snoise(p - dz + 13.5), snoise(p - dz + 31.2) );
      vec3 p_z1 = vec3( snoise(p + dz), snoise(p + dz + 13.5), snoise(p + dz + 31.2) );
      float x = p_y1.z - p_y0.z - p_z1.y + p_z0.y;
      float y = p_z1.x - p_z0.x - p_x1.z + p_x0.z;
      float z = p_x1.y - p_x0.y - p_y1.x + p_y0.x;
      return normalize( vec3( x , y , z ) );
  }

  void main() {
      vColor = aColor;
      vLocalZ = position.z;
      vec3 pos = position;

      vec3 idleNoise = curlNoise(pos * 1.5 + uTime * uNoiseSpeed + aRandom * 10.0);
      pos += idleNoise * uNoiseAmplitude;

      vec3 dirToMouse = pos - uMouse;
      float distToMouse = length(dirToMouse);
      float influence = smoothstep(uMouseRadius, uMouseRadius * 0.1, distToMouse) * uHoverStrength;

      if (influence > 0.0) {
          vec3 normDir = normalize(dirToMouse);
          vec3 vortex = cross(normDir, vec3(0.0, 0.0, 1.0));
          vec3 sandCurl = curlNoise(pos * 2.5 - uTime * 1.2);
          vec3 fluidScatter = (normDir * 0.3 + vortex * 0.5 + sandCurl * 0.8);
          pos += fluidScatter * influence * uMouseForce;
      }

      vec3 finalNormal = normalize(aNormal + idleNoise * 0.2);
      vNormal = normalMatrix * finalNormal;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      vMvPos = mvPosition.xyz;

      gl_PointSize = uParticleSize * (10.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT_SHADER = `
  uniform vec3 uLightColor;
  uniform vec3 uShadowColor;
  uniform vec3 uLightDir;
  uniform float uDepthVolume;

  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec3 vMvPos;
  varying float vLocalZ;

  void main() {
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord);
      if (dist > 0.5) discard;

      float z = sqrt(max(0.0, 0.25 - dist * dist));
      vec3 microNormal = normalize(vec3(coord.x, -coord.y, z));
      vec3 normal = normalize(vNormal * 0.7 + microNormal * 0.3);

      vec3 viewDir = normalize(-vMvPos);
      vec3 lightDir = normalize(uLightDir);

      float diff = max(dot(normal, lightDir), 0.0);
      float ao = smoothstep(-uDepthVolume, uDepthVolume, vLocalZ);

      vec3 diffuse = diff * uLightColor * (0.3 + 0.7 * ao);
      vec3 ambient = mix(uShadowColor, uLightColor, 0.15) * (1.0 - ao * 0.7);

      vec3 halfVector = normalize(lightDir + viewDir);
      float spec = pow(max(dot(normal, halfVector), 0.0), 32.0);
      vec3 specular = spec * uLightColor * ao * 1.5;

      vec3 finalColor = vColor * (diffuse + ambient) + specular;
      gl_FragColor = vec4(finalColor, 1.0);
  }
`;

/**
 * Renders arbitrary text as an offscreen canvas mask, samples the solid
 * pixels, and turns each one into a small "sand" volume of GPU particles.
 * Mouse movement scatters nearby particles outward in a swirling vortex;
 * particles idle with gentle curl-noise drift when the pointer is away.
 * Background is fully transparent (alpha:true, clearColor alpha 0).
 */
export function ParticleTextLogo({
  text = "ARCANE LABS",
  fontFamily = "Inter, ui-sans-serif, system-ui, sans-serif",
  fontWeight = 800,
  particleDensity = 4,
  particleSize = 1.35,
  volumeDepth = 1.5,
  bevel = 0.45,
  scale = 45,
  color1 = "#111111",
  color2 = "#010101",
  lightColor = "#FFFFFF",
  shadowColor = "#080808",
  animationSpeed = 4,
  noiseAmplitude = 3,
  mouseRadius = 145,
  mouseForce = 32,
  cameraDistance = 6.5,
  enableRotation = true,
  rotationSpeed = 60,
  className,
}: ParticleTextLogoProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer | undefined;
    let camera: THREE.PerspectiveCamera | undefined;
    let scene: THREE.Scene | undefined;
    let points: THREE.Points | undefined;
    let raf = 0;
    let visible = true;

    const orbit = { theta: 0, phi: Math.PI / 2 };
    const targetOrbit = { theta: 0, phi: Math.PI / 2 };
    const dragging = { current: false };
    const lastPointer = { x: 0, y: 0 };

    const mouseWorld = new THREE.Vector3(0, 0, 0);
    const hasMouse = { current: false };
    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const planeNormal = new THREE.Vector3();

    let uniforms: Record<string, { value: unknown }> | undefined;

    const buildTextTexture = (): ImageData => {
      const CANVAS_SIZE = 512;
      const canvas = document.createElement("canvas");
      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Fit text within canvas width with some margin.
      let fontSize = 120;
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      const margin = CANVAS_SIZE * 0.08;
      while (ctx.measureText(text).width > CANVAS_SIZE - margin * 2 && fontSize > 8) {
        fontSize -= 2;
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      }
      ctx.fillText(text, CANVAS_SIZE / 2, CANVAS_SIZE / 2 + fontSize * 0.04);
      return ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    };

    const buildParticles = () => {
      if (points) {
        points.geometry.dispose();
        (points.material as THREE.Material).dispose();
        scene?.remove(points);
      }

      const SIZE = 512;
      const imageData = buildTextTexture();
      const pixels = imageData.data;

      const density = particleDensity;
      const depth = volumeDepth / 10;
      const bevelAmt = bevel / 10;
      const worldScale = scale / 10;

      let solidCount = 0;
      for (let i = 0; i < SIZE * SIZE; i++) {
        if ((pixels[i * 4 + 3] ?? 0) > 80) solidCount++;
      }

      const targetTotal = Math.min(solidCount * density, 250_000);
      const positions = new Float32Array(targetTotal * 3);
      const colors = new Float32Array(targetTotal * 3);
      const normals = new Float32Array(targetTotal * 3);
      const randoms = new Float32Array(targetTotal);

      const cHigh = new THREE.Color(color1);
      const cLow = new THREE.Color(color2);
      const tmpColor = new THREE.Color();
      const tmpColor2 = new THREE.Color();

      let written = 0;
      let posIdx = 0;
      const ratio = targetTotal > 0 ? solidCount * density / targetTotal : 1;
      let accum = 0;
      const TAU = Math.PI * 2;

      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const idx = (y * SIZE + x) * 4;
          if ((pixels[idx + 3] ?? 0) <= 80) continue;

          const nx = (x / SIZE) * 2 - 1;
          const ny = -(y / SIZE) * 2 + 1;

          const t = (ny + 1) / 2;
          tmpColor.lerpColors(cLow, cHigh, t);

          for (let g = 0; g < density; g++) {
            accum += 1;
            if (accum < ratio || written >= targetTotal) continue;
            accum -= ratio;

            const rand1 = Math.random();
            const rand2 = Math.random();
            const theta = rand1 * TAU;
            const phi = Math.acos(2 * rand2 - 1);
            const r = Math.random() ** 1.5;
            const px = r * Math.sin(phi) * Math.cos(theta) * bevelAmt;
            const py = r * Math.sin(phi) * Math.sin(theta) * bevelAmt;
            const pz = r * Math.cos(phi) * bevelAmt;
            const dz = (Math.random() - 0.5) * 2 * depth;

            positions[posIdx] = nx * worldScale + px;
            positions[posIdx + 1] = ny * worldScale + py;
            positions[posIdx + 2] = dz + pz;

            const nlen = Math.sqrt(px * px + py * py + pz * pz) || 1;
            normals[posIdx] = px / nlen;
            normals[posIdx + 1] = py / nlen;
            normals[posIdx + 2] = pz / nlen;

            tmpColor2.copy(tmpColor);
            const hueJitter = (Math.random() - 0.5) * 0.03;
            tmpColor2.offsetHSL(hueJitter, 0, 0);
            colors[posIdx] = tmpColor2.r;
            colors[posIdx + 1] = tmpColor2.g;
            colors[posIdx + 2] = tmpColor2.b;

            randoms[written] = Math.random();

            posIdx += 3;
            written += 1;
          }
        }
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute("aNormal", new THREE.BufferAttribute(normals, 3));
      geometry.setAttribute("aRandom", new THREE.BufferAttribute(randoms, 1));
      geometry.setDrawRange(0, written);
      geometry.computeBoundingSphere();

      const lightDir = new THREE.Vector3(1, 1, 1).normalize();
      uniforms = {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector3(0, 0, 0) },
        uHoverStrength: { value: 0 },
        uMouseRadius: { value: mouseRadius / 100 },
        uMouseForce: { value: mouseForce / 100 },
        uParticleSize: { value: particleSize * (renderer?.getPixelRatio() ?? 1) },
        uNoiseSpeed: { value: animationSpeed / 100 },
        uNoiseAmplitude: { value: noiseAmplitude / 100 },
        uLightColor: { value: new THREE.Color(lightColor) },
        uShadowColor: { value: new THREE.Color(shadowColor) },
        uLightDir: { value: lightDir },
        uDepthVolume: { value: depth + bevelAmt },
      };

      const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        transparent: false,
        depthWrite: true,
        depthTest: true,
      });

      points = new THREE.Points(geometry, material);
      points.frustumCulled = false;
      scene?.add(points);
    };

    const init = () => {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
      camera.position.setFromSphericalCoords(cameraDistance, orbit.phi, orbit.theta);
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
      renderer.setClearColor(0x000000, 0);
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      container.appendChild(renderer.domElement);
    };

    const animate = () => {
      const u = uniforms;
      if (u) {
        const uTime = u["uTime"]!;
        const uHover = u["uHoverStrength"]!;
        const uMouse = u["uMouse"]!;
        (uTime.value as number) += 0.016;
        const target = hasMouse.current ? 1 : 0;
        uHover.value = (uHover.value as number) + (target - (uHover.value as number)) * 0.05;
        if (hasMouse.current) {
          (uMouse.value as THREE.Vector3).lerp(mouseWorld, 0.1);
        }
      }

      const ease = 0.08;
      orbit.theta += (targetOrbit.theta - orbit.theta) * ease;
      orbit.phi += (targetOrbit.phi - orbit.phi) * ease;
      camera!.position.setFromSphericalCoords(cameraDistance, orbit.phi, orbit.theta);
      camera!.lookAt(0, 0, 0);
      renderer!.render(scene!, camera!);

      if (visible) raf = requestAnimationFrame(animate);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!enableRotation) return;
      dragging.current = true;
      lastPointer.x = e.clientX;
      lastPointer.y = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (dragging.current && enableRotation) {
        const dx = e.clientX - lastPointer.x;
        const dy = e.clientY - lastPointer.y;
        targetOrbit.theta -= dx * (rotationSpeed / 10_000);
        targetOrbit.phi -= dy * (rotationSpeed / 10_000);
        targetOrbit.phi = Math.max(0.1, Math.min(Math.PI - 0.1, targetOrbit.phi));
        lastPointer.x = e.clientX;
        lastPointer.y = e.clientY;
      }

      if (!camera) return;
      planeNormal.subVectors(camera.position, new THREE.Vector3(0, 0, 0)).normalize();
      plane.setFromNormalAndCoplanarPoint(planeNormal, new THREE.Vector3(0, 0, 0));

      const rect = container.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      const hit = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(plane, hit)) {
        hasMouse.current = true;
        mouseWorld.copy(hit);
      } else {
        hasMouse.current = false;
      }
    };

    const onPointerUp = () => {
      dragging.current = false;
    };

    const onPointerLeave = () => {
      dragging.current = false;
      hasMouse.current = false;
    };

    init();
    buildParticles();
    raf = requestAnimationFrame(animate);

    const resizeObserver = new ResizeObserver(() => {
      if (!renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver((entries) => {
      const entry = entries[0];
      visible = entry ? entry.isIntersecting : true;
      if (visible) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(animate);
      }
    });
    intersectionObserver.observe(container);

    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", onPointerUp);
    container.addEventListener("pointerleave", onPointerLeave);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("pointerleave", onPointerLeave);

      scene?.traverse((obj) => {
        const mesh = obj as THREE.Points;
        mesh.geometry?.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      });
      scene?.clear();

      if (renderer) {
        renderer.forceContextLoss();
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    text,
    fontFamily,
    fontWeight,
    particleDensity,
    particleSize,
    volumeDepth,
    bevel,
    scale,
    color1,
    color2,
    lightColor,
    shadowColor,
    animationSpeed,
    noiseAmplitude,
    mouseRadius,
    mouseForce,
    cameraDistance,
    enableRotation,
    rotationSpeed,
  ]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: "100%",
        height: "100%",
        minWidth: 100,
        minHeight: 100,
        backgroundColor: "transparent",
        overflow: "hidden",
        touchAction: "none",
        cursor: enableRotation ? "grab" : "default",
      }}
    />
  );
}
