'use client';

import React, { useEffect, useRef } from 'react';

interface Grain {
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  u: number; // parametric loop angle [0, 2*PI)
  speedMul: number;
  strandOffset: number; // [-1, 1] across ribbon width
  colorIdx: number;
  size: number;
  wobblePhase: number;
}

const PALETTE = ['#46b1e1', '#0c1527', '#2563eb', '#64748b'];

function smoothStep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export const LiquidRibbonCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animFrameId = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const pointer = {
      x: -9999,
      y: -9999,
      vx: 0,
      vy: 0,
      active: false,
      down: false,
    };

    const pulses: { x: number; y: number; r: number; maxR: number; alpha: number }[] = [];

    const COUNT = 2000;
    const grains: Grain[] = [];

    // Helper: compute target point on tilted infinity (figure-8) Möbius streamline
    const getInfinityPoint = (
      u: number,
      strandOffset: number,
      wobblePhase: number,
      t: number,
      cx: number,
      cy: number,
      scaleX: number,
      scaleY: number
    ) => {
      // Lemniscate of Gerono: (sin u, sin u * cos u) -> clean centered infinity loop
      const baseX = Math.sin(u);
      const baseY = Math.sin(u) * Math.cos(u);

      // Derivative vector for perpendicular ribbon fanning
      const dxdu = Math.cos(u);
      const dydu = Math.cos(2 * u);
      const tangentLen = Math.hypot(dxdu, dydu) || 1;
      const nx = -dydu / tangentLen;
      const ny = dxdu / tangentLen;

      // Center pinch factor: tight compressed jet near center (|sin u| small), wide graceful fan in outer lobes
      const lobeSpread = 0.25 + 0.75 * Math.pow(Math.abs(Math.sin(u)), 1.3);
      const ribbonWidth =
        (14 + Math.min(scaleX, scaleY) * 0.17 * lobeSpread) *
        (1 + 0.14 * Math.sin(t * 1.4 + u * 2));

      const waveRipple = Math.sin(u * 4 - t * 2.4 + wobblePhase) * 4.5 * lobeSpread;
      const offsetDist = strandOffset * ribbonWidth + waveRipple;

      // Scale & apply subtle -16 deg dynamic tilt
      const lx = baseX * scaleX + nx * offsetDist;
      const ly = baseY * scaleY + ny * offsetDist;

      const tiltAngle = -0.28 + Math.sin(t * 0.35) * 0.04;
      const cosA = Math.cos(tiltAngle);
      const sinA = Math.sin(tiltAngle);

      return {
        tx: cx + lx * cosA - ly * sinA,
        ty: cy + lx * sinA + ly * cosA,
        pinchBoost: 1 + (1 - lobeSpread) * 1.15, // Faster velocity through center pinch
      };
    };

    const initGrains = (w: number, h: number) => {
      grains.length = 0;
      const cx = w * 0.5;
      const cy = h * 0.5;
      const scaleX = w * 0.36;
      const scaleY = h * 0.42;

      for (let i = 0; i < COUNT; i++) {
        const u = Math.random() * Math.PI * 2;
        const strandOffset = (Math.random() - 0.5) * 2;
        const wobblePhase = Math.random() * Math.PI * 2;
        const colorIdx = i % 4;

        const { tx, ty } = getInfinityPoint(
          u,
          strandOffset,
          wobblePhase,
          0,
          cx,
          cy,
          scaleX,
          scaleY
        );

        grains.push({
          x: tx,
          y: ty,
          px: tx,
          py: ty,
          vx: 0,
          vy: 0,
          u,
          speedMul: 0.75 + Math.random() * 0.55,
          strandOffset,
          colorIdx,
          size: 0.9 + Math.random() * 1.45,
          wobblePhase,
        });
      }
    };

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(320, rect.width);
      height = Math.max(420, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      if (grains.length === 0) {
        initGrains(width, height);
      }
    };

    resize();
    window.addEventListener('resize', resize);

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const nx = e.clientX - rect.left;
      const ny = e.clientY - rect.top;
      pointer.vx = nx - (pointer.active ? pointer.x : nx);
      pointer.vy = ny - (pointer.active ? pointer.y : ny);
      pointer.x = nx;
      pointer.y = ny;
      pointer.active = true;
    };

    const onPointerLeave = () => {
      pointer.active = false;
      pointer.down = false;
    };

    const onPointerDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      pointer.down = true;
      pointer.x = cx;
      pointer.y = cy;

      pulses.push({
        x: cx,
        y: cy,
        r: 10,
        maxR: Math.min(width, height) * 0.45,
        alpha: 0.9,
      });

      for (const g of grains) {
        const dx = g.x - cx;
        const dy = g.y - cy;
        const dist = Math.hypot(dx, dy);
        if (dist < 180 && dist > 0.5) {
          const force = (1 - dist / 180) * 9.5;
          g.vx += (dx / dist) * force - (dy / dist) * 2.5;
          g.vy += (dy / dist) * force + (dx / dist) * 2.5;
        }
      }
    };

    const onPointerUp = () => {
      pointer.down = false;
    };

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);

    let lastMs = performance.now();
    const startMs = lastMs;

    const drawFrame = (nowMs: number) => {
      const dt = Math.min(0.035, (nowMs - lastMs) / 1000);
      lastMs = nowMs;
      const t = (nowMs - startMs) / 1000;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const cx = width * 0.5;
      const cy = height * 0.5;
      const scaleX = width * 0.37;
      const scaleY = height * 0.43;

      // Update & draw shockwave rings
      for (let i = pulses.length - 1; i >= 0; i--) {
        const pulse = pulses[i];
        pulse.r += 7;
        pulse.alpha *= 0.92;
        if (pulse.alpha < 0.02 || pulse.r > pulse.maxR) {
          pulses.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(pulse.x, pulse.y, pulse.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(70, 177, 225, ${pulse.alpha * 0.45})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      pointer.vx *= 0.88;
      pointer.vy *= 0.88;

      ctx.lineCap = 'round';

      for (let i = 0; i < grains.length; i++) {
        const g = grains[i];
        g.px = g.x;
        g.py = g.y;

        const { tx, ty, pinchBoost } = getInfinityPoint(
          g.u,
          g.strandOffset,
          g.wobblePhase,
          t,
          cx,
          cy,
          scaleX,
          scaleY
        );

        // Flow continuously forward along the closed infinity streamline
        g.u = (g.u + dt * 0.62 * g.speedMul * pinchBoost) % (Math.PI * 2);

        // Smooth magnetic pull back to streamline ribbon
        g.vx += (tx - g.x) * 0.16;
        g.vy += (ty - g.y) * 0.16;

        // Aerodynamic wing / eddy hover interaction
        if (pointer.active) {
          const dxM = g.x - pointer.x;
          const dyM = g.y - pointer.y;
          const distM = Math.hypot(dxM, dyM);
          const radius = pointer.down ? 165 : 125;

          if (distM < radius && distM > 0.5) {
            const strength = 1 - distM / radius;
            const tangX = -dyM / distM;
            const tangY = dxM / distM;

            if (pointer.down) {
              // Tight eddy vortex around held cursor
              g.vx += tangX * strength * 3.4 - (dxM / distM) * strength * 1.1;
              g.vy += tangY * strength * 3.4 - (dyM / distM) * strength * 1.1;
            } else {
              // Warm aerodynamic deflection + swirling eddy wake
              g.vx +=
                (dxM / distM) * strength * 1.7 +
                tangX * strength * 1.45 +
                pointer.vx * strength * 0.22;
              g.vy +=
                (dyM / distM) * strength * 1.7 +
                tangY * strength * 1.45 +
                pointer.vy * strength * 0.22;
            }
          }
        }

        g.vx *= 0.78;
        g.vy *= 0.78;
        g.x += g.vx;
        g.y += g.vy;

        // 15% soft edge transparency fade
        const edgeDistRatio = Math.min(
          g.x / width,
          (width - g.x) / width,
          g.y / height,
          (height - g.y) / height
        );
        const edgeAlpha = smoothStep(0, 0.15, edgeDistRatio);
        if (edgeAlpha <= 0.01) continue;

        const speed = Math.hypot(g.x - g.px, g.y - g.py);
        // Shift fast grains dynamically toward electric #38bdf8 highlight
        const isHighSpeed = speed > 4.2;
        const baseColor = isHighSpeed ? '#38bdf8' : PALETTE[g.colorIdx];

        // Silky soft motion-blur streamline tail + crisp liquid grain head
        const trailX = g.x - (g.x - g.px) * 2.4;
        const trailY = g.y - (g.y - g.py) * 2.4;

        ctx.strokeStyle = baseColor;
        ctx.fillStyle = baseColor;
        ctx.globalAlpha = Math.min(0.85, 0.25 + speed * 0.09) * edgeAlpha;
        ctx.lineWidth = g.size * (isHighSpeed ? 1.35 : 1.05);
        ctx.beginPath();
        ctx.moveTo(trailX, trailY);
        ctx.lineTo(g.x, g.y);
        ctx.stroke();

        ctx.globalAlpha = Math.min(1, 0.65 + speed * 0.06) * edgeAlpha;
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.size * 0.75, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.restore();
      animFrameId = requestAnimationFrame(drawFrame);
    };

    animFrameId = requestAnimationFrame(drawFrame);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full cursor-crosshair touch-none bg-transparent"
      aria-label="Abstract Infinite Liquid Ribbon figure-8 particle flow"
    />
  );
};
