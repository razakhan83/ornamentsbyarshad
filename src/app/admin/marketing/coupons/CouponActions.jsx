'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuGroup,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

export function CouponActions({ couponId }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/coupons/${couponId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      
      if (response.ok && result.success) {
        toast.success('Coupon deleted successfully');
        router.refresh();
      } else {
        toast.error(result.message || 'Failed to delete coupon');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0" disabled={isDeleting}>
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href={`/admin/marketing/coupons/edit/${couponId}`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
