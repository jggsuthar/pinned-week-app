'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Pipette, Check, Sparkles } from 'lucide-react';

const CURATED_SWATCHES = [
  '#46b1e1', // Electric Sky Blue
  '#2563eb', // Royal Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#ef4444', // Crimson Red
  '#f59e0b', // Amber Gold
  '#10b981', // Emerald
  '#0c1527', // Deep Ink
];

interface HSV {
  h: number; // 0..360
  s: number; // 0..100
  v: number; // 0..100
}

function normalizeHex(hex: string): string | null {
  const cleaned = hex.trim().replace(/^#/, '');
  if (/^[0-9A-Fa-f]{6}$/.test(cleaned)) {
    return `#${cleaned.toLowerCase()}`;
  }
  if (/^[0-9A-Fa-f]{3}$/.test(cleaned)) {
    const r = cleaned[0] + cleaned[0];
    const g = cleaned[1] + cleaned[1];
    const b = cleaned[2] + cleaned[2];
    return `#${(r + g + b).toLowerCase()}`;
  }
  return null;
}

function hexToHsv(hex: string): HSV {
  const valid = normalizeHex(hex) || '#46b1e1';
  const r = parseInt(valid.slice(1, 3), 16) / 255;
  const g = parseInt(valid.slice(3, 5), 16) / 255;
  const b = parseInt(valid.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : Math.round((d / max) * 100);
  const v = Math.round(max * 100);
  return { h, s, v };
}

function hsvToHex(h: number, s: number, v: number): string {
  const sNorm = Math.max(0, Math.min(100, s)) / 100;
  const vNorm = Math.max(0, Math.min(100, v)) / 100;
  const c = vNorm * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = vNorm - c;

  let r1 = 0,
    g1 = 0,
    b1 = 0;
  if (h < 60) {
    r1 = c;
    g1 = x;
  } else if (h < 120) {
    r1 = x;
    g1 = c;
  } else if (h < 180) {
    g1 = c;
    b1 = x;
  } else if (h < 240) {
    g1 = x;
    b1 = c;
  } else if (h < 300) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }

  const toHex = (val: number) =>
    Math.round((val + m) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`;
}

interface ColorPickerProps {
  color: string;
  onChange: (newHex: string) => void;
  label?: string;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  color,
  onChange,
  label = 'Zone Color',
}) => {
  const [hsv, setHsv] = useState<HSV>(() => hexToHsv(color));
  const [hexDraft, setHexDraft] = useState<string>(color.toUpperCase());
  const spectrumRef = useRef<HTMLDivElement>(null);
  const nativeInputRef = useRef<HTMLInputElement>(null);
  const isDraggingRef = useRef(false);

  // Sync external color changes
  useEffect(() => {
    const norm = normalizeHex(color);
    if (norm && norm.toLowerCase() !== hsvToHex(hsv.h, hsv.s, hsv.v).toLowerCase()) {
      setHsv(hexToHsv(norm));
      setHexDraft(norm.toUpperCase());
    } else if (norm && hexDraft.toLowerCase() !== norm.toLowerCase()) {
      setHexDraft(norm.toUpperCase());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color]);

  const updateFromHsv = useCallback(
    (nextHsv: HSV) => {
      setHsv(nextHsv);
      const nextHex = hsvToHex(nextHsv.h, nextHsv.s, nextHsv.v);
      setHexDraft(nextHex.toUpperCase());
      onChange(nextHex);
    },
    [onChange]
  );

  const handleSpectrumPointer = useCallback(
    (clientX: number, clientY: number) => {
      const el = spectrumRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
      const s = Math.round((x / rect.width) * 100);
      const v = Math.round(100 - (y / rect.height) * 100);
      updateFromHsv({ h: hsv.h, s, v });
    },
    [hsv.h, updateFromHsv]
  );

  const handleHexInputChange = (val: string) => {
    const cleaned = val.startsWith('#') ? val : `#${val}`;
    setHexDraft(cleaned.toUpperCase().slice(0, 7));
    const valid = normalizeHex(cleaned);
    if (valid) {
      setHsv(hexToHsv(valid));
      onChange(valid);
    }
  };

  const pureHueColor = hsvToHex(hsv.h, 100, 100);

  return (
    <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3 w-full max-w-xs">
      {/* Header Preview Row */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className="w-4 h-4 rounded-full border border-slate-200 shadow-xs transition-colors"
            style={{
              backgroundColor: color,
              boxShadow: `0 0 0 3px ${color}25`,
            }}
          />
          <span className="text-[11px] font-bold text-slate-700 font-mono tabular-nums">
            {hexDraft}
          </span>
        </div>
      </div>

      {/* 2D Saturation / Value Spectrum Canvas */}
      <div
        ref={spectrumRef}
        onPointerDown={(e) => {
          isDraggingRef.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          handleSpectrumPointer(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (isDraggingRef.current) {
            handleSpectrumPointer(e.clientX, e.clientY);
          }
        }}
        onPointerUp={() => {
          isDraggingRef.current = false;
        }}
        className="relative w-full h-32 rounded-xl overflow-hidden cursor-crosshair select-none touch-none border border-slate-200/80"
        style={{ backgroundColor: pureHueColor }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to right, #ffffff, rgba(255,255,255,0))',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to top, #000000, rgba(0,0,0,0))',
          }}
        />
        {/* Spectrum Thumb */}
        <div
          className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 border-white shadow-md pointer-events-none transition-transform"
          style={{
            left: `${hsv.s}%`,
            top: `${100 - hsv.v}%`,
            backgroundColor: color,
            boxShadow: '0 0 0 1px rgba(15,23,42,0.35), 0 2px 6px rgba(0,0,0,0.35)',
          }}
        />
      </div>

      {/* Rainbow Hue Slider */}
      <div className="space-y-1">
        <input
          type="range"
          min={0}
          max={359}
          value={hsv.h}
          onChange={(e) =>
            updateFromHsv({ h: parseInt(e.target.value, 10), s: hsv.s, v: hsv.v })
          }
          aria-label="Hue slider"
          className="w-full h-3 rounded-full appearance-none cursor-pointer border border-slate-200/80"
          style={{
            background:
              'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
          }}
        />
      </div>

      {/* Hex Input + Native Eyedropper Button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 flex items-center">
          <div
            className="w-6 h-6 rounded-lg border border-slate-200 shrink-0 mr-2 shadow-xs"
            style={{ backgroundColor: color }}
          />
          <input
            type="text"
            value={hexDraft}
            onChange={(e) => handleHexInputChange(e.target.value)}
            maxLength={7}
            placeholder="#46B1E1"
            className="w-full px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46b1e1] uppercase"
          />
        </div>

        {/* Native System Color Wheel / Pipette Trigger */}
        <button
          type="button"
          onClick={() => nativeInputRef.current?.click()}
          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer shrink-0"
          title="Open system color wheel"
        >
          <Pipette className="w-3.5 h-3.5" />
        </button>
        <input
          ref={nativeInputRef}
          type="color"
          value={normalizeHex(color) || '#46b1e1'}
          onChange={(e) => handleHexInputChange(e.target.value)}
          className="sr-only"
          tabIndex={-1}
        />
      </div>

      {/* Curated Quick Swatches */}
      <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100">
        {CURATED_SWATCHES.map((swatch) => {
          const isSelected = color.toLowerCase() === swatch.toLowerCase();
          return (
            <button
              key={swatch}
              type="button"
              onClick={() => {
                setHsv(hexToHsv(swatch));
                setHexDraft(swatch.toUpperCase());
                onChange(swatch);
              }}
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform cursor-pointer ${
                isSelected ? 'scale-110 ring-2 ring-slate-900 ring-offset-1' : 'hover:scale-110'
              }`}
              style={{ backgroundColor: swatch }}
              title={swatch.toUpperCase()}
            >
              {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
