"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export interface PixelBlastProps {
  variant?: "square" | "circle" | "triangle" | "star";
  pixelSize?: number;
  color?: string;
  patternScale?: number;
  patternDensity?: number;
  enableRipples?: boolean;
  rippleSpeed?: number;
  rippleThickness?: number;
  rippleIntensityScale?: number;
  speed?: number;
  transparent?: boolean;
  edgeFade?: number;
}

export default function PixelBlast({
  pixelSize = 3,
  color = "#ffffff",
  patternScale = 2,
  patternDensity = 1,
  enableRipples = true,
  rippleSpeed = 0.3,
  rippleThickness = 0.1,
  rippleIntensityScale = 1,
  speed = 0.5,
  transparent = true,
  edgeFade = 0.5,
}: PixelBlastProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let animationFrameId: number;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({ alpha: transparent, antialias: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(1);
    container.appendChild(renderer.domElement);

    const parseColor = (hex: string) => {
      const c = new THREE.Color(hex);
      return new THREE.Vector3(c.r, c.g, c.b);
    };

    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(width, height) },
      uPixelSize: { value: pixelSize },
      uColor: { value: parseColor(color) },
      uPatternScale: { value: patternScale },
      uPatternDensity: { value: patternDensity },
      uEnableRipples: { value: enableRipples ? 1.0 : 0.0 },
      uRippleSpeed: { value: rippleSpeed },
      uRippleThickness: { value: rippleThickness },
      uRippleIntensity: { value: rippleIntensityScale },
      uSpeed: { value: speed },
      uEdgeFade: { value: edgeFade },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uRippleTime: { value: -100.0 },
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
      uniform float uPixelSize;
      uniform vec3 uColor;
      uniform float uPatternScale;
      uniform float uPatternDensity;
      uniform float uEnableRipples;
      uniform float uRippleSpeed;
      uniform float uRippleThickness;
      uniform float uRippleIntensity;
      uniform float uSpeed;
      uniform float uEdgeFade;
      uniform vec2 uMouse;
      uniform float uRippleTime;
      varying vec2 vUv;

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }

      float fbm(vec2 p) {
        float val = 0.0;
        float amp = 0.5;
        for (int i = 0; i < 4; i++) {
          val += amp * noise(p);
          p *= 2.0;
          amp *= 0.5;
        }
        return val;
      }

      void main() {
        // Crisp pixel grid alignment matching React-Bits PixelBlast halftone style
        float size = max(4.0, uPixelSize * 2.0);
        vec2 pixelCoord = floor(gl_FragCoord.xy / size);
        vec2 cellUv = fract(gl_FragCoord.xy / size) - 0.5;
        
        vec2 gridPos = pixelCoord * size / uResolution.xy;
        
        float t = uTime * uSpeed * 0.4;
        
        // Fluid organic shape noise
        vec2 nPos = gridPos * uPatternScale * 4.0 + vec2(t * 0.15, t * 0.1);
        float n = fbm(nPos);
        
        // Crisp square pixel dots
        float dotSize = smoothstep(0.2, 0.75, n * uPatternDensity);
        
        float isPixel = step(abs(cellUv.x), dotSize * 0.42) * step(abs(cellUv.y), dotSize * 0.42);

        // Interactive ripple effect from pointer
        float ripple = 0.0;
        if (uEnableRipples > 0.5) {
          float dist = distance(gridPos, uMouse);
          float rAge = (uTime - uRippleTime) * uRippleSpeed;
          if (rAge > 0.0 && rAge < 2.5) {
            float ring = abs(dist - rAge);
            ripple = smoothstep(uRippleThickness, 0.0, ring) * (1.0 - rAge / 2.5) * uRippleIntensity;
          }
        }

        float alpha = isPixel * clamp(n * 1.5 + ripple, 0.0, 1.0);

        // Edge fade out towards screen margins
        if (uEdgeFade > 0.0) {
          float dEdge = min(min(gridPos.x, 1.0 - gridPos.x), min(gridPos.y, 1.0 - gridPos.y));
          float fade = smoothstep(0.0, uEdgeFade * 0.4, dEdge);
          alpha *= fade;
        }

        // Crisp white dots with elegant contrast against dark background
        alpha *= 0.85;

        gl_FragColor = vec4(uColor, alpha);
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

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      uniforms.uMouse.value.set(x, y);
    };

    const handlePointerDown = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      uniforms.uMouse.value.set(x, y);
      uniforms.uRippleTime.value = uniforms.uTime.value;
    };

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mousedown", handlePointerDown);

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
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("resize", handleResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [
    pixelSize,
    color,
    patternScale,
    patternDensity,
    enableRipples,
    rippleSpeed,
    rippleThickness,
    rippleIntensityScale,
    speed,
    transparent,
    edgeFade,
  ]);

  return (
    <div
      ref={mountRef}
      style={{
        width: "100%",
        height: "100%",
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
