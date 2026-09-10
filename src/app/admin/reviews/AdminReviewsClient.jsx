'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Calendar, ChevronLeft, ChevronRight, MessageSquare, Package, Search, Star, Trash2, Check, Eye, X, Image as ImageIcon, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import AppPagination from '@/components/AppPagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

function buildHref(pathname, searchParams, updates) {
  const params = new URLSearchParams(searchParams?.toString());

  Object.entries(updates).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  });

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export default function AdminReviewsClient({
  initialReviews,
  total,
  totalPages,
  currentPage,
  initialSearchQuery,
  summary,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [reviews, setReviews] = useState(initialReviews);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [loadingId, setLoadingId] = useState(null);
  const [togglingHomeId, setTogglingHomeId] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const [viewReview, setViewReview] = useState(null);

  useEffect(() => {
    setReviews(initialReviews);
  }, [initialReviews]);

  useEffect(() => {
    setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  useEffect(() => {
    const id = searchParams.get('id');
    if (!id) return undefined;

    setHighlightedId(id);

    const scrollTimer = setTimeout(() => {
      const element = document.getElementById(`review-${id}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);

    const clearTimer = setTimeout(() => {
      setHighlightedId(null);
    }, 3000);

    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [searchParams]);

  function navigate(updates) {
    const href = buildHref(pathname, searchParams, updates);
    startTransition(() => {
      router.push(href);
    });
  }

  async function handleToggleShowOnHome(id, currentShowOnHome) {
    const nextShowOnHome = !currentShowOnHome;
    setTogglingHomeId(id);

    // Optimistic UI update
    setReviews((prev) =>
      prev.map((r) =>
        r._id === id
          ? { ...r, showOnHome: nextShowOnHome, ...(nextShowOnHome ? { status: 'Approved', isApproved: true } : {}) }
          : r
      )
    );
    if (viewReview && viewReview._id === id) {
      setViewReview((prev) => ({
        ...prev,
        showOnHome: nextShowOnHome,
        ...(nextShowOnHome ? { status: 'Approved', isApproved: true } : {}),
      }));
    }

    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, showOnHome: nextShowOnHome }),
      });

      const data = await res.json();
      if (!data.success) {
        // Revert optimistic update
        setReviews((prev) =>
          prev.map((r) => (r._id === id ? { ...r, showOnHome: currentShowOnHome } : r))
        );
        if (viewReview && viewReview._id === id) {
          setViewReview((prev) => ({ ...prev, showOnHome: currentShowOnHome }));
        }
        toast.error(data.error || 'Failed to update home review showcase');
        return;
      }

      toast.success(data.message || (nextShowOnHome ? 'Featured on Home' : 'Removed from Home'));
      router.refresh();
    } catch {
      setReviews((prev) =>
        prev.map((r) => (r._id === id ? { ...r, showOnHome: currentShowOnHome } : r))
      );
      toast.error('An error occurred while updating review');
    } finally {
      setTogglingHomeId(null);
    }
  }

  async function handleStatusChange(id, status) {
    setLoadingId(id);

    try {
      const res = await fetch(`/api/admin/reviews`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });

      const data = await res.json();

      if (!data.success) {
        toast.error(data.message || 'Status update failed');
        return;
      }

      setReviews((prev) => 
        prev.map((review) =>
          review._id === id
            ? {
                ...review,
                status,
                isApproved: status === 'Approved',
                ...(status === 'Rejected' ? { showOnHome: false } : {}),
              }
            : review
        )
      );
      toast.success(`Review ${status.toLowerCase()} successfully`);
      router.refresh();
      
      // If modal is open for this review, update its status too
      if (viewReview && viewReview._id === id) {
         setViewReview(prev => ({
           ...prev,
           status,
           isApproved: status === 'Approved',
           ...(status === 'Rejected' ? { showOnHome: false } : {}),
         }));
      }
    } catch (error) {
      toast.error('An error occurred while updating the review');
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="admin-page-stack">
      <div className="admin-page-header">
        <div>
          <p className="admin-page-kicker">Feedback</p>
          <h1 className="admin-page-title">Reviews</h1>
          <p className="admin-page-subtitle">Track ratings, feature customer reviews on Home (up to 10), and manage feedback.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="admin-stat-card border-none shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground">Total Reviews</CardDescription>
            <CardTitle className="text-3xl font-bold text-foreground">{summary.totalReviews}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MessageSquare className="size-3" />
              <span>All feedback</span>
            </div>
          </CardContent>
        </Card>

        <Card className="admin-stat-card border-none shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground">Home Showcase</CardDescription>
            <CardTitle className="text-3xl font-bold text-primary flex items-baseline gap-1.5">
              <span>{summary.featuredReviews ?? 0}</span>
              <span className="text-sm font-normal text-muted-foreground">/ 10 featured</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="size-3 text-primary" />
              <span>Active on Home</span>
            </div>
          </CardContent>
        </Card>

        <Card className="admin-stat-card border-none shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground">Average Rating</CardDescription>
            <CardTitle className="text-3xl font-bold text-foreground">{summary.averageRating.toFixed(1)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Star className="size-3 fill-foreground text-foreground" />
              <span>Store average</span>
            </div>
          </CardContent>
        </Card>

        <Card className="admin-stat-card border-none shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground">Recent (7 Days)</CardDescription>
            <CardTitle className="text-3xl font-bold text-foreground">{summary.recentReviews}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="size-3" />
              <span>Last 7 days</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <form
        className="admin-filter-shell flex flex-col gap-4 md:flex-row md:items-center"
        onSubmit={(event) => {
          event.preventDefault();
          navigate({ search: searchQuery.trim() || null, page: null });
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by user, comment, or product..."
            className="pl-10"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
      </form>

      <div className={cn('admin-surface overflow-hidden rounded-[1.2rem] transition-opacity', isPending && 'opacity-70')}>
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[180px]">User</TableHead>
              <TableHead className="w-[110px]">Rating</TableHead>
              <TableHead>Comment</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="w-[140px] text-center">Home Showcase</TableHead>
              <TableHead className="w-[130px]">Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <TableRow
                  key={review._id}
                  id={`review-${review._id}`}
                  className={cn(
                    'transition-all duration-700',
                    highlightedId === review._id ? 'bg-muted ring-1 ring-border' : 'hover:bg-muted/30',
                  )}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex size-7 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-foreground">
                        {review.userName?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                          {review.userName}
                          {review.status === 'Approved' || (review.isApproved && review.status !== 'Rejected') ? (
                            <Badge className="h-4 bg-green-100 text-green-700 hover:bg-green-100 border-none px-1.5 text-[10px] uppercase tracking-wider">Approved</Badge>
                          ) : review.status === 'Rejected' ? (
                            <Badge className="h-4 bg-red-100 text-red-700 hover:bg-red-100 border-none px-1.5 text-[10px] uppercase tracking-wider">Rejected</Badge>
                          ) : (
                            <Badge className="h-4 bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-none px-1.5 text-[10px] uppercase tracking-wider">Pending</Badge>
                          )}
                          {(highlightedId === review._id || review.status === 'Pending' || (!review.status && !review.isApproved)) && (
                            <Badge className="h-4 animate-pulse bg-foreground px-1 text-[10px] uppercase tracking-wider text-background">
                              New
                            </Badge>
                          )}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }, (_, index) => (
                        <Star
                          key={index}
                          className={cn('size-3', index < review.rating ? 'fill-foreground text-foreground' : 'text-muted/40')}
                        />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="max-w-[280px] truncate text-sm text-foreground" title={review.comment}>
                      {review.comment || <span className="italic text-muted-foreground">No comment</span>}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 max-w-[180px]">
                      <Package className="size-3 shrink-0 text-muted-foreground" />
                      <span className="truncate text-xs font-medium text-muted-foreground">
                        {review.productId?.Name || 'Deleted Product'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleShowOnHome(review._id, Boolean(review.showOnHome))}
                      disabled={togglingHomeId === review._id}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all border cursor-pointer",
                        review.showOnHome
                          ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 shadow-xs"
                          : "bg-muted/40 border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                      title={review.showOnHome ? "Featured on Home (Click to remove)" : "Click to feature on Home"}
                    >
                      <Sparkles className={cn("size-3", review.showOnHome ? "fill-primary text-primary" : "text-muted-foreground")} />
                      <span>{review.showOnHome ? "Featured" : "Show on Home"}</span>
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="size-3" />
                      {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                        onClick={() => setViewReview(review)}
                        title="View Full Review"
                      >
                        <Eye className="size-4" />
                        <span className="sr-only">View review</span>
                      </Button>
                      
                      {review.status !== 'Approved' && (!review.isApproved || review.status === 'Rejected') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-green-600 hover:bg-green-50 hover:text-green-700"
                          onClick={() => handleStatusChange(review._id, 'Approved')}
                          disabled={loadingId === review._id}
                          title="Approve Review"
                        >
                          <Check className="size-4" />
                          <span className="sr-only">Approve review</span>
                        </Button>
                      )}
                      {review.status !== 'Rejected' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleStatusChange(review._id, 'Rejected')}
                          disabled={loadingId === review._id}
                          title="Reject Review"
                        >
                          <X className="size-4" />
                          <span className="sr-only">Reject review</span>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-72 text-center py-8">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Image
                      src="/undraw_polaroid_qqdz.svg"
                      alt="No reviews illustration"
                      width={160}
                      height={120}
                      className="h-auto w-[140px] sm:w-[160px] object-contain opacity-90 select-none"
                    />
                    <p className="font-semibold text-foreground text-sm">No reviews found</p>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      Customer reviews and attached photo feedback will appear here as orders get fulfilled.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col gap-3 px-2">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{((currentPage - 1) * 12) + 1}</span> to{' '}
            <span className="font-medium text-foreground">{Math.min(currentPage * 12, total)}</span> of{' '}
            <span className="font-medium text-foreground">{total}</span> reviews
          </p>
          <AppPagination
            page={currentPage}
            totalPages={totalPages}
            getHref={(page) => buildHref(pathname, searchParams, { page })}
          />
        </div>
      )}

      <Dialog open={!!viewReview} onOpenChange={() => setViewReview(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Details</DialogTitle>
          </DialogHeader>
          {viewReview && (
            <div className="flex flex-col gap-5 pt-4 font-sans">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-muted font-bold text-foreground">
                    {viewReview.userName?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold">{viewReview.userName}</p>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={cn("size-3", i < viewReview.rating ? "fill-foreground text-foreground" : "text-muted/40")} />
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  {viewReview.status === 'Approved' || (viewReview.isApproved && viewReview.status !== 'Rejected') ? (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none uppercase tracking-wider">Approved</Badge>
                  ) : viewReview.status === 'Rejected' ? (
                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none uppercase tracking-wider">Rejected</Badge>
                  ) : (
                    <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-none uppercase tracking-wider">Pending</Badge>
                  )}
                </div>
              </div>

              {/* Home Page Showcase Toggle */}
              <div className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/30 p-4">
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="size-4 text-primary" />
                    Feature on Home Showcase
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Highlight this customer testimonial on the storefront home page (max 10).
                  </p>
                </div>
                <Switch
                  checked={Boolean(viewReview.showOnHome)}
                  disabled={togglingHomeId === viewReview._id}
                  onCheckedChange={() => handleToggleShowOnHome(viewReview._id, Boolean(viewReview.showOnHome))}
                />
              </div>
              
              <div className="rounded-xl bg-muted/40 p-4 border text-sm">
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                  {viewReview.comment || <span className="italic text-muted-foreground">No text comment provided</span>}
                </p>
              </div>
              
              {viewReview.images && viewReview.images.length > 0 && (
                <div>
                  <h4 className="mb-3 font-semibold text-sm flex items-center gap-2"><ImageIcon className="size-4" /> Attached Images</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {viewReview.images.map((img, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border bg-muted/20">
                        {/* Use standard img tag for external user uploaded images to avoid Next.js domain config errors if cloudinary domain isn't fully configured */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt={`Review attachment ${idx + 1}`} className="object-cover w-full h-full" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                {viewReview.status !== 'Approved' && (!viewReview.isApproved || viewReview.status === 'Rejected') && (
                   <Button onClick={() => handleStatusChange(viewReview._id, 'Approved')} disabled={loadingId === viewReview._id} className="bg-green-600 hover:bg-green-700 text-white">
                     <Check className="size-4 mr-2"/> Approve
                   </Button>
                )}
                {viewReview.status !== 'Rejected' && (
                   <Button onClick={() => handleStatusChange(viewReview._id, 'Rejected')} disabled={loadingId === viewReview._id} variant="destructive">
                     <X className="size-4 mr-2"/> Reject
                   </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
