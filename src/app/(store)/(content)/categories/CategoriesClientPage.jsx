'use client';

import { useMemo, useState } from 'react';
import CategoryPillCard from '@/components/home/CategoryPillCard';
import Link from 'next/link';
import { Search, ArrowLeft, Layers } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { cn } from '@/lib/utils';

export default function CategoriesClientPage({ initialCategories = [] }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return initialCategories;
    const query = searchQuery.toLowerCase().trim();
    return initialCategories.filter((cat) =>
      cat.name?.toLowerCase().includes(query)
    );
  }, [initialCategories, searchQuery]);

  return (
    <div className="relative min-h-screen bg-[#FAF9F6] pb-20">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 xl:px-10 pt-6 md:pt-10">
        {/* Navigation & Header */}
        <div className="mb-8 border-b border-[#E8E5DF] pb-6">
          <div className="mb-4 flex items-center">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-xs font-sans uppercase tracking-[0.2em] font-semibold text-[#737373] hover:text-[#121212] transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              Back to Home
            </Link>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="block text-[11px] font-sans uppercase tracking-[0.24em] text-[#A67C52] font-semibold mb-1">
                Collections
              </span>
              <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl tracking-wide font-normal text-[#121212] uppercase">
                All Categories
              </h1>
            </div>

            {/* Minimal Search Bar */}
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#737373] z-10" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search collections..."
                className="h-10 rounded-none border-[#E8E5DF] bg-white pl-10 pr-4 text-xs tracking-wider uppercase placeholder:normal-case placeholder:tracking-normal focus-visible:border-[#121212] focus-visible:ring-0"
              />
            </div>
          </div>
        </div>

        {/* Categories Grid */}
        {filteredCategories.length === 0 ? (
          <div className="my-16 flex items-center justify-center p-8 bg-white border border-[#E8E5DF]">
            <Empty className="max-w-md py-6">
              <EmptyMedia>
                <div className="size-14 rounded-full bg-[#F4F2EE] flex items-center justify-center text-[#A67C52] mx-auto mb-2">
                  <Layers className="size-6 stroke-[1.5]" />
                </div>
              </EmptyMedia>
              <EmptyTitle className="font-serif text-lg font-normal uppercase tracking-wide text-[#121212]">
                No Collections Found
              </EmptyTitle>
              <EmptyDescription className="text-xs text-[#737373]">
                No collections matching &quot;{searchQuery}&quot;. Try adjusting your search term.
              </EmptyDescription>
            </Empty>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
            {filteredCategories.map((cat, index) => (
              <CategoryPillCard key={cat._id || index} category={cat} index={cat.index ?? index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

