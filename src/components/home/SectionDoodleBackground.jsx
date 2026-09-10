'use client';

import { useId, useMemo } from 'react';

const DOODLE_PATHS = {
  'new-arrivals': [
    "M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83",
    "M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z",
    "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
  ],
  'special-offers': [
    "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z M7 7h.01",
    "M19 5L5 19M9 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm10 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0z",
    "M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0"
  ],
  'kitchen': [
    "M11 14h2a2 2 0 1 0 0-4h-3c-2.2 0-4-1.8-4-4V2M15 2v4c0 2.2 1.8 4 4 4h3",
    "M4 8h16M5 8v8a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4V8M9 4h6v4H9z",
    "M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"
  ],
  'electronics': [
    "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    "M5 2h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z M12 18h.01",
    "M4 6h16v12H4z M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2 M12 14v4 M10 18h4"
  ],
  'home-decor': [
    "M20 9v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9 M9 22V12h6v10 M2 10.6L12 2l10 8.6",
    "M12 2v20 M17 5c0 3-5 5-5 5s-5-2-5-5a5 5 0 0 1 10 0z M12 10c0 3 5 5 5 5s5-2 5-5a5 5 0 0 0-10 0z",
    "M4 4h16v16H4z M4 8h16 M4 16h16 M8 4v16 M16 4v16"
  ],
  'fashion': [
    "M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z",
    "M12 4a2 2 0 0 0-2 2c0 2 2 2 2 4v2 M7 16l5-4 5 4 M4 20h16",
    "M2 12a5 5 0 0 0 5 5 5 5 0 0 0 5-5 5 5 0 0 0 5 5 5 5 0 0 0 5-5H2z"
  ],
  'health-beauty': [
    "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
    "M12 2a4 4 0 0 1 4 4v12a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z M8 10h8",
    "M7 21h10 M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4 M10 15V7a2 2 0 0 1 4 0v8"
  ],
  'toys-games': [
    "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z",
    "M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10z M12 2v20 M2 12h20",
    "M2 12h5v-5h10v5h5"
  ],
  'sports-fitness': [
    "M18 14v4h4v-4h-4zM2 14v4h4v-4H2zM6 16h12M14 6v4h4V6h-4zM6 6v4h4V6H6zM10 8h4",
    "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    "M5 3L19 17 M5 17L19 3"
  ],
  'pet-supplies': [
    "M12 2a3 3 0 0 0-3 3v2h6V5a3 3 0 0 0-3-3zM5 10a3 3 0 0 0-3 3v2h14v-2a3 3 0 0 0-3-3H5zm10 8v2a3 3 0 0 1-6 0v-2h6z",
    "M22 12l-6-6-4 4 6 6z M2 12l6 6 4-4-6-6z M12 16v6",
    "M3 10h18l-2 10H5L3 10z"
  ],
  'automotive': [
    "M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2m10 0h-4M7 17h4M5.5 17A2.5 2.5 0 1 1 8 19.5 2.5 2.5 0 0 1 5.5 17zM15.5 17A2.5 2.5 0 1 1 18 19.5 2.5 2.5 0 0 1 15.5 17z",
    "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
    "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 22V12 M12 12L3.5 17 M12 12l8.5 5 M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
  ],
  'travel-outdoor': [
    "M7 6h10v14H7z M10 6V4a2 2 0 0 1 4 0v2 M7 10h10 M7 14h10 M9 20v2 M15 20v2",
    "M2 20L12 4l10 16H2z M12 4v16 M8 13l4-3 4 3",
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 5l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"
  ],
  'cosmetics-accessories': [
    "M16 2c2 0 4 2 4 4 0 3-4 6-4 6L6 22 2 18l10-10s3-4 6-4z M12 8l4 4",
    "M4 8h16v12H4z M8 8V5a2 2 0 0 1 4 0v3 M16 8V5a2 2 0 0 0-4 0 M4 14h16 M10 8v12 M14 8v12",
    "M12 2a5 5 0 0 0-5 5c0 2.5 1.8 4.6 4 4.9V22h2v-10.1c2.2-.3 4-2.4 4-4.9a5 5 0 0 0-5-5z M12 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"
  ],
  'stationery': [
    "M18 6L14 2 2 14v4h4L18 6z M14 2l4 4 M2 14l4 4",
    "M6 2h14v20H6z M6 6h4 M6 10h4 M6 14h4 M6 18h4 M14 6h4 M14 10h4",
    "M10 2v15a4 4 0 0 0 8 0V5a3 3 0 0 0-6 0v11a2 2 0 0 0 4 0V6"
  ],
  'default': [
    "M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm1-13h-2v4H7v2h4v4h2v-4h4v-2h-4z",
    "M22 12h-4l-3 9L9 3l-3 9H2",
    "M2 12h20 M12 2v20 M5 5l14 14 M19 5L5 19"
  ],
};

