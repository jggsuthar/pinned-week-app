'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpen, ExternalLink } from 'lucide-react';
import { ChaosCursorCanvas } from './animations/ChaosCursorCanvas';
import { HomeRightColumn } from './HomeRightColumn';
import { BrandLogoLink } from './BrandLogoLink';

export const StepLanding: React.FC = () => {
  return (
    <div className="w-full min-h-screen flex flex-col">
      {/* Minimal Header with Brand Logo + Guide + All Tools links */}
      <header className="w-full">
        <div className="w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <BrandLogoLink />
            <span className="h-5 w-px bg-slate-200" aria-hidden="true" />
            <a
              href="https://jaiminsuthar.com/tools"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-700 bg-white border border-slate-200/90 hover:border-[#46b1e1] hover:text-[#0c1527] shadow-2xs transition"
            >
              <span>All Tools</span>
              <ExternalLink className="w-3 h-3 text-[#46b1e1]" />
            </a>
            <Link
              href="/guide"
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-bold text-[#0c1527] bg-sky-50/80 border border-sky-200/80 hover:border-[#46b1e1] hover:bg-sky-100/70 shadow-2xs transition"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#46b1e1]" />
              <span>Guide</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center">
        <div className="w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-6 sm:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* LEFT COLUMN (50%): Perpetual Chaos + HOLD-to-Dot Cursor */}
            <div className="order-2 lg:order-1 lg:col-span-6 w-full">
              <div className="relative w-full h-[440px] sm:h-[520px] bg-transparent">
                <ChaosCursorCanvas />
              </div>
              <p className="text-center text-[13px] font-semibold text-black mt-2 select-none">
                Gather all boids to reveal the key
              </p>
            </div>

            {/* RIGHT COLUMN (50%): All Home Content */}
            <HomeRightColumn className="order-1 lg:order-2" />
          </div>
        </div>
      </div>
    </div>
  );
};
