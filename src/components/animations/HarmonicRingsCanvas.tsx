'use client';

import React, { useEffect, useRef } from 'react';

interface StarGrain {
  ringIdx: number;
  baseTheta: number;
  radialJitter: number;
  normalJitter: number;
  size: number;
  twinklePhase: number;
}

const PALETTE = ['#46b1e1', '#0c1527', '#2563eb', '#64748b'];

function smoothStep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export const HarmonicRingsCanvas: React.FC = () => {
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

    // 3D camera tilt driven smoothly by pointer position
    const camera = {
      targetPitch: 0.25,
      targetYaw: -0.2,
      pitch: 0.25,
      yaw: -0.2,
      px: -9999,
      py: -9999,
      active: false,
      flickEnergy: 0,
    };

    // Traveling angular shockwave ripples triggered by flicks / clicks
    const ringRipples: { startTime: number; originAngle: number; strength: number }[] = [];

    const STARS_PER_RING = 420;
    const RING_COUNT = 4;
    const stars: StarGrain[] = [];

    for (let r = 0; r < RING_COUNT; r++) {
      for (let i = 0; i < STARS_PER_RING; i++) {
        stars.push({
          ringIdx: r,
          baseTheta: (i / STARS_PER_RING) * Math.PI * 2 + (Math.random() - 0.5) * 0.04,
          radialJitter: (Math.random() - 0.5) * 14,
          normalJitter: (Math.random() - 0.5) * 7,
          size: 0.85 + Math.random() * 1.55,
          twinklePhase: Math.random() * Math.PI * 2,
        });
      }
    }

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
    };

    resize();
    window.addEventListener('resize', resize);

    let lastFlickTrigger = 0;

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const nx = e.clientX - rect.left;
      const ny = e.clientY - rect.top;

      // Normalized [-1, 1] parallax camera tilt
      const normX = ((nx / rect.width) - 0.5) * 2;
      const normY = ((ny / rect.height) - 0.5) * 2;
      camera.targetYaw = normX * 0.65;
      camera.targetPitch = -normY * 0.65;

      // Measure cursor flick speed for shimmering ring ripples
      if (camera.active) {
        const moveDist = Math.hypot(nx - camera.px, ny - camera.py);
        if (moveDist > 26 && performance.now() - lastFlickTrigger > 140) {
          lastFlickTrigger = performance.now();
          const ang = Math.atan2(ny - rect.height * 0.5, nx - rect.width * 0.5);
          ringRipples.push({
            startTime: performance.now(),
            originAngle: ang,
            strength: Math.min(1.5, moveDist / 40),
          });
          camera.flickEnergy = Math.min(1, camera.flickEnergy + 0.35);
        }
      }

      camera.px = nx;
      camera.py = ny;
      camera.active = true;
    };

    const onPointerLeave = () => {
      camera.active = false;
      camera.targetPitch = 0.25;
      camera.targetYaw = -0.2;
    };

    const onPointerDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const nx = e.clientX - rect.left;
      const ny = e.clientY - rect.top;
      const ang = Math.atan2(ny - rect.height * 0.5, nx - rect.width * 0.5);
      ringRipples.push({
        startTime: performance.now(),
        originAngle: ang,
        strength: 1.8,
      });
      camera.flickEnergy = 1.0;
    };

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('pointerdown', onPointerDown);

    const startMs = performance.now();
    const ECLIPSE_CYCLE_SEC = 12;

    // Spin ratios for mechanical resonance (1 : 1.5 : 2 : 3)
    const SPIN_RATIOS = [0.42, -0.63, 0.84, -1.26];

    // Base 3D plane tilts per ring when expanded
    const RING_TILTS = [
      { ax: 0.78, ay: 0.35 },
      { ax: -0.72, ay: 0.62 },
      { ax: 0.44, ay: -0.85 },
      { ax: -0.35, ay: -0.52 },
    ];

    const drawFrame = (nowMs: number) => {
      const t = (nowMs - startMs) / 1000;
      const cyclePos = (t % ECLIPSE_CYCLE_SEC) / ECLIPSE_CYCLE_SEC;

      // Smooth periodic harmonic alignment / eclipse window (peaks cleanly around cyclePos = 0.5)
      const alignIn = smoothStep(0.36, 0.48, cyclePos);
      const alignOut = 1 - smoothStep(0.54, 0.68, cyclePos);
      const eclipseBlend = alignIn * alignOut; // 0 = tilted 3D orbits, 1 = razor-sharp aligned chord
      const tiltScale = 1 - eclipseBlend * 0.96;

      // Smooth camera interpolation
      camera.pitch += (camera.targetPitch - camera.pitch) * 0.08;
      camera.yaw += (camera.targetYaw - camera.yaw) * 0.08;
      camera.flickEnergy *= 0.94;

      // Prune finished ring ripples (> 1.4s old)
      for (let i = ringRipples.length - 1; i >= 0; i--) {
        if (nowMs - ringRipples[i].startTime > 1400) {
          ringRipples.splice(i, 1);
        }
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const cx = width * 0.5;
      const cy = height * 0.5;
      const maxRadius = Math.min(width, height) * 0.38;
      const focal = 680;

      // Camera rotation matrices (Yaw around Y, Pitch around X)
      const cosCamY = Math.cos(camera.yaw);
      const sinCamY = Math.sin(camera.yaw);
      const cosCamX = Math.cos(camera.pitch);
      const sinCamX = Math.sin(camera.pitch);

      // Precompute each ring's current 3D plane rotation
      const ringMats = RING_TILTS.map((rt, idx) => {
        const precession = t * 0.24 * (idx % 2 === 0 ? 1 : -1);
        const ax = (rt.ax + Math.sin(precession) * 0.22) * tiltScale;
        const ay = (rt.ay + Math.cos(precession) * 0.22) * tiltScale;
        return {
          cosX: Math.cos(ax),
          sinX: Math.sin(ax),
          cosY: Math.cos(ay),
          sinY: Math.sin(ay),
          radius: maxRadius * (0.42 + idx * 0.19),
        };
      });

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const mat = ringMats[s.ringIdx];

        const theta = s.baseTheta + t * SPIN_RATIOS[s.ringIdx];

        // Evaluate traveling shockwave ripples along this ring
        let rippleDisp = 0;
        let rippleGlow = 0;
        for (let rIdx = 0; rIdx < ringRipples.length; rIdx++) {
          const rp = ringRipples[rIdx];
          const age = (nowMs - rp.startTime) / 1000;
          const waveTheta = rp.originAngle + age * 4.8;
          // Angular wrap difference in [0, PI]
          const dTheta = Math.atan2(
            Math.sin(theta - waveTheta),
            Math.cos(theta - waveTheta)
          );
          const packet = Math.exp(-(dTheta * dTheta) / 0.22) * Math.exp(-age * 2.1);
          rippleDisp += packet * 16 * rp.strength;
          rippleGlow += packet * rp.strength;
        }

        const r = mat.radius + s.radialJitter * (1 - eclipseBlend * 0.65) + rippleDisp;
        const lx = Math.cos(theta) * r;
        const ly = Math.sin(theta) * r;
        const lz = s.normalJitter * (1 - eclipseBlend * 0.8);

        // Apply Ring 3D Tilt (X then Y)
        const y1 = ly * mat.cosX - lz * mat.sinX;
        const z1 = ly * mat.sinX + lz * mat.cosX;
        const x2 = lx * mat.cosY + z1 * mat.sinY;
        const z2 = -lx * mat.sinY + z1 * mat.cosY;
        const y2 = y1;

        // Apply Interactive Camera Parallax Tilt (Y then X)
        const cx1 = x2 * cosCamY + z2 * sinCamY;
        const cz1 = -x2 * sinCamY + z2 * cosCamY;
        const cy2 = y2 * cosCamX - cz1 * sinCamX;
        const cz2 = y2 * sinCamX + cz1 * cosCamX;

        const persp = focal / (focal + cz2);
        const sx = cx + cx1 * persp;
        const sy = cy + cy2 * persp;

        // 15% soft edge transparency fade
        const edgeDistRatio = Math.min(
          sx / width,
          (width - sx) / width,
          sy / height,
          (height - sy) / height
        );
        const edgeAlpha = smoothStep(0, 0.15, edgeDistRatio);
        if (edgeAlpha <= 0.01) continue;

        const depthAlpha = Math.max(0.28, Math.min(1, 0.72 + (-cz2 / maxRadius) * 0.35));
        const twinkle = 0.8 + 0.2 * Math.sin(t * 3.5 + s.twinklePhase);
        const highlightBoost = Math.min(1, rippleGlow + eclipseBlend * 0.45);

        ctx.fillStyle = highlightBoost > 0.35 ? '#38bdf8' : PALETTE[s.ringIdx];
        ctx.globalAlpha = Math.min(1, depthAlpha * twinkle + highlightBoost * 0.25) * edgeAlpha;

        const drawSize = s.size * persp * (1 + rippleGlow * 0.45);
        ctx.beginPath();
        ctx.arc(sx, sy, drawSize, 0, Math.PI * 2);
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
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full cursor-crosshair touch-none bg-transparent"
      aria-label="Abstract Harmonic Rings 3D gyroscope animation"
    />
  );
};
