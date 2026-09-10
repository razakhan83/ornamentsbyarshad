'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useLinkStatus } from 'next/link';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { cn } from '@/lib/utils';

function PaginationLinkInner({ pageKey, label, onPendingChange }) {
  const { pending } = useLinkStatus();

  useEffect(() => {
    if (!onPendingChange) return undefined;
    onPendingChange(pageKey, pending);
    return () => onPendingChange(pageKey, false);
  }, [onPendingChange, pageKey, pending]);

  return (
    <span className="relative grid h-full w-full place-items-center leading-none">
      <span className={cn('transition-opacity duration-150', pending ? 'opacity-0' : 'opacity-100')}>
        {label}
      </span>
      <span className="pointer-events-none absolute inset-0 grid place-items-center">
        <Loader2
          className={cn(
            'size-4 animate-spin transition-opacity duration-150',
            pending ? 'opacity-100' : 'opacity-0',
          )}
        />
      </span>
    </span>
  );
}

function PaginationAnchor({
  href,
  disabled = false,
  active = false,
  label,
  className,
  kind = 'page',
  pageKey,
  onPendingChange,
}) {
  const content = (
    <PaginationLinkInner pageKey={pageKey} label={label} onPendingChange={onPendingChange} />
  );

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={cn(
          kind === 'page'
            ? 'inline-flex size-8 items-center justify-center rounded-lg border border-border bg-background p-0 text-sm font-medium text-muted-foreground opacity-50'
            : 'inline-flex h-8 min-w-16 items-center justify-center rounded-lg border border-border/80 bg-muted px-2 text-sm font-semibold text-foreground/80 opacity-50',
          'pointer-events-none text-center leading-none',
          className,
        )}
      >
        {content}
      </span>
    );
  }

  const linkRender = <Link href={href} prefetch={false} scroll={false} />;

  if (kind === 'previous') {
    return (
      <PaginationPrevious
        render={linkRender}
        className={cn(
          'min-w-16 border border-border/80 bg-muted px-2 text-center font-semibold text-foreground shadow-sm hover:border-primary/30 hover:bg-primary/10 hover:text-primary',
          className,
        )}
      >
        {content}
      </PaginationPrevious>
    );
  }

  if (kind === 'next') {
    return (
      <PaginationNext
        render={linkRender}
        className={cn(
          'min-w-16 border border-border/80 bg-muted px-2 text-center font-semibold text-foreground shadow-sm hover:border-primary/30 hover:bg-primary/10 hover:text-primary',
          className,
        )}
      >
        {content}
      </PaginationNext>
    );
  }

  return (
    <PaginationLink
      render={linkRender}
      isActive={active}
      className={cn('size-8 items-center justify-center p-0 text-center leading-none tabular-nums', className)}
    >
      {content}
    </PaginationLink>
  );
}

export default function AppPagination({
  page = 1,
  totalPages = 1,
  getHref,
  onPendingChange,
  className,
}) {
  if (totalPages <= 1) return null;

  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter((current) => current === 1 || current === totalPages || Math.abs(current - page) <= 1);
  const pageItems = [];

  pageNumbers.forEach((pageNumber, index) => {
    if (index > 0 && pageNumber - pageNumbers[index - 1] > 1) {
      pageItems.push({ type: 'ellipsis', key: `ellipsis-${pageNumbers[index - 1]}-${pageNumber}` });
    }

    pageItems.push({ type: 'page', key: `page-${pageNumber}`, pageNumber });
  });

  return (
    <Pagination className={className}>
      <PaginationContent className="items-center">
        <PaginationItem>
          <PaginationAnchor
            href={getHref(Math.max(1, page - 1))}
            disabled={page <= 1}
            label="Prev"
            kind="previous"
            pageKey={`page-${page - 1}`}
            onPendingChange={onPendingChange}
          />
        </PaginationItem>

        {pageItems.map((item) => {
          if (item.type === 'ellipsis') {
            return (
              <PaginationItem key={item.key}>
                <PaginationEllipsis />
              </PaginationItem>
            );
          }

          return (
            <PaginationItem key={item.key}>
              <PaginationAnchor
                href={getHref(item.pageNumber)}
                active={item.pageNumber === page}
                label={String(item.pageNumber)}
                className="font-semibold"
                pageKey={`page-${item.pageNumber}`}
                onPendingChange={onPendingChange}
              />
            </PaginationItem>
          );
        })}

        <PaginationItem>
          <PaginationAnchor
            href={getHref(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            label="Next"
            kind="next"
            pageKey={`page-${page + 1}`}
            onPendingChange={onPendingChange}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
