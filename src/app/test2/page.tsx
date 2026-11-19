'use client';

import React from 'react';
import { LiquidRibbonCanvas } from '../../components/animations/LiquidRibbonCanvas';
import { HomeRightColumn } from '../../components/HomeRightColumn';

export default function TestTwoPage() {
  return (
    <main className="pws-bg-atmosphere min-h-screen flex items-center">
      <div className="w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-10 sm:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* LEFT COLUMN (50%): Option 2 — Infinite Liquid Ribbon (Figure-8 Curl Flow) */}
          <div className="order-2 lg:order-1 lg:col-span-6 relative w-full h-[440px] sm:h-[520px] bg-transparent">
            <LiquidRibbonCanvas />
          </div>

          {/* RIGHT COLUMN (50%): Home Content */}
          <HomeRightColumn className="order-1 lg:order-2" />
        </div>
      </div>
    </main>
  );
}
