import React from 'react';

/* ==========================================================================
   Icons
   --------------------------------------------------------------------------
   Inline SVG only. The static build originally used emoji glyphs which render
   as raster images on some platforms — they were replaced with these during
   the design pass and the same shapes are reused here so the two builds look
   identical.
   ========================================================================== */

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true'
};

export const ShieldCheck = ({ size = 16, className = 'pdp-ico-shield' }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base}>
    <path d="M12 3l7 3v5.5c0 4.4-3 8-7 9.5-4-1.5-7-5.1-7-9.5V6l7-3z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

export const Heart = ({ filled = false, size = 20 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} {...base}
       fill={filled ? 'currentColor' : 'none'}>
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z" />
  </svg>
);

export const Bag = ({ size = 20 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} {...base}>
    <path d="M6 7h12l1.5 13.5a1 1 0 0 1-1 1.1H5.5a1 1 0 0 1-1-1.1L6 7z" />
    <path d="M9 10V5.5a3 3 0 0 1 6 0V10" />
  </svg>
);

export const Search = ({ size = 18 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} {...base}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.6-3.6" />
  </svg>
);

export const Close = ({ size = 15 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} {...base} strokeWidth={2}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const ArrowRight = ({ size = 15 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} {...base} strokeWidth={2}>
    <path d="M5 12h13M13 6l6 6-6 6" />
  </svg>
);

export const ArrowLeft = ({ size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} {...base} strokeWidth={2}>
    <path d="M19 12H6M11 6l-6 6 6 6" />
  </svg>
);

export const Check = ({ size = 14 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} {...base} strokeWidth={2.2}>
    <path d="M5 12.5l4.5 4.5L19 7" />
  </svg>
);

export const Star = ({ size = 13, filled = true }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true"
       fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.4">
    <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.8L12 16.9 6.7 19.6l1.1-5.8L3.5 9.7l5.9-.8L12 3.5z" />
  </svg>
);

export const Spinner = ({ size = 18 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className="hunar-spinner" aria-hidden="true">
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.4"
            strokeLinecap="round" strokeDasharray="44" strokeDashoffset="14" />
  </svg>
);
