'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';

const emptySubscribe = () => () => {};
import { 
  Package,
  MessageSquare,
  ChevronDown,
  ShoppingBag,
  Clock,
  CalendarDays,
  ClipboardCheck,
  Settings,
  Truck,
  MapPin,
  CheckCircle2,
  PackageCheck,
  Star,
  X,
  Camera,
  Copy,
  Check,
  BadgeCheck
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';

import { uploadImageDataUrl } from '@/lib/cloudinaryUpload';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';

const ReviewModal = dynamic(() => import('@/components/ReviewModal'));
import NocTrackingModal from '@/components/NocTrackingModal';
import { normalizeOrderStatus } from '@/lib/order-status';
import { cn } from '@/lib/utils';
import CopyButton from '@/components/CopyButton';

const getOrderStatusDetails = (status) => {
  const norm = normalizeOrderStatus(status);
  switch (norm) {
    case 'Order Confirmed':
      return {
        label: 'Order Confirmed',
        icon: ClipboardCheck,
        svgImage: '/undraw_order-confirmed_m9e9 (1).svg',
        color: 'text-blue-600',
      };
    case 'In Process':
    case 'Packed':
      return {
        label: norm,
        icon: Clock,
        svgImage: '/undraw_processing_bto8.svg',
        color: 'text-amber-600',
      };
    case 'Shipped':
    case 'Out for delivery':
      return {
        label: norm,
        icon: Truck,
        svgImage: '/undraw_delivery-address_409g.svg',
        color: 'text-sky-600',
      };
    case 'Delivered':
      return {
        label: 'Delivered',
        icon: BadgeCheck,
        svgImage: '/undraw_order-delivered_gy61.svg',
        color: 'text-emerald-600',
      };
    case 'Cancelled':
      return {
        label: 'Cancelled',
        icon: X,
        svgImage: null,
        color: 'text-red-500',
      };
    case 'Returned':
      return {
        label: 'Returned',
        icon: CheckCircle2,
        svgImage: null,
        color: 'text-purple-600',
      };
    default:
      return {
        label: norm,
        icon: Package,
        svgImage: '/undraw_order-confirmed_m9e9 (1).svg',
        color: 'text-gray-600',
      };
  }
};

const ProgressTracker = ({ status }) => {
  const steps = [
    { label: 'Order Confirmed', key: 'Order Confirmed', Icon: ClipboardCheck },
    { label: 'In Process', key: 'In Process', Icon: Clock },
    { label: 'Shipped', key: 'Shipped', Icon: Truck },
    { label: 'Delivered', key: 'Delivered', Icon: CheckCircle2 },
  ];
  
  const norm = normalizeOrderStatus(status);
  const isDelivered = norm === 'Delivered';
  
  let currentIndex = 0;
  if (isDelivered) {
    currentIndex = 3;
  } else if (norm === 'Shipped') {
    currentIndex = 2;
  } else if (norm === 'In Process' || norm === 'Packed') {
    currentIndex = 1;
  } else {
    currentIndex = 0; // 'Order Confirmed'
  }
  
  if (norm === 'Cancelled' || norm === 'Returned') {
    return null;
  }
  
  return (
    <div className="relative mt-4 mb-10 w-full max-w-3xl mx-auto md:mx-0">
      <div className="flex items-center justify-between relative z-10 px-2 sm:px-4">
        {/* Background Line */}
        <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-[3px] bg-gray-200 -z-10 rounded-full" />
        {/* Active Line */}
        {currentIndex >= 0 && (
          <div 
            className="absolute left-4 top-1/2 -translate-y-1/2 h-[3px] bg-primary -z-10 rounded-full transition-all duration-700 ease-out" 
            style={{ width: `calc(${isDelivered ? 100 : (currentIndex / (steps.length - 1)) * 100}% - 2rem)` }} 
          />
        )}
        
        {steps.map((step, index) => {
          const isCompleted = isDelivered || index < currentIndex;
          const isActive = !isDelivered && index === currentIndex;
          const StepIcon = step.Icon;
          
          return (
            <div key={step.key} className="relative flex flex-col items-center justify-center">
              
              {isCompleted && (
                <div className="size-[26px] sm:size-[30px] rounded-full bg-primary ring-[3px] ring-white flex items-center justify-center shadow-sm z-10">
                  <StepIcon className="size-3.5 sm:size-4 text-primary-foreground" strokeWidth={2.5} />
                </div>
              )}
              
              {isActive && (
                <div className="flex items-center justify-center bg-white z-10 px-1 sm:px-2">
                  <StepIcon className="size-[22px] sm:size-[26px] text-blue-600 animate-pulse drop-shadow-[0_0_6px_rgba(37,99,235,0.4)]" strokeWidth={2.5} />
                </div>
              )}

              {(!isCompleted && !isActive) && (
                <div className="flex items-center justify-center bg-white z-10 p-1 rounded-full">
                  <div className="size-2.5 rounded-full bg-gray-300 ring-2 ring-white" />
                </div>
              )}

              <span className={cn(
                "absolute top-8 sm:top-10 text-[9px] sm:text-xs font-bold transition-colors duration-500",
                "text-center w-[56px] sm:w-auto leading-[1.1] sm:leading-normal whitespace-normal sm:whitespace-nowrap",
                "hidden min-[360px]:block", // Hide text on extremely small screens (<360px) like old SE
                isCompleted ? "text-gray-900" :
                isActive ? "text-blue-700" : "text-gray-400"
              )}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const DeliveredStamp = ({ className }) => (
  <div className={cn("flex items-center justify-center rotate-[-10deg] pointer-events-none select-none", className)}>
    <div className="relative border-[2.5px] md:border-[4px] border-primary text-primary px-2.5 py-1 md:px-4 md:py-2 rounded-[10px] md:rounded-[14px] flex items-center gap-1.5 md:gap-2 opacity-95 shadow-sm bg-white/60 backdrop-blur-sm">
      <BadgeCheck className="size-4 md:size-6" strokeWidth={2.5} />
      <span className="font-black text-[12px] md:text-[17px] tracking-widest uppercase leading-none mt-0.5" style={{ WebkitTextStroke: '0.5px currentColor' }}>DELIVERED</span>
    </div>
  </div>
);

const TrackingTimeline = ({ order, mounted }) => {
  const steps = [
    { label: 'Order Confirmed', key: 'Order Confirmed' },
    { label: 'In Process', key: 'In Process' },
    { label: 'Packed', key: 'Packed' },
    { label: 'Shipped', key: 'Shipped' },
    { label: 'Out for delivery', key: 'Out For Delivery' },
    { label: 'Delivered', key: 'Delivered' }
  ];
  
  const norm = normalizeOrderStatus(order.status);
  let currentIndex = steps.findIndex(s => s.key === norm);
  const isDelivered = norm === 'Delivered';
  if (isDelivered) currentIndex = 5;
  
  const createdDate = mounted ? new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  const updatedDate = mounted ? new Date(order.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  const getStatusDate = (stepKey, index, isActive, isCompleted) => {
    if (!mounted) return null;
    
    // Look for it in statusHistory if it exists
    if (order.statusHistory && order.statusHistory.length > 0) {
      const historyItem = order.statusHistory.find(h => normalizeOrderStatus(h.status) === stepKey);
      if (historyItem && historyItem.timestamp) {
        return new Date(historyItem.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      }
    }
    
    // Fallbacks if not in history
    if (index === 0) return createdDate;
    if (isActive || (isDelivered && index === 5)) return updatedDate;
    
    return null;
  };

  return (
    <div className="flex flex-col">
      {steps.map((step, index) => {
        const isPast = index < currentIndex;
        const isActive = index === currentIndex;
        const dateToShow = getStatusDate(step.key, index, isActive, isPast);
        const isLast = index === steps.length - 1;

        return (
          <div 
            key={step.key} 
            className="flex gap-5 group animate-in slide-in-from-left-4 fade-in fill-mode-both duration-500"
            style={{ animationDelay: `${index * 150}ms` }}
          >
            {/* Timeline Column */}
            <div className="flex flex-col items-center">
              {/* Dot */}
              <div className="relative mt-1">
                {isActive && (
                  <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                )}
                <div className={cn(
                  "size-3.5 rounded-full z-10 transition-all duration-500 shrink-0 relative",
                  isPast || isDelivered ? "bg-primary shadow-sm ring-4 ring-primary/10" : 
                  isActive ? "bg-white border-[3px] border-primary ring-4 ring-primary/20 scale-110" : "bg-gray-200"
                )} />
              </div>
              {/* Line */}
              {!isLast && (
                <div className={cn(
                  "w-[2px] h-full min-h-[36px] my-1.5 transition-colors duration-500 rounded-full",
                  isPast || (isDelivered && index < 5) ? "bg-primary" : "bg-gray-100"
                )} />
              )}
            </div>
            
            {/* Content Column */}
            <div className="flex flex-col pb-8 pt-0.5">
              <span className={cn(
                "text-[15px] font-bold leading-none tracking-tight transition-colors duration-500",
                isPast || isActive || isDelivered ? "text-gray-900" : "text-gray-400"
              )}>
                {step.label}
              </span>
              {dateToShow && (
                <span className="text-[13px] font-medium text-gray-500 mt-2 flex items-center gap-1.5 animate-in fade-in duration-500">
                  <Clock className="size-3.5 opacity-70" />
                  {dateToShow}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};


export default function OrdersClient({ initialOrders }) {
  const orders = initialOrders || [];
  const activeOrders = orders.filter(o => ['Order Confirmed', 'In Process', 'Packed', 'Shipped', 'Out For Delivery'].includes(normalizeOrderStatus(o.status)));
  const deliveredOrders = orders.filter(o => ['Delivered', 'Returned'].includes(normalizeOrderStatus(o.status)));

  const [activeTab, setActiveTab] = useState(() => (activeOrders.length > 0 ? 'not_shipped' : 'delivered'));
  const [timeFilter, setTimeFilter] = useState('past_3_months');
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [feedbackOrder, setFeedbackOrder] = useState(null);
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [reviewedOrders, setReviewedOrders] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem('reviewedOrders') || '[]');
      } catch {}
    }
    return [];
  });

  const handleFeedbackSuccess = (orderId) => {
    const newReviewed = [...reviewedOrders, orderId];
    setReviewedOrders(newReviewed);
    localStorage.setItem('reviewedOrders', JSON.stringify(newReviewed));
  };

  // Auto-popup logic for delivered orders on visit
  useEffect(() => {
    if (mounted && deliveredOrders.length > 0) {
      try {
        const isDismissAll = localStorage.getItem('feedback_dismiss_all') === 'true';
        if (isDismissAll) return;
      } catch (e) {}

      const unreviewedDeliveredOrder = deliveredOrders.find(order => {
        const isOrderAllReviewed = order.items?.length > 0 && order.items.every(i => i.isReviewed);
        let isRemindLaterThisSession = false;
        let isDismissedPermanently = false;
        try {
          isRemindLaterThisSession = sessionStorage.getItem(`feedback_remind_later_${order.orderId}`) === 'true';
          isDismissedPermanently = localStorage.getItem(`feedback_dismissed_${order.orderId}`) === 'true';
        } catch (e) {}
        
        return !isOrderAllReviewed && !isRemindLaterThisSession && !isDismissedPermanently && !reviewedOrders.includes(order._id);
      });

      if (unreviewedDeliveredOrder && !feedbackOrder && !trackingOrder) {
        const timer = setTimeout(() => {
          setFeedbackOrder(unreviewedDeliveredOrder);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [mounted, deliveredOrders, feedbackOrder, trackingOrder, reviewedOrders]);
  
  const currentYear = new Date().getFullYear();
  const prevYear = currentYear - 1;

  const filteredDeliveredOrders = deliveredOrders.filter(order => {
    if (timeFilter === 'all') return true;
    const orderDate = new Date(order.createdAt || order.updatedAt || 0);
    const now = new Date();
    if (timeFilter === 'past_30_days') {
      return (now.getTime() - orderDate.getTime()) <= 30 * 24 * 60 * 60 * 1000;
    }
    if (timeFilter === 'past_3_months') {
      return (now.getTime() - orderDate.getTime()) <= 90 * 24 * 60 * 60 * 1000;
    }
    if (timeFilter === String(currentYear)) {
      return orderDate.getFullYear() === currentYear;
    }
    if (timeFilter === String(prevYear)) {
      return orderDate.getFullYear() === prevYear;
    }
    if (timeFilter === 'older') {
      return orderDate.getFullYear() < prevYear;
    }
    return true;
  });

  let displayOrders = activeTab === 'not_shipped' ? activeOrders : filteredDeliveredOrders;

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-8 items-start w-full font-sans">
        {/* Left Column (80%) */}
        <div className="w-full lg:flex-1 flex flex-col min-w-0">
          
          <div className="mb-4">
            <h1 className="text-2xl sm:text-[30px] font-bold text-gray-900 tracking-tight">Your Orders</h1>
          </div>

          {/* Tabs Header */}
          <div className="mb-3">
            <div className="grid grid-cols-2 sm:inline-flex p-1 bg-[#F1F3F5] rounded-xl ring-1 ring-black/5 w-full sm:w-auto">
              <button 
                type="button"
                onClick={() => setActiveTab('not_shipped')} 
                className={cn(
                  "flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-[13px] font-semibold rounded-lg transition-all text-center cursor-pointer select-none",
                  activeTab === 'not_shipped' 
                    ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5 font-bold" 
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"
                )}
              >
                Not Yet Shipped
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab('delivered')} 
                className={cn(
                  "flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-[13px] font-semibold rounded-lg transition-all text-center cursor-pointer select-none",
                  activeTab === 'delivered' 
                    ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5 font-bold" 
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"
                )}
              >
                Delivered Orders
              </button>
            </div>
          </div>

          {/* Subtitle Count & Sort Filter Row */}
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="text-xs sm:text-sm text-gray-500 font-medium min-w-0">
              {activeTab === 'not_shipped' ? (
                <span>
                  You have <strong className="text-gray-900 font-semibold">{activeOrders.length} active {activeOrders.length === 1 ? 'order' : 'orders'}</strong>
                </span>
              ) : (
                <span>
                  You have <strong className="text-gray-900 font-semibold">{filteredDeliveredOrders.length} delivered {filteredDeliveredOrders.length === 1 ? 'order' : 'orders'}</strong>
                </span>
              )}
            </div>

            {activeTab === 'delivered' && (
              <div className="shrink-0">
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger className="w-auto min-w-[120px] sm:min-w-[140px] bg-white border border-gray-200/90 font-medium text-[11.5px] sm:text-xs text-gray-700 hover:bg-gray-50/80 focus:ring-0 rounded-lg h-8 px-2.5 shadow-none ring-0">
                    <SelectValue placeholder="Time filter" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="past_30_days" className="font-medium text-xs sm:text-sm">Last 30 Days</SelectItem>
                    <SelectItem value="past_3_months" className="font-medium text-xs sm:text-sm">Past 3 Months</SelectItem>
                    <SelectItem value={String(currentYear)} className="font-medium text-xs sm:text-sm">{currentYear}</SelectItem>
                    <SelectItem value={String(prevYear)} className="font-medium text-xs sm:text-sm">{prevYear}</SelectItem>
                    <SelectItem value="older" className="font-medium text-xs sm:text-sm">Older</SelectItem>
                    <SelectItem value="all" className="font-medium text-xs sm:text-sm">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          {/* Orders List */}
          <div className="flex flex-col gap-6">
            {displayOrders.length > 0 ? displayOrders.map(order => {
              const isDelivered = normalizeOrderStatus(order.status) === 'Delivered';
              const norm = normalizeOrderStatus(order.status);
              const itemCount = order.items.reduce((acc, item) => acc + item.quantity, 0);
              const statusDetails = getOrderStatusDetails(order.status);
              const StatusIcon = statusDetails.icon;
              
              return (
                <div key={order._id} className="rounded-xl border border-gray-200 bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
                  {/* Card Header */}
                  <div className="bg-[#F8F9FA] px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between sm:items-center text-sm gap-4 sm:gap-0 rounded-t-xl">
                    
                    {/* Left Side: Order Placed & Total (PC), Stacked (Mobile) */}
                    <div className="flex flex-row sm:flex-row gap-8 sm:gap-16">
                      <div className="flex flex-col gap-0.5 sm:gap-1">
                        <div className="text-gray-500 uppercase text-[10px] sm:text-[11px] font-bold tracking-widest flex items-center gap-1.5"><CalendarDays className="size-3.5 hidden sm:block" /> Order placed</div>
                        <div className="font-semibold text-gray-900 text-[13px] sm:text-sm">
                          {mounted ? new Date(order.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '---'}
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5 sm:gap-1">
                        <div className="text-gray-500 uppercase text-[10px] sm:text-[11px] font-bold tracking-widest">Total</div>
                        <div className="font-semibold text-gray-900 text-[13px] sm:text-sm">Rs. {mounted ? order.totalAmount.toLocaleString('en-PK') : order.totalAmount}</div>
                      </div>
                    </div>
                    
                    {/* Right Side: Order # and Links */}
                    <div className="flex flex-col sm:items-end gap-1.5 sm:gap-1 pt-3 sm:pt-0 border-t border-gray-200 sm:border-0 mt-1 sm:mt-0">
                      <div className="text-gray-900 font-semibold text-[13px] sm:text-sm flex items-center gap-2">
                        Order # {order.orderId}
                        <CopyButton text={order.orderId} className="size-5 text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors" />
                      </div>
                      <div className="flex items-center gap-3">
                        <Link href={`/orders/${order._id}`} className="text-primary hover:underline font-bold text-[13px]">
                          View order details
                        </Link>
                      </div>
                    </div>
                  </div>
                  
                  {/* Card Body */}
                  <div className="p-6">
                    <div className="mb-6">
                      {isDelivered ? (
                        <div className="flex items-center justify-between gap-3 sm:gap-4">
                          <div className="flex flex-col gap-1 min-w-0">
                            <h3 className="text-[16px] sm:text-[19px] font-bold text-gray-900 tracking-tight leading-tight">
                              Delivered {mounted ? new Date(order.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-500">Your package was delivered successfully.</p>
                          </div>
                          <div className="shrink-0 select-none">
                            <Image
                              src="/undraw_order-delivered_gy61.svg"
                              alt="Delivered"
                              width={90}
                              height={65}
                              className="h-12 sm:h-16 w-auto object-contain"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3 sm:gap-4">
                          <div className="flex flex-col gap-1 min-w-0">
                            <h3 className="text-[15px] sm:text-[19px] font-bold text-gray-900 tracking-tight leading-snug">
                              <span className="block sm:inline text-gray-800">Estimated Delivery</span>
                              <span className="hidden sm:inline sm:mx-1">:</span>
                              <span className="block sm:inline text-gray-900 font-extrabold sm:font-bold">
                                {mounted ? (() => {
                                  const minD = new Date(new Date(order.createdAt).getTime() + 3 * 24 * 60 * 60 * 1000);
                                  const maxD = new Date(new Date(order.createdAt).getTime() + 5 * 24 * 60 * 60 * 1000);
                                  return `${minD.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${maxD.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                                })() : ''}
                              </span>
                            </h3>
                            <p className="text-xs sm:text-sm font-semibold text-gray-600">
                              Currently <span className="text-gray-900 font-bold">{statusDetails.label}</span>
                            </p>
                          </div>
                          {statusDetails.svgImage ? (
                            <div className="shrink-0 select-none">
                              <Image
                                src={statusDetails.svgImage}
                                alt={statusDetails.label}
                                width={90}
                                height={65}
                                className="h-12 sm:h-16 w-auto object-contain"
                              />
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                    
                    {!isDelivered && norm !== 'Cancelled' && norm !== 'Returned' && (
                      <ProgressTracker status={order.status} />
                    )}

                    {/* Order Action Buttons & Summary */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-8 pt-6 border-t border-gray-100">
                      <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
                         <div className="size-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
                            <Package className="size-5 text-gray-400" />
                         </div>
                         <span>{itemCount} Item{itemCount === 1 ? '' : 's'}</span>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto mt-6">
                        {isDelivered ? (
                          <>
                            {((order.items?.length > 0 && order.items.every(i => i.isReviewed)) || reviewedOrders.includes(order._id)) ? (
                              <Button disabled className="bg-gray-100 text-gray-400 rounded-xl h-11 px-6 shadow-none font-semibold w-full sm:w-auto cursor-not-allowed">
                                <CheckCircle2 className="size-4 mr-2 text-emerald-600" />
                                Reviewed
                              </Button>
                            ) : (
                              <Button 
                                onClick={() => setFeedbackOrder(order)}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-11 px-6 shadow-sm font-semibold transition-all active:scale-[0.98] w-full sm:w-auto"
                              >
                                <MessageSquare className="size-4 mr-2" />
                                Give feedback
                              </Button>
                            )}
                          </>
                        ) : (
                          <>
                            <Button render={<Link href={`/orders/${order._id}`} />} nativeButton={false} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-11 px-6 shadow-sm font-semibold transition-all active:scale-[0.98] w-full sm:w-auto">
                              View your items
                            </Button>
                            {(order.nocThirdPartyNo || order.nocParcelNo || order.trackingNumber) ? (
                              <Button 
                                variant="outline" 
                                className="h-11 px-6 rounded-xl border-sky-300 bg-sky-50/60 hover:bg-sky-100 text-sky-700 font-semibold shadow-sm transition-all active:scale-[0.98] w-full sm:w-auto flex items-center gap-2 cursor-pointer"
                                onClick={() => setTrackingOrder(order)}
                              >
                                <Truck className="size-4 text-sky-600" />
                                Track Package
                              </Button>
                            ) : (
                              <Button 
                                variant="outline" 
                                disabled
                                className="h-11 px-6 rounded-xl border-gray-200 bg-gray-50 text-gray-400 font-semibold cursor-not-allowed w-full sm:w-auto flex items-center gap-2"
                                title="Tracking details will activate once dispatched via courier"
                              >
                                <Truck className="size-4" />
                                Track Package (Preparing)
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <Empty className="rounded-2xl border border-dashed border-gray-200 py-16 px-4 bg-white text-center">
                <EmptyHeader>
                  <div className="mx-auto mb-4 flex items-center justify-center">
                    <Image
                      src="/undraw_delivery-address_409g.svg"
                      alt="No orders illustration"
                      width={180}
                      height={140}
                      className="h-auto w-[160px] sm:w-[180px] object-contain opacity-95 select-none"
                    />
                  </div>
                  <EmptyTitle className="text-xl font-bold text-gray-900 mt-2">No orders found</EmptyTitle>
                  <EmptyDescription className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                    {activeTab === 'not_shipped' 
                      ? "You don't have any pending orders currently in progress." 
                      : "You don't have any delivered orders matching this time period."}
                  </EmptyDescription>
                </EmptyHeader>
                <div className="mt-6 flex justify-center">
                  <Button render={<Link href="/products" />} nativeButton={false} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-11 px-6 font-semibold shadow-sm transition-all active:scale-[0.98]">
                    Start Shopping
                  </Button>
                </div>
              </Empty>
            )}
          </div>
        </div>
        
        {/* Right Column (20% Sticky Sidebar) */}
        <div className="w-full lg:w-[280px] xl:w-[320px] shrink-0 pt-0 lg:pt-[72px]">
          <div className="sticky top-24 rounded-2xl border border-gray-200 bg-[#F8F9FA] p-6 shadow-sm flex flex-col">
            <div className="size-12 rounded-xl bg-white ring-1 ring-gray-200/60 shadow-sm flex items-center justify-center mb-5">
               <MessageSquare className="size-6 text-primary" />
            </div>
            <h3 className="text-[17px] font-bold text-gray-900 mb-2">Need help with an order?</h3>
            <p className="text-[13px] text-gray-500 mb-6 leading-relaxed">
              If you have any questions about delivery, tracking, or refunds, our customer support team is available on WhatsApp and email.
            </p>
            <Button render={<Link href="/contact-us" />} nativeButton={false} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-11 font-semibold shadow-sm transition-all active:scale-[0.98]">
              Contact Support
            </Button>
          </div>
        </div>
      </div>

      {/* NOC Tracking Modal */}
      <NocTrackingModal
        open={!!trackingOrder}
        onOpenChange={(open) => !open && setTrackingOrder(null)}
        trackingNumber={trackingOrder?.nocThirdPartyNo || trackingOrder?.nocParcelNo || trackingOrder?.trackingNumber}
        orderId={trackingOrder?.orderId}
        courierName={trackingOrder?.courierName || 'NOC Express'}
        nocLabelUrl={trackingOrder?.nocLabelUrl}
      />
      
      {/* Feedback Modal */}
      {feedbackOrder && (
        <FeedbackModal 
          order={feedbackOrder} 
          onRemindLater={() => {
            try {
              sessionStorage.setItem(`feedback_remind_later_${feedbackOrder.orderId}`, 'true');
            } catch (e) {}
            setFeedbackOrder(null);
          }}
          onDismissPermanently={() => {
            try {
              localStorage.setItem('feedback_dismiss_all', 'true');
              deliveredOrders.forEach(o => {
                if (o.orderId) {
                  localStorage.setItem(`feedback_dismissed_${o.orderId}`, 'true');
                }
              });
            } catch (e) {}
            setFeedbackOrder(null);
          }}
          onClose={() => {
            try {
              localStorage.setItem(`feedback_dismissed_${feedbackOrder.orderId}`, 'true');
            } catch (e) {}
            setFeedbackOrder(null);
          }}
          onSuccess={handleFeedbackSuccess}
        />
      )}
    </>
  );
}

// ------------------------------------------------------------------
// Custom Feedback Modal Component (Per-Product Reviews)
// ------------------------------------------------------------------
const FeedbackModal = ({ order, onRemindLater, onDismissPermanently, onClose, onSuccess }) => {
  const getItemKey = (item, idx) => item._id ? item._id : `${item.productId}-${idx}`;

  // Lock background scroll when review modal is open
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, []);

  // Initialize state for each product in the order
  const [reviews, setReviews] = useState(() => {
    return order.items.reduce((acc, item, idx) => ({
      ...acc,
      [getItemKey(item, idx)]: { rating: 0, hoverRating: 0, text: '', images: [], productId: item.productId }
    }), {});
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const updateReview = (itemKey, field, value) => {
    setReviews(prev => ({
      ...prev,
      [itemKey]: {
        ...prev[itemKey],
        [field]: value
      }
    }));
  };

  const handleImageChange = (itemKey, e) => {
    if (e.target.files) {
      const currentImages = reviews[itemKey].images;
      const selected = Array.from(e.target.files).slice(0, 2 - currentImages.length);
      const newImages = selected.map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }));
      updateReview(itemKey, 'images', [...currentImages, ...newImages].slice(0, 2));
    }
  };

  const removeImage = (itemKey, idx) => {
    const currentImages = reviews[itemKey].images;
    updateReview(itemKey, 'images', currentImages.filter((_, i) => i !== idx));
  };

  const hasAnyRating = Object.values(reviews).some(r => r.rating > 0);

  const fileToDataUrl = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const uploadImages = async (imagesArray) => {
    if (!imagesArray || imagesArray.length === 0) return [];

    const urls = [];
    for (const img of imagesArray) {
      if (img.url && img.url.startsWith('http')) {
        urls.push(img.url);
        continue;
      }
      const dataUrl = img.file ? await fileToDataUrl(img.file) : img.preview;
      if (dataUrl) {
        const uploadResult = await uploadImageDataUrl(dataUrl, 'ornaments_reviews');
        if (uploadResult?.url) {
          urls.push(uploadResult.url);
        }
      }
    }
    return urls;
  };

  const handleSubmit = async () => {
    if (!hasAnyRating) return;
    setIsSubmitting(true);
    
    try {
      for (const itemKey of Object.keys(reviews)) {
        const review = reviews[itemKey];
        if (review.rating > 0) {
          const imageUrls = await uploadImages(review.images);
          
          const res = await fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: review.productId,
              rating: review.rating,
              comment: review.text,
              images: imageUrls,
              orderId: order?.orderId || order?._id,
              secureToken: order?.secureToken,
            })
          });
          
          const data = await res.json();
          if (!res.ok || !data?.success) {
            throw new Error(data?.error || 'Failed to submit review');
          }
        }
      }
      
      setSubmitted(true);
      if (onSuccess) {
        onSuccess(order._id);
      }
      toast.success('Thank you! Review submitted successfully.');
      setTimeout(() => {
        if (onClose) onClose();
        else onDismissPermanently();
      }, 2000);
    } catch (error) {
      toast.error(error.message || 'Something went wrong while submitting review');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-white rounded-3xl w-full max-w-sm p-8 text-center shadow-2xl transform scale-100 animate-in zoom-in-95 duration-300 flex flex-col items-center">
          <div className="mb-4 flex items-center justify-center">
            <Image
              src="/undraw_thumbs-up_f300.svg"
              alt="Thank you for feedback"
              width={140}
              height={110}
              className="h-auto w-[120px] object-contain select-none"
            />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1.5">Thank you!</h2>
          <p className="text-gray-500 text-sm leading-relaxed">Your feedback will help other shoppers make better choices.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90dvh] sm:max-h-[85vh] h-auto animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300 overflow-hidden">
        
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 shrink-0 bg-white z-10 gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">Review your items</h2>
            <p className="text-sm text-gray-500 mt-0.5">Order #{order.orderId} • {order.items.length} {order.items.length === 1 ? 'item' : 'items'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={onDismissPermanently}
              className="text-xs text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer"
              title="Don't ask for reviews on any order again"
            >
              Close All
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="size-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="size-4.5" />
            </button>
          </div>
        </div>

        {/* Scrollable Products List (Mobile & PC) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 overscroll-contain touch-pan-y divide-y divide-gray-100">
          {order.items.map((item, index) => {
            const itemKey = getItemKey(item, index);
            const itemReview = reviews[itemKey];
            
            return (
              <div key={itemKey} className={cn("py-6 first:pt-0 last:pb-0")}>
                {/* Product Info */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative size-12 sm:size-14 rounded-lg bg-gray-100 shrink-0 overflow-hidden border border-gray-200">
                    {item.image ? (
                      <Image src={item.image} alt={item.name} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="size-5 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm line-clamp-1">{item.name}</h4>
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Rate this product</span>
                  </div>
                </div>

                {/* Star Rating */}
                <div className="flex flex-col mb-4">
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => updateReview(itemKey, 'rating', star)}
                        onMouseEnter={() => updateReview(itemKey, 'hoverRating', star)}
                        onMouseLeave={() => updateReview(itemKey, 'hoverRating', 0)}
                        className="transition-transform active:scale-90"
                      >
                        <Star 
                          className={cn(
                            "size-8 sm:size-10 transition-all duration-200",
                            (itemReview.hoverRating || itemReview.rating) >= star 
                              ? "fill-[#facc15] text-[#facc15] drop-shadow-[0_2px_4px_rgba(250,204,21,0.3)]" 
                              : "fill-transparent text-gray-200 hover:text-gray-300"
                          )} 
                          strokeWidth={1.5}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Expanded Section (Text & Images) - Only shows if rated */}
                {itemReview.rating > 0 && (
                  <div className="animate-in slide-in-from-top-2 fade-in duration-300 space-y-4">
                    {/* Text Review */}
                    <div>
                      <textarea 
                        value={itemReview.text}
                        onChange={(e) => updateReview(itemKey, 'text', e.target.value)}
                        placeholder="What did you like or dislike?"
                        className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none h-24 bg-gray-50/50"
                      />
                    </div>

                    {/* Image Upload */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">Add photos (optional)</label>
                        <span className="text-xs text-gray-400">{itemReview.images.length} / 2</span>
                      </div>
                      <div className="flex gap-3">
                        {itemReview.images.map((img, idx) => (
                          <div key={idx} className="relative size-16 sm:size-20 rounded-xl border border-gray-200 overflow-hidden group">
                            <Image src={img.preview} alt={`Upload ${idx+1}`} fill className="object-cover" />
                            <button 
                              onClick={() => removeImage(itemKey, idx)}
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            >
                              <X className="size-5 text-white drop-shadow-md" />
                            </button>
                          </div>
                        ))}
                        
                        {itemReview.images.length < 2 && (
                          <label className="size-16 sm:size-20 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 flex flex-col items-center justify-center cursor-pointer transition-colors text-gray-500">
                            <Camera className="size-5 mb-1 text-gray-400" />
                            <span className="text-[9px] font-bold uppercase tracking-wider">Upload</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              multiple 
                              className="hidden" 
                              onChange={(e) => handleImageChange(itemKey, e)}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex gap-3 mt-auto shrink-0 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:pb-6">
          <Button 
            variant="outline" 
            onClick={onRemindLater}
            className="flex-1 h-12 rounded-xl text-gray-600 font-semibold border-gray-200 hover:bg-gray-100 transition-all"
          >
            Remind me later
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!hasAnyRating || isSubmitting}
            className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="size-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Submitting...
              </span>
            ) : "Submit Reviews"}
          </Button>
        </div>
      </div>
    </div>
  );
};
