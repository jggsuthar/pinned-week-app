'use client';

import React, { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ExternalLink,
  Mail,
  Search,
  X,
} from 'lucide-react';
import toolIconImg from '../../../Assets/tool-pws.jpg';

type GuideCategory =
  | 'All'
  | 'Core Concept'
  | 'Step 1: Zones'
  | 'Step 2: Pipelines'
  | 'Step 3: Capacity'
  | 'Step 4: Poster'
  | 'FAQ';

interface GuideItem {
  id: string;
  category: Exclude<GuideCategory, 'All'>;
  question: string;
  answer: string;
  highlights?: string[];
  keywords: string;
}

const CATEGORIES: GuideCategory[] = [
  'All',
  'Core Concept',
  'Step 1: Zones',
  'Step 2: Pipelines',
  'Step 3: Capacity',
  'Step 4: Poster',
  'FAQ',
];

const GUIDE_ITEMS: GuideItem[] = [
  // CORE CONCEPT
  {
    id: 'core-what',
    category: 'Core Concept',
    question: 'What is the Pinned Week System (PWS)?',
    answer:
      'Instead of replanning your week from scratch every Sunday, PWS locks in one repeatable weekly schedule engineered around your real-life hours. You assign recurring work blocks to production stages so publishing becomes automatic without burnout.',
    keywords: 'pws pinned week system overview repeatable routine burnout',
  },
  {
    id: 'core-cohorts',
    category: 'Core Concept',
    question: 'What do Week N-4, Week N-3, Week N-2, and Week N-1 mean?',
    answer:
      'Every stage stays at least 1 week ahead of the next stage. In any given week you might publish Video #1 (Week N-1), edit Video #2 (Week N-2), shoot Video #3 (Week N-3), and script Video #4 (Week N-4)—eliminating same-week upload panic.',
    highlights: ['Week N-4: Ideate / Script', 'Week N-3: Shoot / Record', 'Week N-2: Edit', 'Week N-1: Publish'],
    keywords: 'cohort week n-1 n-2 n-3 n-4 lead time stagger buffer loop',
  },
  {
    id: 'core-storage',
    category: 'Core Concept',
    question: 'Where is my schedule saved? Do I need an account?',
    answer:
      'Everything runs locally inside your browser and auto-saves offline using IndexedDB—zero login required. You can download a .json backup anytime from Step 4 and reload it later using Import JSON on the Home page.',
    keywords: 'save offline indexeddb account privacy backup import export json',
  },

  // STEP 1: ZONES
  {
    id: 's1-modes',
    category: 'Step 1: Zones',
    question: 'Simple Mode vs. Custom Zones Mode — which should I pick?',
    answer:
      'Use Custom Zones Mode (Recommended) if different tasks need specific rooms or gear (e.g., Home Studio for filming, Office Desk for scripting). Choose Simple Mode if you do everything in one place and want the entire day treated as a single General Zone.',
    keywords: 'simple mode custom zones general zone step 1',
  },
  {
    id: 's1-slots',
    category: 'Step 1: Zones',
    question: 'How do Continuous Working Slots work without clock timestamps?',
    answer:
      'Instead of fragile 9:00 AM – 11:30 AM alarms, you simply allocate continuous blocks in 15-minute chunks (like a 2h block on Tuesday). You can have multiple blocks per day, resize them with -15m / +15m, or merge adjacent blocks of the same zone.',
    keywords: 'continuous working slot 15m chunks blocks timestamps merge resize',
  },
  {
    id: 's1-locked',
    category: 'Step 1: Zones',
    question: 'Why is "Add Continuous working slot" disabled in Custom Zones Mode?',
    answer:
      'Every working slot must belong to a zone. In Custom Zones Mode, create at least one zone first using New Zone (with your custom name and spectrum/hex color), and the slot builder unlocks immediately.',
    keywords: 'disabled button cannot add working slot custom zone create first',
  },

  // STEP 2: PIPELINES
  {
    id: 's2-pipeline',
    category: 'Step 2: Pipelines',
    question: 'What is a Content Pipeline and why is its name limited to 10 characters?',
    answer:
      'A Content Pipeline is one publishing format (e.g., YouTube, Shorts, Podcast, Newsletter) made of ordered workflow stages. Keeping names concise (max 10 chars) keeps your final Pinned Week Poster clean and readable without text clipping.',
    highlights: ['Rounded-square icon = Content Pipeline', 'Circular icon = Workflow Stage'],
    keywords: 'content pipeline 10 characters label icon stage order step 2',
  },
  {
    id: 's2-batching',
    category: 'Step 2: Pipelines',
    question: 'How do Batching Groups (Setup Rigs) save time across pipelines?',
    answer:
      'Assign stages that share equipment or mental context (like "Shooting" 15m or "Editing" 10m) to the same Batching Group. Whenever tasks in the same group run back-to-back inside one continuous slot—even across different pipelines—the setup penalty is charged only ONCE. Naming a stage like "Shoot" auto-matches the "Shooting" group.',
    keywords: 'batching group setup rig penalty cross pipeline auto recognize amortization',
  },
  {
    id: 's2-split-friction',
    category: 'Step 2: Pipelines',
    question: 'What do Continuous vs. Split and Friction (Low / Med / High) do?',
    answer:
      'Continuous stages (like filming on camera) must stay unbroken inside a single slot. Split stages (like editing or scripting) can divide across available gaps down to your chosen minimum chunk size. Higher Friction prioritizes batching multiple units together.',
    keywords: 'split continuous chunk size friction resistance low med high',
  },

  // STEP 3: CAPACITY
  {
    id: 's3-math',
    category: 'Step 3: Capacity',
    question: 'How are Zone Utilization, Setup Overhead, and Saved Time calculated?',
    answer:
      'Under every zone, you see the exact receipt: Work + Setup Paid = Total Used. Setup Saved equals what setup would cost if every unit ran alone ((Units × Group Setup) − Actual Setup Paid).',
    keywords: 'calculation math setup saved batched formula utilization progress bar step 3',
  },
  {
    id: 's3-cap-lock',
    category: 'Step 3: Capacity',
    question: 'Why does the "+" button lock and stop me from adding more content?',
    answer:
      'Step 3 enforces a strict capacity guardrail so you never design an impossible schedule. When adding +1 piece would overflow a zone or lack a long enough unbroken slot, the "+" button locks and shows the exact limiting zone reason.',
    keywords: 'lock max capacity + button disabled slider limit bottleneck overloaded',
  },
  {
    id: 's3-swaps',
    category: 'Step 3: Capacity',
    question: 'What does "Auto-Balanced Across Zones" mean?',
    answer:
      'If a stage has multiple Eligible Zones (for example, Script allowed in Studio or Office) and Studio fills up, the solver automatically shifts that flexible stage to Office to free room for Studio-only tasks.',
    keywords: 'auto balanced smart swap eligible zones relocation step 3',
  },

  // STEP 4: POSTER & EXPORT
  {
    id: 's4-views',
    category: 'Step 4: Poster',
    question: 'Pinned Week Poster vs. Weekly Checklist — what is the difference?',
    answer:
      'Pinned Week Poster gives a 7-day grid with zone-colored left edges (including rotated zone names) and zone-wise Free Slack bifurcation—ideal to print or save as wallpaper. Weekly Checklist switches to a clean interactive to-do view with large fonts and completion tracking.',
    keywords: 'pinned week poster weekly checklist free slack zone color rotated edge step 4',
  },
  {
    id: 's4-export-reset',
    category: 'Step 4: Poster',
    question: 'How do I download PNG, back up JSON, or reset the app?',
    answer:
      'In Step 4, click Download PNG (top bar or bottom footer) for a crisp high-res image, or Export JSON beside it to save your setup file. To wipe everything and start fresh, click Reset in the top header (requires double confirmation).',
    keywords: 'download png export json reset double confirmation step 4',
  },

  // FAQ
  {
    id: 'faq-not-batching',
    category: 'FAQ',
    question: 'Why did two tasks in the same Batching Group pay setup twice?',
    answer:
      'Cross-pipeline or multi-unit setup amortization only happens when tasks fit back-to-back inside a single continuous Step 1 slot. If two 1h tasks + 15m setup need 2h 15m but your daily blocks are only 2h long, extend one Step 1 block by +15m or mark a stage as Split.',
    keywords: 'faq setup double twice not batching slot length continuous fit',
  },
  {
    id: 'faq-overloaded',
    category: 'FAQ',
    question: 'It says "Over Capacity — Action Needed" after I edited Step 1 or Step 2. How do I fix it?',
    answer:
      'If you shortened a Step 1 block or increased stage durations in Step 2, existing targets may no longer fit. Go to Step 3 and tap "−" on the highlighted pipeline, or expand the limiting zone hours in Step 1.',
    keywords: 'faq over capacity overloaded reduce expand step 1 fix error',
  },
];

