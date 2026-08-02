"use client";

import React, { useEffect, useRef } from "react";

export interface NoiseProps {
  patternSize?: number;
  patternScaleX?: number;
  patternScaleY?: number;
  patternRefreshInterval?: number;
  patternAlpha?: number;
}

export default function Noise({
  patternSize = 250,
  patternScaleX = 1,
  patternScaleY = 1,
  patternRefreshInterval = 2,
  patternAlpha = 15,
}: NoiseProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Offscreen canvas for generating the noise grain tile
    const patternCanvas = document.createElement("canvas");
    patternCanvas.width = patternSize;
    patternCanvas.height = patternSize;
    const patternCtx = patternCanvas.getContext("2d");
    if (!patternCtx) return;

    const imgData = patternCtx.createImageData(patternSize, patternSize);
    const data = imgData.data;

    let animationFrameId: number;
    let frameCount = 0;

    const updateNoisePattern = () => {
      for (let i = 0; i < data.length; i += 4) {
        const value = Math.floor(Math.random() * 255);
        data[i] = value;     // R
        data[i + 1] = value; // G
        data[i + 2] = value; // B
        data[i + 3] = patternAlpha; // Alpha (0-255)
      }
      patternCtx.putImageData(imgData, 0, 0);
    };

    const resizeCanvas = () => {
      if (!canvas) return;
      const rect = canvas.parentElement?.getBoundingClientRect();
      const w = rect?.width || window.innerWidth;
      const h = rect?.height || window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    updateNoisePattern();

    const loop = () => {
      frameCount++;
      if (frameCount % patternRefreshInterval === 0) {
        updateNoisePattern();
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const pattern = ctx.createPattern(patternCanvas, "repeat");
      if (pattern) {
        ctx.save();
        ctx.scale(patternScaleX, patternScaleY);
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, canvas.width / patternScaleX, canvas.height / patternScaleY);
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [patternSize, patternScaleX, patternScaleY, patternRefreshInterval, patternAlpha]);

  return (
    <canvas
      ref={canvasRef}
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
