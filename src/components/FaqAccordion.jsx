'use client';

import { useState } from 'react';

// Inline SVG chevron — lighter than lucide import, zero external dependency.
// Uses a single path instead of two <line> elements for smaller DOM.
function ChevronIcon({ open }) {
  return (
    <svg
      className={[
        'size-4 shrink-0 text-primary/70 transition-transform duration-200 ease-out',
        open ? 'rotate-180' : '',
      ].join(' ')}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export default function FaqAccordion({ items }) {
  const [openId, setOpenId] = useState(null);

  return (
    <div className="divide-y divide-border/60">
      {items.map((item, index) => {
        const isOpen = openId === item.id;
        return (
          <div key={item.id}>
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : item.id)}
              aria-expanded={isOpen}
              aria-controls={`faq-answer-${item.id}`}
              className="flex w-full items-start gap-3 py-4 text-left focus-visible:outline-none sm:py-5"
            >
              {/* Number badge */}
              <span
                className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/8 text-[10px] font-bold tabular-nums text-primary/60 mt-0.5"
                aria-hidden="true"
              >
                {String(index + 1).padStart(2, '0')}
              </span>

              {/* Question text */}
              <span className="flex-1 text-[14.5px] font-semibold leading-snug text-foreground sm:text-[15px]">
                {item.question}
              </span>

              {/* Chevron — always visible, rotates on open */}
              <div className="mt-1">
                <ChevronIcon open={isOpen} />
              </div>
            </button>

            {/* Answer — CSS grid trick for smooth height animation */}
            <div
              id={`faq-answer-${item.id}`}
              role="region"
              className="grid transition-all duration-200 ease-out"
              style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
            >
              <div className="overflow-hidden">
                <p className="pb-5 pl-9 pr-2 text-sm leading-relaxed text-muted-foreground sm:text-[14.5px]">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
