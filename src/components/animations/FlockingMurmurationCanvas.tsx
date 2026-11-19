'use client';

import React, { useEffect, useRef } from 'react';

interface Boid {
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  flockIdx: number; // 0..3 color flock
  size: number;
  wanderAngle: number;
  phaseOffset: number;
}

const PALETTE = ['#46b1e1', '#0c1527', '#2563eb', '#64748b'];

function smoothStep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export const FlockingMurmurationCanvas: React.FC = () => {
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
      active: false,
      down: false,
    };

    const COUNT = 520;
    const boids: Boid[] = [];

    const initBoids = (w: number, h: number) => {
      boids.length = 0;
      for (let i = 0; i < COUNT; i++) {
        const ang = Math.random() * Math.PI * 2;
        const speed = 1.6 + Math.random() * 1.4;
        const x = w * (0.14 + Math.random() * 0.72);
        const y = h * (0.14 + Math.random() * 0.72);
        boids.push({
          x,
          y,
          px: x,
          py: y,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          flockIdx: i % 4,
          size: 2.0 + Math.random() * 1.4,
          wanderAngle: ang,
          phaseOffset: Math.random() * Math.PI * 2,
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
      if (boids.length === 0) {
        initBoids(width, height);
      }
    };

    resize();
    window.addEventListener('resize', resize);

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    };

    const onPointerLeave = () => {
      pointer.active = false;
      pointer.down = false;
    };

    const onPointerDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.down = true;
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
      const cyclePos = (t % CYCLE_SECONDS) / CYCLE_SECONDS;

      // Flocking factor:
      // 0.00 - 0.22: Scattered individual birds
      // 0.22 - 0.34: Smoothly lock into 4 sweeping color flocks
      // 0.34 - 0.82: Full murmuration orbit & ribbon dance
      // 0.82 - 0.94: Peel apart back into scattered flight
      const lockIn = smoothStep(0.22, 0.34, cyclePos);
      const peelOut = smoothStep(0.82, 0.94, cyclePos);
      const flockStrength = lockIn * (1 - peelOut); // [0..1]

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const cx = width * 0.5;
      const cy = height * 0.5;

      // Compute 4 dynamic orbital flock leaders chasing a sweeping Lissajous figure-8 path
      const orbitGoals = [0, 1, 2, 3].map((fIdx) => {
        const phase = t * 0.95 + fIdx * (Math.PI * 0.5);
        return {
          x: cx + Math.sin(phase) * (width * 0.29),
          y: cy + Math.sin(phase * 2 + fIdx * 0.35) * (height * 0.24),
        };
      });

      const neighborRadius = 56;
      const neighborRadiusSq = neighborRadius * neighborRadius;
      const sepRadiusSq = 20 * 20;

      for (let i = 0; i < boids.length; i++) {
        const b = boids[i];
        b.px = b.x;
        b.py = b.y;

        let sepX = 0;
        let sepY = 0;
        let sepCount = 0;

        let alignX = 0;
        let alignY = 0;
        let cohX = 0;
        let cohY = 0;
        let flockCount = 0;

        // Boids neighborhood interaction (lightweight O(N^2) for N=520 is ~0.6ms/frame)
        for (let j = 0; j < boids.length; j++) {
          if (i === j) continue;
          const other = boids[j];
          const dx = b.x - other.x;
          const dy = b.y - other.y;
          const dSq = dx * dx + dy * dy;

          if (dSq > 0.01 && dSq < sepRadiusSq) {
            const invD = 1 / Math.sqrt(dSq);
            sepX += dx * invD;
            sepY += dy * invD;
            sepCount++;
          }

          if (other.flockIdx === b.flockIdx && dSq < neighborRadiusSq && flockStrength > 0.02) {
            alignX += other.vx;
            alignY += other.vy;
            cohX += other.x;
            cohY += other.y;
            flockCount++;
          }
        }

        let ax = 0;
        let ay = 0;

        // Separation force (stronger during peel-out / scatter, tight during murmuration)
        if (sepCount > 0) {
          const sepWeight = 0.095 * (1.25 - flockStrength * 0.55);
          ax += (sepX / sepCount) * sepWeight;
          ay += (sepY / sepCount) * sepWeight;
        }

        // Same-color alignment + cohesion
        if (flockCount > 0 && flockStrength > 0.02) {
          ax += (alignX / flockCount - b.vx) * 0.045 * flockStrength;
          ay += (alignY / flockCount - b.vy) * 0.045 * flockStrength;

          const targetCohX = cohX / flockCount - b.x;
          const targetCohY = cohY / flockCount - b.y;
          ax += targetCohX * 0.0022 * flockStrength;
          ay += targetCohY * 0.0022 * flockStrength;
        }

        // Gentle orbital flock guide when locked in
        if (flockStrength > 0.02) {
          const goal = orbitGoals[b.flockIdx];
          const gx = goal.x - b.x;
          const gy = goal.y - b.y;
          const gDist = Math.hypot(gx, gy) || 1;
          ax += (gx / gDist) * 0.24 * flockStrength;
          ay += (gy / gDist) * 0.24 * flockStrength;
        }

        // Organic individual wander when scattered
        b.wanderAngle += (Math.sin(t * 2.1 + b.phaseOffset) * 0.14);
        const scatterWeight = 1 - flockStrength;
        if (scatterWeight > 0.02) {
          ax += Math.cos(b.wanderAngle) * 0.12 * scatterWeight;
          ay += Math.sin(b.wanderAngle) * 0.12 * scatterWeight;
        }

        // Soft interior margin containment (keeps starlings smoothly inside [8%..92%])
        const padX = width * 0.085;
        const padY = height * 0.085;
        if (b.x < padX) ax += ((padX - b.x) / padX) * 0.35;
        else if (b.x > width - padX) ax -= ((b.x - (width - padX)) / padX) * 0.35;
        if (b.y < padY) ay += ((padY - b.y) / padY) * 0.35;
        else if (b.y > height - padY) ay -= ((b.y - (height - padY)) / padY) * 0.35;

        // Interactive Pointer Repulsor (split flock) & Hold Attractor (swarm)
        if (pointer.active) {
          const dxM = b.x - pointer.x;
          const dyM = b.y - pointer.y;
          const distM = Math.hypot(dxM, dyM);
          const radius = pointer.down ? 220 : 125;

          if (distM < radius && distM > 0.5) {
            const strength = 1 - distM / radius;
            if (pointer.down) {
              // Magnetic swirl pull when holding pointer down
              ax += (-dxM / distM) * strength * 0.85 - (dyM / distM) * strength * 0.65;
              ay += (-dyM / distM) * strength * 0.85 + (dxM / distM) * strength * 0.65;
            } else {
              // Playful wind splitter: slice cleanly through a flock so it self-heals behind cursor
              ax += (dxM / distM) * strength * 1.15;
              ay += (dyM / distM) * strength * 1.15;
            }
          }
        }

        b.vx += ax;
        b.vy += ay;

        // Clamp velocity cleanly within natural flight band
        const speed = Math.hypot(b.vx, b.vy);
        const minSpeed = 1.65;
        const maxSpeed = 3.8 + flockStrength * 1.1;
        if (speed > maxSpeed) {
          b.vx = (b.vx / speed) * maxSpeed;
          b.vy = (b.vy / speed) * maxSpeed;
        } else if (speed < minSpeed && speed > 0.01) {
          b.vx = (b.vx / speed) * minSpeed;
          b.vy = (b.vy / speed) * minSpeed;
        }

        b.x += b.vx;
        b.y += b.vy;

        // 15% smooth edge transparency fade
        const edgeDistRatio = Math.min(
          b.x / width,
          (width - b.x) / width,
          b.y / height,
          (height - b.y) / height
        );
        const edgeAlpha = smoothStep(0, 0.15, edgeDistRatio);
        if (edgeAlpha <= 0.01) continue;

        const color = PALETTE[b.flockIdx];
        const heading = Math.atan2(b.vy, b.vx);

        // Glowing aerodynamic streak trail
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1.1, b.size * 0.55);
        ctx.globalAlpha = 0.34 * edgeAlpha;
        ctx.beginPath();
        ctx.moveTo(b.x - b.vx * 2.8, b.y - b.vy * 2.8);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        // Sleek directional starling chevron / wing micro-icon
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.88 * edgeAlpha;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(heading);
        const s = b.size;
        ctx.beginPath();
        ctx.moveTo(s * 1.5, 0);
        ctx.lineTo(-s * 0.9, -s * 0.72);
        ctx.lineTo(-s * 0.4, 0);
        ctx.lineTo(-s * 0.9, s * 0.72);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
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
      aria-label="Abstract Flocking Murmuration boids animation"
    />
  );
};
