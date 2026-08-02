"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export interface LaserFlowProps {
  color?: string;
  wispDensity?: number;
  flowSpeed?: number;
  verticalSizing?: number;
  horizontalSizing?: number;
  fogIntensity?: number;
  fogScale?: number;
  wispSpeed?: number;
  wispIntensity?: number;
  flowStrength?: number;
  decay?: number;
  horizontalBeamOffset?: number;
  verticalBeamOffset?: number;
}

export default function LaserFlow({
  color = "#FF79C6",
  wispDensity = 1,
  flowSpeed = 0.35,
  verticalSizing = 2,
  horizontalSizing = 0.5,
  fogIntensity = 0.45,
  fogScale = 0.3,
  wispSpeed = 15,
  wispIntensity = 5,
  flowStrength = 0.25,
  decay = 1.1,
  horizontalBeamOffset = 0,
  verticalBeamOffset = -0.5,
}: LaserFlowProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationFrameId: number;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const parseColor = (hex: string) => {
      const c = new THREE.Color(hex);
      return new THREE.Vector3(c.r, c.g, c.b);
    };

    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(width, height) },
      uColor: { value: parseColor(color) },
      uWispDensity: { value: wispDensity },
      uFlowSpeed: { value: flowSpeed },
      uVerticalSizing: { value: verticalSizing },
      uHorizontalSizing: { value: horizontalSizing },
      uFogIntensity: { value: fogIntensity },
      uFogScale: { value: fogScale },
      uWispSpeed: { value: wispSpeed },
      uWispIntensity: { value: wispIntensity },
      uFlowStrength: { value: flowStrength },
      uDecay: { value: decay },
      uHorizontalBeamOffset: { value: horizontalBeamOffset },
      uVerticalBeamOffset: { value: verticalBeamOffset },
    };

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float uTime;
      uniform vec2 uResolution;
      uniform vec3 uColor;
      uniform float uWispDensity;
      uniform float uFlowSpeed;
      uniform float uVerticalSizing;
      uniform float uHorizontalSizing;
      uniform float uFogIntensity;
      uniform float uFogScale;
      uniform float uWispSpeed;
      uniform float uWispIntensity;
      uniform float uFlowStrength;
      uniform float uDecay;
      uniform float uHorizontalBeamOffset;
      uniform float uVerticalBeamOffset;
      varying vec2 vUv;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * noise(p);
          p *= 2.0;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 st = (gl_FragCoord.xy / uResolution.xy) * 2.0 - 1.0;
        st.x -= uHorizontalBeamOffset;
        st.y -= uVerticalBeamOffset;

        // Laser central beam vertical line
        float distCenter = abs(st.x) / uHorizontalSizing;
        float beamCore = exp(-distCenter * 35.0 * uDecay);
        float beamGlow = exp(-distCenter * 6.0 * uDecay);

        // Vertical fog/wisp flow dynamics
        float t = uTime * uFlowSpeed;
        vec2 fogUv = vec2(st.x * uFogScale * 3.0, (st.y - t) * uVerticalSizing);
        float fog = fbm(fogUv * 4.0) * uFogIntensity;

        // Energetic wisps flowing upwards
        float wispT = uTime * (uWispSpeed * 0.1);
        vec2 wispUv = vec2(st.x * 12.0 * uWispDensity, st.y * 3.0 - wispT);
        float wisps = pow(noise(wispUv), 3.0) * uWispIntensity * 0.1;

        // Base glow intensity fading towards top
        float heightFade = smoothstep(1.0, -1.0, st.y);
        float totalIntensity = (beamCore * 2.0 + beamGlow * 0.8 + fog + wisps) * heightFade;

        // Bottom flare glow
        float bottomFlare = exp(-length(vec2(st.x * 2.0, (st.y + 0.9) * 4.0)) * 2.0) * 1.5;
        totalIntensity += bottomFlare;

        // Alpha calculation for smooth transparency overlay
        float alpha = clamp(totalIntensity * 0.45, 0.0, 1.0);
        vec3 finalColor = mix(uColor, vec3(1.0), beamCore * 0.7);

        gl_FragColor = vec4(finalColor * (totalIntensity * 0.5 + 0.5), alpha);
      }
    `;

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      renderer.setSize(w, h);
      uniforms.uResolution.value.set(w, h);
    };

    window.addEventListener("resize", handleResize);

    const clock = new THREE.Clock();
    const animate = () => {
      uniforms.uTime.value = clock.getElapsedTime();
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [
    color,
    wispDensity,
    flowSpeed,
    verticalSizing,
    horizontalSizing,
    fogIntensity,
    fogScale,
    wispSpeed,
    wispIntensity,
    flowStrength,
    decay,
    horizontalBeamOffset,
    verticalBeamOffset,
  ]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
