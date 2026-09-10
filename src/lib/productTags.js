import { Clock, Flame, Truck, Star, Zap, Gift } from 'lucide-react';

export const PRODUCT_TAGS = [
    {
        id: 'limited-stock',
        label: 'Limited Stock',
        icon: Clock,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-100/50'
    },
    {
        id: 'hot-selling',
        label: 'Hot Selling',
        icon: Flame,
        color: 'text-rose-600',
        bgColor: 'bg-rose-50',
        borderColor: 'border-rose-100/50'
    },
    {
        id: 'free-shipping',
        label: 'Free Shipping',
        icon: Truck,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-100/50'
    },
    {
        id: 'top-rated',
        label: 'Top Rated',
        icon: Star,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-100/50'
    },
    {
        id: 'new-arrival',
        label: 'New Arrival',
        icon: Zap,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-100/50'
    },
    {
        id: 'special-offer',
        label: 'Special Offer',
        icon: Gift,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-100/50'
    }
];

export const getProductTagById = (id) => {
    return PRODUCT_TAGS.find(tag => tag.id === id);
};
