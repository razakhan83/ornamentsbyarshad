'use client';

import Link from 'next/link';
import { Check, ChevronsUpDown, Store, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export default function VendorAssignmentsEditor({
  vendors = [],
  value = [],
  onChange,
  manageHref = '/admin/vendors',
}) {
  const selectedAssignments = Array.isArray(value) ? value : [];

  function upsertVendor(vendorId) {
    const existing = selectedAssignments.find((entry) => entry.vendorId === vendorId);

    if (existing) {
      onChange(selectedAssignments.filter((entry) => entry.vendorId !== vendorId));
      return;
    }

    onChange([
      ...selectedAssignments,
      {
        vendorId,
        vendorProductName: '',
        vendorPrice: '',
      },
    ]);
  }

  function updateAssignment(vendorId, field, fieldValue) {
    onChange(
      selectedAssignments.map((entry) =>
        entry.vendorId === vendorId ? { ...entry, [field]: fieldValue } : entry
      )
    );
  }

  function removeAssignment(vendorId) {
    onChange(selectedAssignments.filter((entry) => entry.vendorId !== vendorId));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Vendors</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Assign vendors, then store the exact name and agreed purchase price used in their WhatsApp list.
          </p>
        </div>
        <Link
          href={manageHref}
          className="shrink-0 text-xs font-semibold text-foreground transition-colors hover:text-foreground/75"
        >
          Manage Vendors
        </Link>
      </div>

      <Popover>
        <PopoverTrigger className="group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground size-8 h-auto min-h-11 w-full justify-between rounded-xl px-4 py-3 text-left">

            <span className="flex min-w-0 items-center gap-2">
              <Store className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-sm font-medium">
                {selectedAssignments.length > 0
                  ? `${selectedAssignments.length} vendor${selectedAssignments.length === 1 ? '' : 's'} assigned`
                  : 'Select one or more vendors'}
              </span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          
</PopoverTrigger>
        <PopoverContent align="start" className="w-[min(92vw,24rem)] p-0">
          <PopoverHeader className="border-b border-border px-3 py-3">
            <PopoverTitle>Assign Vendors</PopoverTitle>
            <PopoverDescription>
              Pick the shops that currently stock this product.
            </PopoverDescription>
          </PopoverHeader>
          <Command>
            <CommandInput placeholder="Search vendors..." />
            <CommandList>
              <CommandEmpty>No vendors found.</CommandEmpty>
              <CommandGroup>
                {vendors.map((vendor) => {
                  const checked = selectedAssignments.some((entry) => entry.vendorId === vendor._id);

                  return (
                    <CommandItem
                      key={vendor._id}
                      value={`${vendor.name} ${vendor.shopNumber || ''}`}
                      data-checked={checked}
                      onSelect={() => upsertVendor(vendor._id)}
                    >
                      <Check className={cn('size-4', checked ? 'opacity-100' : 'opacity-0')} />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-medium">{vendor.name}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {vendor.shopNumber ? `Shop ${vendor.shopNumber}` : 'Shop number not added'}
                        </span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedAssignments.length > 0 ? (
        <div className="flex flex-col gap-3">
          {selectedAssignments.map((assignment) => {
            const vendor = vendors.find((entry) => entry._id === assignment.vendorId);
            if (!vendor) return null;

            return (
              <div
                key={assignment.vendorId}
                className="rounded-xl border border-border bg-muted/35 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{vendor.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {vendor.shopNumber ? `Shop ${vendor.shopNumber}` : 'Shop number not added'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => removeAssignment(assignment.vendorId)}
                    aria-label={`Remove ${vendor.name}`}
                  >
                    <X className="size-4" />
                  </Button>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Vendor&apos;s Product Name
                    </label>
                    <Input
                      value={assignment.vendorProductName || ''}
                      onChange={(event) =>
                        updateAssignment(assignment.vendorId, 'vendorProductName', event.target.value)
                      }
                      placeholder="Exact name from vendor broadcast"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Purchase Price
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={assignment.vendorPrice ?? ''}
                      onChange={(event) =>
                        updateAssignment(assignment.vendorId, 'vendorPrice', event.target.value)
                      }
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Vendor sourcing stays admin-only and is never shown on the public storefront.
        </p>
      )}
    </div>
  );
}
