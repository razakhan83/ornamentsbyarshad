'use client';

import { cn } from '@/lib/utils';

export default function ProductDescription({ html, className }) {
  if (!html) return null;

  return (
    <div className={cn('pt-1 text-[15px] leading-relaxed text-muted-foreground', className)}>
      <div
        className="[&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_h1]:my-3 [&_h1]:text-2xl [&_h1]:font-black [&_h2]:my-3 [&_h2]:text-xl [&_h2]:font-bold [&_img]:my-4 [&_img]:max-w-full [&_iframe]:aspect-video [&_iframe]:w-full [&_iframe]:rounded-2xl [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_video]:my-4 [&_video]:max-w-full"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

