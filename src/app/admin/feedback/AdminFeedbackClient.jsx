'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  MessageSquare,
  Star,
  Search,
  RefreshCw,
  Trash2,
  Check,
  Clock,
  Archive,
  Mail,
  Phone,
  MessageCircle,
  Eye,
  Lightbulb,
  Sparkles,
  Bug,
  HelpCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

const TYPE_CONFIG = {
  experience: { label: 'Experience', badgeClass: 'bg-muted text-muted-foreground', icon: Sparkles },
  suggestion: { label: 'Suggestion', badgeClass: 'bg-muted text-muted-foreground', icon: Lightbulb },
  'feature-request': { label: 'Feature Request', badgeClass: 'bg-muted text-muted-foreground', icon: Sparkles },
  bug: { label: 'Bug / Issue', badgeClass: 'bg-muted text-muted-foreground', icon: Bug },
  general: { label: 'General', badgeClass: 'bg-muted text-muted-foreground', icon: HelpCircle },
};

function formatCleanPhone(raw) {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('03') && digits.length === 11) {
    return '92' + digits.slice(1);
  }
  if (digits.startsWith('92') && digits.length === 12) {
    return digits;
  }
  return digits;
}

export default function AdminFeedbackClient({
  initialFeedbacks = [],
  summary: initialSummary = {},
  total: initialTotal = 0,
  totalPages: initialTotalPages = 1,
  currentPage: initialPage = 1,
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [feedbacks, setFeedbacks] = useState(initialFeedbacks);
  const [summary, setSummary] = useState(initialSummary);
  const [total, setTotal] = useState(initialTotal);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [currentPage, setCurrentPage] = useState(initialPage);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');

  const [loadingAction, setLoadingAction] = useState(false);
  const [activeFeedback, setActiveFeedback] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Fetch / Refresh data
  const fetchData = async (page = 1) => {
    try {
      setLoadingAction(true);
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('limit', '25');
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (ratingFilter !== 'all') params.set('rating', ratingFilter);

      const res = await fetch(`/api/admin/feedback?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setFeedbacks(data.items || []);
        setSummary(data.summary || {});
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setCurrentPage(data.page || 1);
      } else {
        toast.error(data.error || 'Failed to fetch feedback');
      }
    } catch {
      toast.error('Network error fetching feedback');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    fetchData(1);
  };

  const updateFeedbackStatus = async (id, newStatus) => {
    try {
      setLoadingAction(true);
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Feedback marked as ${newStatus}`);
        setFeedbacks((prev) =>
          prev.map((fb) => (fb._id === id ? { ...fb, status: newStatus } : fb))
        );
        if (activeFeedback && activeFeedback._id === id) {
          setActiveFeedback((prev) => ({ ...prev, status: newStatus }));
        }
        startTransition(() => {
          router.refresh();
        });
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch {
      toast.error('Network error updating status');
    } finally {
      setLoadingAction(false);
    }
  };

  const deleteFeedback = async (id) => {
    try {
      setLoadingAction(true);
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Feedback deleted successfully');
        setFeedbacks((prev) => prev.filter((fb) => fb._id !== id));
        if (activeFeedback && activeFeedback._id === id) {
          setActiveFeedback(null);
        }
        setDeleteConfirmId(null);
        startTransition(() => {
          router.refresh();
        });
      } else {
        toast.error(data.error || 'Failed to delete feedback');
      }
    } catch {
      toast.error('Network error deleting feedback');
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="admin-page-stack">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <p className="admin-page-kicker">Feedback</p>
          <h1 className="admin-page-title">Website Feedback</h1>
          <p className="admin-page-subtitle">
            Visitor ratings, shopping experience feedback, suggestions, and bug reports.
          </p>
        </div>
      </div>

      {/* KPI Stats Cards - Compact & Monochrome */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="admin-surface rounded-[0.5rem] border border-border/60 p-3 sm:p-3.5 transition-colors hover:border-border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] sm:text-[12px] font-medium text-muted-foreground line-clamp-1">Total Feedback</p>
              <h3 className="mt-0.5 text-lg sm:text-2xl font-bold tracking-[-0.02em] text-foreground tabular-nums">
                {summary.totalAll ?? total}
              </h3>
            </div>
            <MessageSquare className="size-4 text-muted-foreground shrink-0 mt-0.5" />
          </div>
        </div>

        <div className="admin-surface rounded-[0.5rem] border border-border/60 p-3 sm:p-3.5 transition-colors hover:border-border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] sm:text-[12px] font-medium text-muted-foreground line-clamp-1">New / Unread</p>
              <h3 className="mt-0.5 text-lg sm:text-2xl font-bold tracking-[-0.02em] text-foreground tabular-nums">
                {summary.newCount ?? 0}
              </h3>
            </div>
            <Clock className="size-4 text-muted-foreground shrink-0 mt-0.5" />
          </div>
        </div>

        <div className="admin-surface rounded-[0.5rem] border border-border/60 p-3 sm:p-3.5 transition-colors hover:border-border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] sm:text-[12px] font-medium text-muted-foreground line-clamp-1">Average Rating</p>
              <h3 className="mt-0.5 text-lg sm:text-2xl font-bold tracking-[-0.02em] text-foreground tabular-nums">
                {summary.avgRating ?? '5.0'}
              </h3>
            </div>
            <Star className="size-4 text-muted-foreground shrink-0 mt-0.5" />
          </div>
        </div>

        <div className="admin-surface rounded-[0.5rem] border border-border/60 p-3 sm:p-3.5 transition-colors hover:border-border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] sm:text-[12px] font-medium text-muted-foreground line-clamp-1">Suggestions & Bugs</p>
              <h3 className="mt-0.5 text-lg sm:text-2xl font-bold tracking-[-0.02em] text-foreground tabular-nums">
                {(summary.typeCounts?.suggestion || 0) + (summary.typeCounts?.['feature-request'] || 0) + (summary.typeCounts?.bug || 0)}
              </h3>
            </div>
            <Lightbulb className="size-4 text-muted-foreground shrink-0 mt-0.5" />
          </div>
        </div>
      </section>

      {/* Search & Filter Shell */}
      <form
        onSubmit={handleSearchSubmit}
        className="admin-filter-shell flex flex-col gap-3 md:flex-row md:items-center"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, contact, comment, or suggestion..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setTimeout(() => fetchData(1), 50);
            }}
            aria-label="Filter by Status"
            className="h-9 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All Statuses</option>
            <option value="new">New ({summary.newCount ?? 0})</option>
            <option value="read">Read</option>
            <option value="archived">Archived</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setTimeout(() => fetchData(1), 50);
            }}
            aria-label="Filter by Topic"
            className="h-9 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All Topics</option>
            <option value="experience">Experience</option>
            <option value="suggestion">Suggestion</option>
            <option value="feature-request">Feature Request</option>
            <option value="bug">Bug / Issue</option>
            <option value="general">General</option>
          </select>

          {/* Rating Filter */}
          <select
            value={ratingFilter}
            onChange={(e) => {
              setRatingFilter(e.target.value);
              setTimeout(() => fetchData(1), 50);
            }}
            aria-label="Filter by Rating"
            className="h-9 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>

          <Button type="submit" size="sm" className="h-9 text-xs font-semibold">
            Search
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchData(currentPage)}
            disabled={loadingAction || isPending}
            className="h-9 gap-1.5 text-xs font-semibold"
            title="Refresh list"
          >
            <RefreshCw className={cn('size-3.5', (loadingAction || isPending) && 'animate-spin')} />
            Refresh
          </Button>

          {(statusFilter !== 'all' || typeFilter !== 'all' || ratingFilter !== 'all' || searchTerm.trim()) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter('all');
                setTypeFilter('all');
                setRatingFilter('all');
                setSearchTerm('');
                setTimeout(() => fetchData(1), 50);
              }}
              className="h-9 text-xs text-muted-foreground hover:text-foreground"
            >
              Reset
            </Button>
          )}
        </div>
      </form>

      {/* Main Table Surface */}
      <div className={cn('admin-surface overflow-hidden rounded-[1.2rem] transition-opacity', (isPending || loadingAction) && 'opacity-70')}>
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[180px]">Visitor</TableHead>
              <TableHead className="w-[110px]">Rating</TableHead>
              <TableHead className="w-[130px]">Topic</TableHead>
              <TableHead>Comment & Suggestion</TableHead>
              <TableHead className="w-[160px]">Contact</TableHead>
              <TableHead className="w-[130px]">Date</TableHead>
              <TableHead className="text-right w-[140px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {feedbacks.length > 0 ? (
              feedbacks.map((item) => {
                const typeInfo = TYPE_CONFIG[item.type] || TYPE_CONFIG.experience;
                const cleanPhone = formatCleanPhone(item.contact);
                const isEmail = item.contact?.includes('@');

                return (
                  <TableRow
                    key={item._id}
                    id={`feedback-${item._id}`}
                    className={cn(
                      'transition-colors hover:bg-muted/30',
                      item.status === 'new' && 'bg-emerald-50/30 dark:bg-emerald-950/10 font-medium'
                    )}
                  >
                    {/* Visitor Name & Status Badge */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-foreground">
                          {(item.name || 'V').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                            {item.name || 'Visitor'}
                            {item.status === 'new' ? (
                              <Badge className="h-4 bg-green-100 text-green-700 hover:bg-green-100 border-none px-1.5 text-[10px] uppercase tracking-wider animate-pulse">
                                New
                              </Badge>
                            ) : item.status === 'archived' ? (
                              <Badge className="h-4 bg-muted text-muted-foreground hover:bg-muted border-none px-1.5 text-[10px] uppercase tracking-wider">
                                Archived
                              </Badge>
                            ) : (
                              <Badge className="h-4 bg-muted/60 text-muted-foreground border-none px-1.5 text-[10px] uppercase tracking-wider">
                                Read
                              </Badge>
                            )}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Star Rating */}
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }, (_, index) => (
                          <Star
                            key={index}
                            className={cn(
                              'size-3',
                              index < (item.rating || 5)
                                ? 'fill-foreground text-foreground'
                                : 'text-muted/40'
                            )}
                          />
                        ))}
                      </div>
                    </TableCell>

                    {/* Topic Badge */}
                    <TableCell>
                      <Badge className={cn('h-5 border-none px-2 text-[10px] font-semibold uppercase tracking-wider', typeInfo.badgeClass)}>
                        {typeInfo.label}
                      </Badge>
                    </TableCell>

                    {/* Message & Suggestions */}
                    <TableCell>
                      <div className="space-y-1 max-w-[340px]">
                        <p className="truncate text-sm text-foreground" title={item.message}>
                          {item.message}
                        </p>
                        {item.suggestions && (
                          <p className="truncate text-xs text-muted-foreground flex items-center gap-1" title={item.suggestions}>
                            <Lightbulb className="size-3 text-amber-500 shrink-0" />
                            <span>{item.suggestions}</span>
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Contact info with WhatsApp link */}
                    <TableCell>
                      {item.contact ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {cleanPhone && !isEmail ? (
                            <a
                              href={`https://wa.me/${cleanPhone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                            >
                              <MessageCircle className="size-3.5 text-emerald-600 shrink-0" />
                              <span className="truncate max-w-[120px]">{item.contact}</span>
                            </a>
                          ) : isEmail ? (
                            <a
                              href={`mailto:${item.contact}`}
                              className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline"
                            >
                              <Mail className="size-3.5 shrink-0" />
                              <span className="truncate max-w-[120px]">{item.contact}</span>
                            </a>
                          ) : (
                            <span className="truncate max-w-[120px]">{item.contact}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/60 italic">—</span>
                      )}
                    </TableCell>

                    {/* Date */}
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="size-3 shrink-0" />
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                          onClick={() => setActiveFeedback(item)}
                          title="View Full Feedback"
                        >
                          <Eye className="size-4" />
                          <span className="sr-only">View full feedback</span>
                        </Button>

                        {item.status === 'new' ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-green-600 hover:bg-green-50 hover:text-green-700"
                            onClick={() => updateFeedbackStatus(item._id, 'read')}
                            disabled={loadingAction}
                            title="Mark as Read"
                          >
                            <Check className="size-4" />
                            <span className="sr-only">Mark as Read</span>
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:bg-muted"
                            onClick={() => updateFeedbackStatus(item._id, 'new')}
                            disabled={loadingAction}
                            title="Mark as New"
                          >
                            <Clock className="size-4" />
                            <span className="sr-only">Mark as New</span>
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setDeleteConfirmId(item._id)}
                          disabled={loadingAction}
                          title="Delete Feedback"
                        >
                          <Trash2 className="size-4" />
                          <span className="sr-only">Delete feedback</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <MessageSquare className="size-6 text-muted-foreground/40" />
                    <p className="text-sm font-medium">No feedback found</p>
                    <p className="text-xs text-muted-foreground/70">
                      When visitors submit feedback, suggestions, or ratings, they will appear here.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
          <span>
            Page {currentPage} of {totalPages} ({total} entries)
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchData(currentPage - 1)}
              disabled={currentPage <= 1 || loadingAction}
              className="h-8 px-2.5 text-xs"
            >
              <ChevronLeft className="size-3.5 mr-1" />
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchData(currentPage + 1)}
              disabled={currentPage >= totalPages || loadingAction}
              className="h-8 px-2.5 text-xs"
            >
              Next
              <ChevronRight className="size-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {activeFeedback && (
        <Dialog open={!!activeFeedback} onOpenChange={(open) => !open && setActiveFeedback(null)}>
          <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden rounded-2xl">
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star
                      key={index}
                      className={cn(
                        'size-4',
                        index < (activeFeedback.rating || 5)
                          ? 'fill-foreground text-foreground'
                          : 'text-muted/40'
                      )}
                    />
                  ))}
                </div>
                <Badge className={cn('h-5 border-none px-2 text-[10px] font-semibold uppercase tracking-wider', (TYPE_CONFIG[activeFeedback.type] || TYPE_CONFIG.experience).badgeClass)}>
                  {(TYPE_CONFIG[activeFeedback.type] || TYPE_CONFIG.experience).label}
                </Badge>
              </div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Feedback Details
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Submitted on {new Date(activeFeedback.createdAt).toLocaleString('en-GB')}
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="p-3.5 rounded-xl bg-muted/40 border space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Sender</span>
                  <span className="font-semibold text-foreground">{activeFeedback.name || 'Anonymous Visitor'}</span>
                </div>
                {activeFeedback.contact && (
                  <div className="flex items-center justify-between pt-1 border-t">
                    <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Contact</span>
                    <span className="font-medium text-foreground">{activeFeedback.contact}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t">
                  <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Status</span>
                  <span className="font-bold uppercase text-[10px] tracking-wider px-2 py-0.5 rounded bg-background border">
                    {activeFeedback.status}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Feedback Message
                </label>
                <div className="p-3.5 rounded-xl bg-background border text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {activeFeedback.message}
                </div>
              </div>

              {activeFeedback.suggestions && (
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    What to add / Suggestion
                  </label>
                  <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/60 text-sm text-foreground leading-relaxed">
                    {activeFeedback.suggestions}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="p-4 border-t bg-muted/20 flex flex-row items-center justify-between gap-2">
              {activeFeedback.contact && formatCleanPhone(activeFeedback.contact) ? (
                <a
                  href={`https://wa.me/${formatCleanPhone(activeFeedback.contact)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  <MessageCircle className="size-3.5" />
                  Reply on WhatsApp
                </a>
              ) : <div />}

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateFeedbackStatus(activeFeedback._id, activeFeedback.status === 'read' ? 'new' : 'read')}
                  className="text-xs"
                >
                  {activeFeedback.status === 'read' ? 'Mark as New' : 'Mark as Read'}
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => setActiveFeedback(null)}
                  className="text-xs"
                >
                  Close
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Delete Feedback?</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                This action cannot be undone. This feedback entry will be permanently removed.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex items-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmId(null)}
                className="text-xs rounded-lg"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteFeedback(deleteConfirmId)}
                className="text-xs rounded-lg"
              >
                Delete Permanently
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