function getCategoryDoodlePath(label) {
  const lower = (label || '').toLowerCase();
  if (lower.includes('new') || lower.includes('arrival')) return DOODLE_PATHS['new-arrivals'];
  if (lower.includes('special') || lower.includes('offer') || lower.includes('deal') || lower.includes('sale')) return DOODLE_PATHS['special-offers'];
  if (lower.includes('kitchen') || lower.includes('pot') || lower.includes('pan') || lower.includes('cook')) return DOODLE_PATHS['kitchen'];
  if (lower.includes('electronic') || lower.includes('gadget') || lower.includes('tech') || lower.includes('appliance')) return DOODLE_PATHS['electronics'];
  if (lower.includes('home') || lower.includes('decor') || lower.includes('furniture') || lower.includes('living')) return DOODLE_PATHS['home-decor'];
  if (lower.includes('fashion') || lower.includes('cloth') || lower.includes('shirt') || lower.includes('wear')) return DOODLE_PATHS['fashion'];
  if (lower.includes('cosmetic') || lower.includes('organize') || lower.includes('accessor')) return DOODLE_PATHS['cosmetics-accessories'];
  if (lower.includes('health') || lower.includes('beauty') || lower.includes('makeup') || lower.includes('care')) return DOODLE_PATHS['health-beauty'];
  if (lower.includes('toy') || lower.includes('game') || lower.includes('kid')) return DOODLE_PATHS['toys-games'];
  if (lower.includes('sport') || lower.includes('fitness') || lower.includes('gym')) return DOODLE_PATHS['sports-fitness'];
  if (lower.includes('pet') || lower.includes('dog') || lower.includes('cat')) return DOODLE_PATHS['pet-supplies'];
  if (lower.includes('auto') || lower.includes('car')) return DOODLE_PATHS['automotive'];
  if (lower.includes('travel') || lower.includes('outdoor')) return DOODLE_PATHS['travel-outdoor'];
  if (lower.includes('stationery') || lower.includes('school') || lower.includes('office') || lower.includes('pen') || lower.includes('book')) return DOODLE_PATHS['stationery'];
  return DOODLE_PATHS['default'];
}

export default function SectionDoodleBackground({ categoryLabel }) {
  const baseId = useId();
  const patternId = `doodle-${baseId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const pathData = useMemo(() => getCategoryDoodlePath(categoryLabel), [categoryLabel]);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-[0.045] md:opacity-[0.055]">
       <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
         <defs>
           <pattern 
              id={patternId} 
              x="0" 
              y="0" 
              width="140" 
              height="140" 
              patternUnits="userSpaceOnUse" 
              patternTransform="rotate(15)"
            >
              {/* Main doodle (Item 1) */}
              <g stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" transform="scale(1.6) translate(15, 10)">
                <path d={pathData[0]} />
              </g>
              
              {/* Secondary rotated doodle (Item 2) */}
              <g stroke="currentColor" fill="none" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" transform="scale(1) translate(90, 60) rotate(-25)">
                <path d={pathData[1]} />
              </g>
              
              {/* Tertiary small doodle (Item 3) */}
              <g stroke="currentColor" fill="none" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" transform="scale(1.2) translate(15, 80) rotate(45)">
                <path d={pathData[2]} />
              </g>
              
              {/* Abstract decorative elements */}
              <circle cx="110" cy="20" r="3" fill="currentColor" opacity="0.5" />
              <circle cx="30" cy="110" r="2" fill="currentColor" opacity="0.3" />
              <path d="M 60 90 Q 65 85 70 90 T 80 90" stroke="currentColor" fill="none" strokeWidth="1" opacity="0.4" />
           </pattern>
         </defs>
         <rect x="0" y="0" width="100%" height="100%" fill={`url(#${patternId})`} className="text-primary" />
       </svg>
    </div>
  );
}
