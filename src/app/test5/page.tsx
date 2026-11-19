'use client';

import React from 'react';
import { ChaosCursorCanvas } from '../../components/animations/ChaosCursorCanvas';
import { HomeRightColumn } from '../../components/HomeRightColumn';

export default function TestFivePage() {
  return (
    <main className="pws-bg-atmosphere min-h-screen flex items-center">
      <div className="w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-10 sm:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* LEFT COLUMN (50%): Option 5 — Perpetual Chaos + HOLD-to-Dot Cursor */}
          <div className="order-2 lg:order-1 lg:col-span-6 w-full">
            <div className="relative w-full h-[440px] sm:h-[520px] bg-transparent">
              <ChaosCursorCanvas />
            </div>
            <p className="text-center text-[13px] font-semibold text-black mt-2 select-none">
              Gather all boids to reveal the key
            </p>
          </div>

          {/* RIGHT COLUMN (50%): Home Content */}
          <HomeRightColumn className="order-1 lg:order-2" />
        </div>
      </div>
    </main>
  );
}
