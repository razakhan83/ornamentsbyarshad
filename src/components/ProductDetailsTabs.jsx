'use client';

import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';

export default function ProductDetailsTabs({ reviewCount, descriptionContent, reviewsContent }) {
  return (
    <div className="mt-6 md:mt-16 w-full max-w-4xl mx-auto px-4 md:px-0">
      <Accordion type="single" defaultValue="description" className="border-t border-border/60">
        {/* Description Accordion Item */}
        <AccordionItem value="description" className="border-b border-border/60">

          <AccordionTrigger className="w-full flex items-center justify-between py-3 md:py-5 text-base md:text-lg font-bold text-foreground hover:text-primary transition-colors hover:no-underline">
            Description
          </AccordionTrigger>
          <AccordionContent className="pb-5 pt-2 text-muted-foreground">
            {descriptionContent}
          </AccordionContent>
        </AccordionItem>

        {/* Reviews Accordion Item */}
        <AccordionItem value="reviews" className="border-b border-border/60">
          <AccordionTrigger className="w-full flex items-center justify-between py-3 md:py-5 text-base md:text-lg font-bold text-foreground hover:text-primary transition-colors hover:no-underline">
            Reviews ({reviewCount})
          </AccordionTrigger>
          <AccordionContent className="pb-5 pt-2">
            {reviewsContent}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}


