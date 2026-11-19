'use client';

import React, { useEffect, useRef, useState } from 'react';

interface Boid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  flockIdx: number;
  size: number;
  wanderAngle: number;
  phaseOffset: number;
}

const PALETTE = ['#46b1e1', '#0c1527', '#2563eb', '#64748b'];

function smoothStep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export const ChaosCursorCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  const [cursorActive, setCursorActive] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isKeyUnlocked, setIsKeyUnlocked] = useState(false);
  const isKeyUnlockedRef = useRef(false);
  const initialCursorPosRef = useRef<{ x: number; y: number }>({ x: -100, y: -100 });

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
        boids.push({
          x: w * (0.12 + Math.random() * 0.76),
          y: h * (0.12 + Math.random() * 0.76),
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

    const updateCursorEl = (x: number, y: number) => {
      initialCursorPosRef.current = { x, y };
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const nx = e.clientX - rect.left;
      const ny = e.clientY - rect.top;
      pointer.x = nx;
      pointer.y = ny;
      if (!pointer.active) {
        pointer.active = true;
        setCursorActive(true);
      }
      updateCursorEl(nx, ny);
    };

    const onPointerLeave = () => {
      pointer.active = false;
      pointer.down = false;
      setCursorActive(false);
      setIsPressed(false);
    };

    const onPointerDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const nx = e.clientX - rect.left;
      const ny = e.clientY - rect.top;
      pointer.x = nx;
      pointer.y = ny;
      pointer.down = true;
      pointer.active = true;
      setCursorActive(true);
      setIsPressed(true);
      updateCursorEl(nx, ny);
    };

    const onPointerUp = () => {
      if (pointer.down) {
        pointer.down = false;
        setIsPressed(false);
      }
    };

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);

    const startMs = performance.now();
    const sepRadiusSq = 20 * 20;

    const drawFrame = (nowMs: number) => {
      const t = (nowMs - startMs) / 1000;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      let capturedCount = 0;

      for (let i = 0; i < boids.length; i++) {
        const b = boids[i];

        // Separation force only — particles stay perpetually chaotic (never group into flocks)
        let sepX = 0;
        let sepY = 0;
        let sepCount = 0;

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
        }

        let ax = 0;
        let ay = 0;

        if (sepCount > 0) {
          ax += (sepX / sepCount) * 0.12;
          ay += (sepY / sepCount) * 0.12;
        }

        // Endless organic chaotic wander
        b.wanderAngle += Math.sin(t * 2.1 + b.phaseOffset) * 0.14;
        ax += Math.cos(b.wanderAngle) * 0.12;
        ay += Math.sin(b.wanderAngle) * 0.12;

        // Soft interior margin containment
        const padX = width * 0.085;
        const padY = height * 0.085;
        if (b.x < padX) ax += ((padX - b.x) / padX) * 0.35;
        else if (b.x > width - padX) ax -= ((b.x - (width - padX)) / padX) * 0.35;
        if (b.y < padY) ay += ((padY - b.y) / padY) * 0.35;
        else if (b.y > height - padY) ay -= ((b.y - (height - padY)) / padY) * 0.35;

        // Same chaotic hover & hold vortex interaction as /test4
        if (pointer.active) {
          const dxM = b.x - pointer.x;
          const dyM = b.y - pointer.y;
          const distM = Math.hypot(dxM, dyM);
          const radius = pointer.down ? 220 : 125;

          if (distM < radius && distM > 0.5) {
            const strength = 1 - distM / radius;
            if (pointer.down) {
              // Vortex pull around clicked dot
              ax += (-dxM / distM) * strength * 0.85 - (dyM / distM) * strength * 0.65;
              ay += (-dyM / distM) * strength * 0.85 + (dxM / distM) * strength * 0.65;
            } else {
              // Gentle repulsor wake
              ax += (dxM / distM) * strength * 1.15;
              ay += (dyM / distM) * strength * 1.15;
            }
          }
        }

        b.vx += ax;
        b.vy += ay;

        const speed = Math.hypot(b.vx, b.vy);
        const minSpeed = 1.65;
        const maxSpeed = 3.8;
        if (speed > maxSpeed) {
          b.vx = (b.vx / speed) * maxSpeed;
          b.vy = (b.vy / speed) * maxSpeed;
        } else if (speed < minSpeed && speed > 0.01) {
          b.vx = (b.vx / speed) * minSpeed;
          b.vy = (b.vy / speed) * minSpeed;
        }

        b.x += b.vx;
        b.y += b.vy;

        // Track strict collection: every single boid must remain within the held vortex (<= 220px)
        if (pointer.down && pointer.active) {
          if (Math.hypot(b.x - pointer.x, b.y - pointer.y) <= 220) {
            capturedCount++;
          }
        }

        // 15% soft edge transparency fade
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

        // Streak trail
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1.1, b.size * 0.55);
        ctx.globalAlpha = 0.34 * edgeAlpha;
        ctx.beginPath();
        ctx.moveTo(b.x - b.vx * 2.8, b.y - b.vy * 2.8);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        // Directional micro-chevron
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

      const allCollected =
        pointer.down && pointer.active && capturedCount === boids.length;
      if (allCollected !== isKeyUnlockedRef.current) {
        isKeyUnlockedRef.current = allCollected;
        setIsKeyUnlocked(allCollected);
      }

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
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none cursor-none"
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full touch-none bg-transparent cursor-none"
        aria-label="Perpetual chaotic swarm with interactive HOLD cursor"
      />

      {/* Secret Unlocked Message rendered directly on the canvas with smooth zoom in/out */}
      <div
        aria-hidden={!isKeyUnlocked}
        className={`pointer-events-none absolute inset-0 z-30 flex items-center justify-center px-6 text-center transition-all duration-500 ease-out ${
          isKeyUnlocked
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-90'
        }`}
      >
        <div className="max-w-sm space-y-2 rounded-2xl bg-white/65 backdrop-blur-md border border-white/80 shadow-[0_20px_50px_-12px_rgba(12,21,39,0.16)] px-6 py-5">
          <p className="text-base sm:text-lg font-[900] text-[#0c1527] leading-snug">
            Chaos is working without a plan. Order is holding onto one repeatable week.
          </p>
          <p className="text-xs sm:text-[13px] font-semibold text-slate-700 leading-relaxed">
            One steady timetable turns discipline into automatic consistency.
          </p>
        </div>
      </div>

      {/* Custom Pointer Replacement: "HOLD" text -> morphs into black dot when clicked */}
      {cursorActive && (
        <div
          ref={cursorRef}
          className="pointer-events-none absolute left-0 top-0 z-50"
          style={{
            transform: `translate3d(${initialCursorPosRef.current.x}px, ${initialCursorPosRef.current.y}px, 0) translate(-50%, -50%)`,
          }}
        >
          {isPressed ? (
            <span className="block w-2.5 h-2.5 rounded-full bg-black shadow-sm transition-transform duration-100 scale-100" />
          ) : (
            <span className="block text-[10px] font-[900] tracking-widest text-black uppercase select-none leading-none">
              HOLD
            </span>
          )}
        </div>
      )}
    </div>
  );
};
