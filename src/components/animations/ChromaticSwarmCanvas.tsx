'use client';

import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  colorIdx: number;
  shape: 'dot' | 'cross' | 'tri';
  size: number;
  angle: number;
  spin: number;
  phaseOffset: number;
  ringOrder: number; // normalized [0, 1) within color group
  ribbonT: number; // normalized [0, 1) horizontal progression
  chaosHomeX: number; // normalized [0.1, 0.9] interior anchor
  chaosHomeY: number; // normalized [0.1, 0.9] interior anchor
  chaosFreqX: number;
  chaosFreqY: number;
  chaosPhaseX: number;
  chaosPhaseY: number;
}

// App Theme Palette: Brand Sky (#46b1e1), Theme Black (#0c1527), Theme Blue (#2563eb), Theme Gray (#64748b)
const PALETTE = ['#46b1e1', '#0c1527', '#2563eb', '#64748b'];

function smoothStep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export const ChromaticSwarmCanvas: React.FC = () => {
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

    // Pointer physics state
    const pointer = {
      x: -9999,
      y: -9999,
      vx: 0,
      vy: 0,
      active: false,
      down: false,
    };

    // Shockwave pulses on click
    const pulses: { x: number; y: number; r: number; maxR: number; alpha: number }[] = [];

    const COUNT = 1040;
    const perColor = COUNT / 4;
    const particles: Particle[] = [];

    const initParticles = (w: number, h: number) => {
      particles.length = 0;
      for (let i = 0; i < COUNT; i++) {
        const colorIdx = Math.floor(i / perColor) % 4;
        const idxInColor = i % perColor;
        const rShape = Math.random();
        const shape: Particle['shape'] =
          rShape < 0.62 ? 'dot' : rShape < 0.82 ? 'cross' : 'tri';

        particles.push({
          x: w * (0.1 + Math.random() * 0.8),
          y: h * (0.1 + Math.random() * 0.8),
          vx: (Math.random() - 0.5) * 1.2,
          vy: (Math.random() - 0.5) * 1.2,
          colorIdx,
          shape,
          size: shape === 'dot' ? 1.6 + Math.random() * 1.8 : 2.3 + Math.random() * 1.9,
          angle: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 0.04,
          phaseOffset: Math.random() * Math.PI * 2,
          ringOrder: idxInColor / perColor,
          ribbonT: idxInColor / perColor,
          chaosHomeX: 0.14 + Math.random() * 0.72,
          chaosHomeY: 0.14 + Math.random() * 0.72,
          chaosFreqX: 0.55 + Math.random() * 0.85,
          chaosFreqY: 0.55 + Math.random() * 0.85,
          chaosPhaseX: Math.random() * Math.PI * 2,
          chaosPhaseY: Math.random() * Math.PI * 2,
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
      if (particles.length === 0) {
        initParticles(width, height);
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
        r: 8,
        maxR: Math.min(width, height) * 0.55,
        alpha: 0.85,
      });

      for (const p of particles) {
        const dx = p.x - cx;
        const dy = p.y - cy;
        const dist = Math.hypot(dx, dy);
        if (dist < 220 && dist > 0.1) {
          const force = (1 - dist / 220) * 10;
          p.vx += (dx / dist) * force - (dy / dist) * 2.2;
          p.vy += (dy / dist) * force + (dx / dist) * 2.2;
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

    const CYCLE_SECONDS = 14;
    const startMs = performance.now();

    const drawFrame = (nowMs: number) => {
      const t = (nowMs - startMs) / 1000;
      const cyclePos = (t % CYCLE_SECONDS) / CYCLE_SECONDS; // [0, 1)

      // Matched ~0.7s snappy transitions across all 3 stages:
      // 1) Chaos Turbulence (0.00 - 0.24)
      // 2) Chaos -> 7-Fold Infinity Ring (0.24 - 0.29 fast morph; holds 0.29 - 0.54)
      // 3) 7-Fold Ring -> 4 Batched Ribbon Waves (0.54 - 0.59 fast morph; holds 0.59 - 0.88)
      // 4) 4 Batched Ribbon Waves -> Chaos Turbulence (0.88 - 0.93 fast release)
      const alphaRingIn = smoothStep(0.24, 0.29, cyclePos);
      const alphaToRibbon = smoothStep(0.54, 0.59, cyclePos);
      const alphaOutToChaos = smoothStep(0.88, 0.93, cyclePos);

      const wRing = alphaRingIn * (1 - alphaToRibbon) * (1 - alphaOutToChaos);
      const wRibbon = alphaToRibbon * (1 - alphaOutToChaos);
      const wChaos = Math.max(0, 1 - wRing - wRibbon);

      // Extra spring boost right as Ribbon dissolves into Chaos so release matches Ring/Ribbon snap speed
      const releaseBurst =
        alphaOutToChaos * (1 - smoothStep(0.94, 0.99, cyclePos));

      ctx.save();
      ctx.scale(dpr, dpr);

      // Transparent canvas clear
      ctx.clearRect(0, 0, width, height);

      const cx = width * 0.5;
      const cy = height * 0.5;
      const minDim = Math.min(width, height);

      // Update & draw expanding shockwaves
      for (let i = pulses.length - 1; i >= 0; i--) {
        const pulse = pulses[i];
        pulse.r += 7;
        pulse.alpha *= 0.93;
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

      const marginX = 28;
      const usableW = Math.max(120, width - marginX * 2);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // 1. TRUE DISTRIBUTED CHAOS TURBULENCE (bounded interior orbits + multi-wave wander)
        // Guarantees particles swirl across the entire canvas without ever gathering at edges
        const wanderX =
          Math.sin(t * p.chaosFreqX + p.chaosPhaseX) * (width * 0.14) +
          Math.cos(t * 0.55 + p.chaosHomeY * 9) * (width * 0.08);
        const wanderY =
          Math.cos(t * p.chaosFreqY + p.chaosPhaseY) * (height * 0.14) +
          Math.sin(t * 0.5 + p.chaosHomeX * 9) * (height * 0.08);

        const padX = width * 0.07;
        const padY = height * 0.07;
        const chaosTx = Math.max(padX, Math.min(width - padX, p.chaosHomeX * width + wanderX));
        const chaosTy = Math.max(padY, Math.min(height - padY, p.chaosHomeY * height + wanderY));

        // 2. ORGANIZED STATE 1: 7-FOLD INFINITY ORBITAL RING (calm & hypnotic)
        const baseR = minDim * (0.14 + p.colorIdx * 0.072);
        const theta =
          p.ringOrder * Math.PI * 2 +
          t * (0.28 - p.colorIdx * 0.035) * (p.colorIdx % 2 === 0 ? 1 : -1);
        const harmonic7 = Math.cos(7 * theta - t * 1.3) * (minDim * 0.028);
        const ringR =
          baseR + harmonic7 + Math.sin(t * 2.2 + p.phaseOffset) * 4;
        const ringTx = cx + Math.cos(theta) * ringR;
        const ringTy = cy + Math.sin(theta) * ringR;

        // 3. ORGANIZED STATE 2: 4 BATCHED LAMINAR RIBBON WAVES
        const ribX =
          marginX +
          p.ribbonT * usableW +
          Math.sin(t * 1.3 + p.phaseOffset) * 10;
        const bandCenterY = height * (0.22 + p.colorIdx * 0.185);
        const waveAmp = minDim * 0.068;
        const waveFreq = 2.2;
        const thicknessSpread = Math.sin(p.phaseOffset * 3.1) * 9;
        const ribY =
          bandCenterY +
          Math.sin(
            p.ribbonT * Math.PI * 2 * waveFreq - t * 2.5 + p.colorIdx * 0.85
          ) *
            waveAmp +
          thicknessSpread;

        // Matched fast spring convergence across Chaos -> Ring, Ring -> Ribbon, and Ribbon -> Chaos
        const targetX = chaosTx * wChaos + ringTx * wRing + ribX * wRibbon;
        const targetY = chaosTy * wChaos + ringTy * wRing + ribY * wRibbon;
        const chaosSpring = 0.035 + releaseBurst * 0.165;
        const springK = chaosSpring * wChaos + 0.21 * wRing + 0.21 * wRibbon;

        p.vx += (targetX - p.x) * springK;
        p.vy += (targetY - p.y) * springK;

        // Cursor Displacement Wake & Vortex Physics
        if (pointer.active) {
          const dxM = p.x - pointer.x;
          const dyM = p.y - pointer.y;
          const distM = Math.hypot(dxM, dyM);
          const radius = pointer.down ? 175 : 130;

          if (distM < radius && distM > 0.5) {
            const strength = 1 - distM / radius;
            if (pointer.down) {
              p.vx += (-dxM / distM) * strength * 1.6 - (dyM / distM) * strength * 2.5;
              p.vy += (-dyM / distM) * strength * 1.6 + (dxM / distM) * strength * 2.5;
            } else {
              p.vx +=
                (dxM / distM) * strength * 1.9 -
                (dyM / distM) * strength * 0.85 +
                pointer.vx * strength * 0.14;
              p.vy +=
                (dyM / distM) * strength * 1.9 +
                (dxM / distM) * strength * 0.85 +
                pointer.vy * strength * 0.14;
            }
          }
        }

        // Crisp balanced damping across all phases
        const chaosDamping = 0.86 - releaseBurst * 0.12;
        const damping = chaosDamping * wChaos + 0.73 * wRing + 0.72 * wRibbon;
        p.vx *= damping;
        p.vy *= damping;

        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.spin + Math.hypot(p.vx, p.vy) * 0.012;

        // Gradual Edge Transparency: 100% transparent at border -> 100% opaque at 15% inward
        const edgeDistRatio = Math.min(
          p.x / width,
          (width - p.x) / width,
          p.y / height,
          (height - p.y) / height
        );
        const edgeAlpha = smoothStep(0, 0.15, edgeDistRatio);
        if (edgeAlpha <= 0.01) continue;

        const speed = Math.hypot(p.vx, p.vy);
        const color = PALETTE[p.colorIdx];
        ctx.fillStyle = color;
        ctx.strokeStyle = color;

        // Delicate comet wake on fast movement
        if (speed > 2.2) {
          ctx.globalAlpha = Math.min(0.45, speed * 0.06) * edgeAlpha;
          ctx.lineWidth = Math.max(1, p.size * 0.7);
          ctx.beginPath();
          ctx.moveTo(p.x - p.vx * 2.3, p.y - p.vy * 2.3);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }

        ctx.globalAlpha = Math.min(1, 0.78 + speed * 0.08) * edgeAlpha;

        if (p.shape === 'dot') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'cross') {
          const s = p.size;
          ctx.lineWidth = 1.3;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.beginPath();
          ctx.moveTo(-s, 0);
          ctx.lineTo(s, 0);
          ctx.moveTo(0, -s);
          ctx.lineTo(0, s);
          ctx.stroke();
          ctx.restore();
        } else {
          const s = p.size * 1.15;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.beginPath();
          ctx.moveTo(s, 0);
          ctx.lineTo(-s * 0.7, -s * 0.65);
          ctx.lineTo(-s * 0.7, s * 0.65);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
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
      aria-label="Abstract Chromatic Swarm particle animation"
    />
  );
};
