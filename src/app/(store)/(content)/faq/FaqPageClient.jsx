'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  X,
  Truck,
  Wallet,
  ShieldCheck,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { CATEGORIES, FULL_FAQS } from '@/lib/faqs';
import { createWhatsAppUrl } from '@/lib/whatsapp';
import { formatStorePhone, resolveStorePhone, storePhoneTelHref } from '@/lib/storeContact';
import WhatsAppIcon from '@/components/icons/WhatsAppIcon';
import { cn } from '@/lib/utils';

const ICON_MAP = {
  Truck: Truck,
  Wallet: Wallet,
  ShieldCheck: ShieldCheck,
  HelpCircle: HelpCircle,
};

export default function FaqPageClient({ whatsappNumber, storeName, pageTitle, pageDescription }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const phone = resolveStorePhone(whatsappNumber);
  const displayPhone = formatStorePhone(phone);
  const whatsappLink = createWhatsAppUrl(phone);

  // Filter FAQs based on search query and selected category
  const filteredFaqs = useMemo(() => {
    return FULL_FAQS.filter((faq) => {
      const matchesCategory = selectedCategory === 'all' || faq.categoryId === selectedCategory;
      const matchesSearch =
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="min-h-screen bg-background pb-20 pt-4 sm:pt-8">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <ChevronRight className="size-3 text-muted-foreground/60" />
          <span className="text-foreground font-medium">FAQ</span>
        </nav>

        {/* ── Hero Header: Minimal, Clean & Optically Aligned ── */}
        <div className="mb-8 flex flex-col-reverse items-center justify-between gap-6 sm:flex-row sm:gap-8 border-b border-border/60 pb-8">
          <div className="w-full text-center sm:text-left sm:max-w-lg space-y-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-primary">
              {pageTitle || 'Frequently Asked Questions'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {pageDescription ||
                'Find quick answers regarding shipping times, delivery charges, replacements, and order tracking.'}
            </p>
          </div>

          <div className="shrink-0 flex items-center justify-center">
            <div className="relative w-28 sm:w-36 md:w-44 aspect-[4/3]">
              <Image
                src="/undraw_questions_52ic.svg"
                alt="Frequently Asked Questions"
                fill
                className="object-contain select-none"
                priority
              />
            </div>
          </div>
        </div>

        {/* ── Search & Category Filter ── */}
        <div className="mb-8 space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search questions or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search frequently asked questions"
              className="w-full rounded-xl border border-border bg-card py-3 pl-11 pr-10 text-xs sm:text-sm outline-none transition-all placeholder:text-muted-foreground/75 focus:border-primary focus:ring-1 focus:ring-primary shadow-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search query"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={cn(
                'shrink-0 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-200 cursor-pointer',
                selectedCategory === 'all'
                  ? 'bg-primary text-primary-foreground shadow-none'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:border-border/80'
              )}
            >
              All FAQs ({FULL_FAQS.length})
            </button>
            {CATEGORIES.map((cat) => {
              const IconComp = ICON_MAP[cat.icon] || HelpCircle;
              const count = FULL_FAQS.filter((f) => f.categoryId === cat.id).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    'shrink-0 whitespace-nowrap flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-200 cursor-pointer',
                    selectedCategory === cat.id
                      ? 'bg-primary text-primary-foreground shadow-none'
                      : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:border-border/80'
                  )}
                >
                  <IconComp className="size-3.5" />
                  <span>
                    {cat.label} ({count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── FAQ Accordion List ── */}
        <div className="space-y-4">
          {filteredFaqs.length > 0 ? (
            <div className="rounded-2xl border border-border bg-card p-2 sm:p-4 shadow-none divide-y divide-border/60">
              <Accordion type="single" collapsible="true" className="w-full">
                {filteredFaqs.map((faq) => (
                  <AccordionItem
                    key={faq.id}
                    value={faq.id}
                    className="border-none px-2 sm:px-4 py-1"
                  >
                    <AccordionTrigger className="w-full py-3.5 sm:py-4 hover:no-underline text-left text-[14.5px] sm:text-base font-semibold text-foreground transition-colors hover:text-primary data-[state=open]:text-primary [&>svg]:size-4 [&>svg]:text-muted-foreground [&>svg]:transition-transform [&>svg]:duration-300 data-[state=open]:[&>svg]:text-primary">
                      <span className="pr-3 leading-snug">{faq.question}</span>
                    </AccordionTrigger>
                    <AccordionContent className="pt-0 pb-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card py-12 px-4 text-center">
              <h3 className="text-base font-bold text-foreground mb-1">
                No matching questions found
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mb-5 px-4">
                We couldn&apos;t find any FAQs matching &ldquo;{searchQuery}&rdquo;. Try using different keywords or reset filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-none transition-all hover:bg-primary/90 cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>

        {/* ── Support / WhatsApp Contact Card ── */}
        <div className="mt-10 rounded-2xl border border-border bg-card p-5 sm:p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-3.5 text-left">
            <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary mt-0.5 sm:mt-0">
              <WhatsAppIcon className="size-5" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                Still have questions?
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Our support team is active Monday to Saturday for fast assistance.
              </p>
            </div>
          </div>

          <div className="flex w-full sm:w-auto flex-col sm:flex-row items-center gap-2.5 shrink-0 pt-1 sm:pt-0">
            <a
              href={storePhoneTelHref(phone)}
              className="w-full sm:w-auto inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2.5 text-xs sm:text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Call {displayPhone}
            </a>
            <a
              href={whatsappLink || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2.5 text-xs sm:text-sm font-semibold shadow-none transition-colors"
            >
              <WhatsAppIcon className="size-4" />
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