export default function GuidePage() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<GuideCategory>('All');
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({
    'core-what': true,
    'core-cohorts': true,
  });

  const searchInputRef = useRef<HTMLInputElement>(null);

  const trimmedQuery = query.trim().toLowerCase();

  const filteredItems = useMemo(() => {
    return GUIDE_ITEMS.filter((item) => {
      const matchesCat =
        activeCategory === 'All' || item.category === activeCategory;
      if (!matchesCat) return false;
      if (!trimmedQuery) return true;
      const haystack =
        `${item.category} ${item.question} ${item.answer} ${item.keywords} ${(item.highlights || []).join(' ')}`.toLowerCase();
      return haystack.includes(trimmedQuery);
    });
  }, [activeCategory, trimmedQuery]);

  const toggleItem = (id: string) => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchInputRef.current?.focus();
    // Auto-expand all matching items on explicit Search submit
    const nextOpen: Record<string, boolean> = {};
    for (const item of filteredItems) nextOpen[item.id] = true;
    setOpenIds(nextOpen);
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    for (const item of filteredItems) next[item.id] = true;
    setOpenIds(next);
  };

  const collapseAll = () => {
    setOpenIds({});
  };

  return (
    <main className="pws-bg-atmosphere min-h-screen flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 group"
            title="Back to PWS Designer"
          >
            <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-white border border-slate-200/80 shadow-xs shrink-0 group-hover:border-[#46b1e1] transition-colors">
              <Image
                src={toolIconImg}
                alt="PWS Designer"
                fill
                sizes="36px"
                className="object-contain p-0.5"
              />
            </div>
            <span className="font-[900] text-sm tracking-tight text-[#0a0f1d] group-hover:text-[#46b1e1] transition-colors">
              PWS Designer
            </span>
          </Link>

          <div className="flex items-center gap-2.5">
            <a
              href="https://jaiminsuthar.com/tools"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:border-[#46b1e1] hover:text-slate-900 transition"
            >
              <span>All Tools</span>
              <ExternalLink className="w-3 h-3 text-[#46b1e1]" />
            </a>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold text-white bg-[#0c1527] hover:bg-slate-800 transition shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#46b1e1]" />
              <span>Back to App</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Compact Guide Container */}
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 flex-1 space-y-6">
        {/* Compact Title + Search Bar Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-glow p-5 sm:p-7 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#46b1e1]">
                <BookOpen className="w-3.5 h-3.5" />
                <span>PWS REFERENCE GUIDE</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-[900] text-[#0a0f1d] tracking-tight mt-0.5">
                How Pinned Week Designer Works
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                Quick, complete answers to every feature, formula, and workflow question.
              </p>
            </div>
          </div>

          {/* Interactive Search Bar + Search Button */}
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search guide (e.g., batching, Week N-3, Simple mode, setup saved, PNG)..."
                className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#46b1e1] text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/70"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0c1527] hover:bg-slate-800 text-white text-xs font-extrabold uppercase tracking-wider shadow-xs transition cursor-pointer shrink-0"
            >
              <Search className="w-3.5 h-3.5 text-[#46b1e1]" />
              <span>Search</span>
            </button>
          </form>

          {/* Category Filter Pills + Expand/Collapse */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {CATEGORIES.map((cat) => {
                const active = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${
                      active
                        ? 'bg-[#0c1527] text-white border-[#0c1527] shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
              <button
                type="button"
                onClick={expandAll}
                className="hover:text-[#46b1e1] cursor-pointer"
              >
                Expand all
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={collapseAll}
                className="hover:text-[#46b1e1] cursor-pointer"
              >
                Collapse all
              </button>
            </div>
          </div>
        </div>

        {/* Structured Q&A Accordion List */}
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center space-y-2">
            <p className="text-sm font-bold text-slate-800">
              No matching topics for &ldquo;{query}&rdquo;
            </p>
            <p className="text-xs text-slate-500">
              Try searching for terms like <strong>batching</strong>, <strong>Simple mode</strong>,{' '}
              <strong>Week N-4</strong>, or <strong>setup saved</strong>.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setActiveCategory('All');
              }}
              className="mt-2 inline-flex items-center px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
            >
              Show All Topics
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredItems.map((item) => {
              // Automatically open matching items while searching so answers are immediately visible
              const isOpen = trimmedQuery.length > 0 || !!openIds[item.id];

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition hover:border-slate-300"
                >
                  <button
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    aria-expanded={isOpen}
                    className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="px-2 py-0.5 rounded-md bg-sky-50 text-[#0c1527] border border-sky-200/70 text-[10px] font-extrabold shrink-0">
                        {item.category}
                      </span>
                      <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                        {item.question}
                      </span>
                    </div>

                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-[#46b1e1]' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-4 pt-1 border-t border-slate-100 text-xs sm:text-[13px] text-slate-600 leading-relaxed space-y-2.5">
                      <p>{item.answer}</p>
                      {item.highlights && item.highlights.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {item.highlights.map((h) => (
                            <span
                              key={h}
                              className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] font-bold text-slate-700"
                            >
                              {h}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Minimal Help / Support Strip */}
        <div className="rounded-2xl bg-white border border-slate-200/80 px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-[#46b1e1] shrink-0" />
            <span>
              Still have a question or feedback? Reach out at{' '}
              <a
                href="mailto:jaimin@jaiminsuthar.com"
                className="font-bold text-slate-800 hover:text-[#46b1e1] underline underline-offset-2"
              >
                jaimin@jaiminsuthar.com
              </a>
            </span>
          </div>

          <Link
            href="/"
            className="font-extrabold text-[#46b1e1] hover:underline shrink-0"
          >
            Open PWS Designer &rarr;
          </Link>
        </div>
      </div>
    </main>
  );
}
