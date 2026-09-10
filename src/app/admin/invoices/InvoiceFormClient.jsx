'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Plus,
  Trash2,
  Save,
  Send,
  Search,
  PackagePlus,
  Loader2,
  X,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  createInvoiceAction,
  updateInvoiceAction,
  getCustomerPreviousBalanceAction,
} from '@/app/actions/invoice.actions';
import QuickAddProductModal from '@/components/admin/QuickAddProductModal';
import { PAKISTAN_CITIES } from '@/lib/cities';

// Priority + alphabetical list of allowed Pakistan cities
const POPULAR_CITIES = [
  'Karachi',
  'Lahore',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Hyderabad',
  'Peshawar',
  'Quetta',
  'Gujranwala',
  'Sialkot',
  'Sukkur',
  'Bahawalpur',
  'Sargodha',
  'Larkana',
  'Abbottabad',
];

const ALL_ALLOWED_CITIES = Array.from(
  new Set([
    ...POPULAR_CITIES,
    ...PAKISTAN_CITIES.map((c) => {
      const trimmed = c.trim();
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    }),
  ])
);

// ─── Searchable City Dropdown ──────────────────────────────────────────────────
function CitySelectDropdown({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const wrapperRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const filteredCities = useMemo(() => {
    if (!filter.trim()) return ALL_ALLOWED_CITIES;
    const q = filter.trim().toLowerCase();
    return ALL_ALLOWED_CITIES.filter((c) => c.toLowerCase().includes(q));
  }, [filter]);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-9 px-3 rounded-lg border border-zinc-200 text-xs bg-white flex items-center justify-between outline-none focus:border-emerald-500 text-left transition-colors"
      >
        <span className={value ? 'font-semibold text-zinc-900' : 'text-zinc-400'}>
          {value || 'Select City...'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-[300] left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-none max-h-52 flex flex-col divide-y divide-zinc-100">
          {/* Quick search input */}
          <div className="p-2 bg-zinc-50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search city..."
                className="w-full h-8 pl-7 pr-2 rounded-lg border border-zinc-200 text-xs outline-none bg-white focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Cities list */}
          <div className="overflow-y-auto max-h-36 divide-y divide-zinc-50">
            {filteredCities.length === 0 ? (
              <div className="px-3 py-3 text-xs text-zinc-400 text-center">No city found</div>
            ) : (
              filteredCities.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => {
                    onChange(city);
                    setIsOpen(false);
                    setFilter('');
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-emerald-50 transition-colors ${
                    value === city ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-zinc-700'
                  }`}
                >
                  <span>{city}</span>
                  {POPULAR_CITIES.includes(city) && (
                    <span className="text-[9px] font-medium text-zinc-400 uppercase">Popular</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Product Search Cell ──────────────────────────────────────────────────────
// Uses position:fixed + getBoundingClientRect so the dropdown escapes
// table overflow:hidden and appears ABOVE the input row.
function ProductSearchCell({ item, idx, onSelect, onUpdate, onOpenQuickAdd }) {
  const [query, setQuery] = useState(item.name || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dropStyle, setDropStyle] = useState({});
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Sync query when item.name changes externally (e.g. after product select)
  useEffect(() => {
    setQuery(item.name || '');
  }, [item.name]);

  // Click outside → close
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Calculate fixed position ABOVE the input
  const calcDropStyle = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const DROPDOWN_H = 240; // max height of dropdown
    const GAP = 4;
    setDropStyle({
      position: 'fixed',
      left: rect.left,
      width: Math.max(rect.width, 280),
      // "bottom" in fixed = distance from bottom of viewport
      bottom: window.innerHeight - rect.top + GAP,
      maxHeight: DROPDOWN_H,
      zIndex: 9999,
    });
  }, []);

  const fetchProducts = useCallback(async (q) => {
    setIsLoading(true);
    try {
      const url = q.trim()
        ? `/api/products?search=${encodeURIComponent(q.trim())}&limit=8`
        : `/api/products?limit=8`;
      const res = await fetch(url);
      const data = await res.json();
      setSuggestions(data?.data?.slice(0, 8) || []);
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    onUpdate(idx, 'name', val);
    setActiveIndex(-1);
    calcDropStyle();
    setIsOpen(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchProducts(val), 220);
  };

  const handleFocus = () => {
    calcDropStyle();
    setIsOpen(true);
    if (suggestions.length === 0) fetchProducts(query);
  };

  const handleSelect = (prod) => {
    setQuery(prod.Name || prod.title || prod.name || '');
    onSelect(idx, prod);
    setIsOpen(false);
    setActiveIndex(-1);
    setSuggestions([]);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) return;
    const total = suggestions.length + 1; // +1 for "Add New" at bottom
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, total - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        handleSelect(suggestions[activeIndex]);
      } else if (activeIndex === suggestions.length) {
        onOpenQuickAdd(idx);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Extract image from product (API returns capital "Images")
  const getImg = (prod) => {
    const imgs = prod.Images || prod.images;
    if (!imgs || !imgs.length) return null;
    const first = imgs[0];
    if (typeof first === 'string') return first;
    return first?.url || first?.src || null;
  };

  return (
    <div ref={wrapperRef} className="relative flex-1">
      {/* Search input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder="Type or click to search product..."
          className="w-full h-8 pl-2.5 pr-7 rounded border border-zinc-300 text-xs font-semibold outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors bg-white"
        />
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 absolute right-2 top-2 text-zinc-400 animate-spin pointer-events-none" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-2 text-zinc-400 pointer-events-none" />
        )}
      </div>

      {/* Item description/note */}
      <textarea
        rows={2}
        value={item.description || ''}
        onChange={(e) => onUpdate(idx, 'description', e.target.value)}
        placeholder="Add item note / description..."
        className="mt-1.5 w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 text-xs text-zinc-700 placeholder:text-zinc-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-300 transition-colors resize-none bg-white"
      />

      {/* Dropdown — fixed position ABOVE input, never clipped by overflow */}
      {isOpen && (
        <div
          style={dropStyle}
          className="bg-white border border-zinc-200 rounded-xl shadow-2xl overflow-y-auto divide-y divide-zinc-100"
        >
          {/* Loading state */}
          {isLoading && suggestions.length === 0 && (
            <div className="px-3 py-3 text-xs text-zinc-400 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Searching products...
            </div>
          )}

          {/* No results */}
          {!isLoading && suggestions.length === 0 && (
            <div className="px-3 py-2.5 text-xs text-zinc-400 italic">
              No matching products — try different keywords
            </div>
          )}

          {/* Product rows with image */}
          {suggestions.map((prod, i) => {
            const imgSrc = getImg(prod);
            return (
              <button
                key={prod._id || i}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(prod); }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2.5 ${
                  activeIndex === i ? 'bg-emerald-50' : 'hover:bg-zinc-50'
                }`}
              >
                {/* Product image thumbnail */}
                {imgSrc ? (
                  <img
                    src={imgSrc}
                    alt=""
                    className="w-9 h-9 object-contain rounded border border-zinc-200 bg-white shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded border border-zinc-200 bg-zinc-100 shrink-0 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-zinc-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-zinc-900 truncate text-[11px]">
                    {prod.Name || prod.title || prod.name}
                  </div>
                  <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
                    PKR {(prod.Price ?? prod.price ?? 0).toLocaleString('en-PK')}
                  </div>
                </div>
              </button>
            );
          })}

          {/* Add New Item — always at bottom */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onOpenQuickAdd(idx); setIsOpen(false); }}
            className={`w-full text-left px-3 py-2.5 text-xs font-bold text-emerald-700 flex items-center gap-2 transition-colors ${
              activeIndex === suggestions.length ? 'bg-emerald-50' : 'hover:bg-emerald-50'
            }`}
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            + Add New Item (not in catalog)
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────
export default function InvoiceFormClient({
  initialInvoice,
  isEdit = false,
  isPanelMode = false,
  onPanelClose,
  onPanelSuccess,
}) {
  const router = useRouter();

  // Customer state
  const [customerName, setCustomerName] = useState(initialInvoice?.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(initialInvoice?.customerPhone || '');
  const [customerEmail, setCustomerEmail] = useState(initialInvoice?.customerEmail || '');
  const [customerAddress, setCustomerAddress] = useState(initialInvoice?.customerAddress || '');
  const [customerCity, setCustomerCity] = useState(initialInvoice?.customerCity || '');

  // Customer search
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showCustDropdown, setShowCustDropdown] = useState(false);
  const custWrapperRef = useRef(null);

  // New customer mini-modal
  const [showNewCustModal, setShowNewCustModal] = useState(false);
  const [newCustForm, setNewCustForm] = useState({ name: '', phone: '', email: '', address: '', city: '' });
  const [isSavingNewCust, setIsSavingNewCust] = useState(false);

  // Invoice fields
  const [invoiceNumber, setInvoiceNumber] = useState(initialInvoice?.invoiceNumber || '');
  const [location, setLocation] = useState(initialInvoice?.location || 'Unique Items Collection');
  const [invoiceDate, setInvoiceDate] = useState(
    initialInvoice?.invoiceDate
      ? new Date(initialInvoice.invoiceDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [terms, setTerms] = useState(initialInvoice?.terms || 'Due on Receipt');
  const [dueDate, setDueDate] = useState(
    initialInvoice?.dueDate
      ? new Date(initialInvoice.dueDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [salesperson, setSalesperson] = useState(initialInvoice?.salesperson || '');

  // Line items
  const [items, setItems] = useState(
    initialInvoice?.items?.length
      ? initialInvoice.items.map((it) => ({
          productId: it.productId || '',
          name: it.name || '',
          description: it.description || '',
          image: it.image || '',
          quantity: it.quantity || 1,
          price: it.price || 0,
        }))
      : [{ productId: '', name: '', description: '', image: '', quantity: 1, price: 0 }]
  );

  // Financials
  const [discountAmount, setDiscountAmount] = useState(initialInvoice?.discountAmount ?? initialInvoice?.discountPercentage ?? 0);
  const [shippingAmount, setShippingAmount] = useState(initialInvoice?.shippingAmount || 0);
  const [previousBalance, setPreviousBalance] = useState(initialInvoice?.previousBalance || 0);
  // Collapsible toggles for optional charges
  const [showShipping, setShowShipping] = useState((initialInvoice?.shippingAmount || 0) > 0);
  const [showPrevBalance, setShowPrevBalance] = useState((initialInvoice?.previousBalance || 0) > 0);
  const [customerNotes, setCustomerNotes] = useState(
    initialInvoice?.customerNotes || '1. Thank you for choosing us. We look forward to serving you again.'
  );
  const [termsAndConditions, setTermsAndConditions] = useState(initialInvoice?.termsAndConditions || '');

  // UI
  const [isQuickProductModalOpen, setIsQuickProductModalOpen] = useState(false);
  const [activeRowForQuickProduct, setActiveRowForQuickProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createLinkedOrder, setCreateLinkedOrder] = useState(true); // default ON

  // Fetch next invoice number on create
  useEffect(() => {
    if (!isEdit && !invoiceNumber) {
      fetch('/api/admin/invoices/next-number')
        .then((r) => r.json())
        .then((d) => { if (d?.nextNumber) setInvoiceNumber(d.nextNumber); })
        .catch(() => {});
    }
  }, [isEdit, invoiceNumber]);

  // Click-outside for customer dropdown
  useEffect(() => {
    const handler = (e) => {
      if (custWrapperRef.current && !custWrapperRef.current.contains(e.target)) {
        setShowCustDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Customer typeahead search
  useEffect(() => {
    if (!customerSearch.trim()) { setCustomerSuggestions([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/manual-customers/search?q=${encodeURIComponent(customerSearch)}`);
        const data = await res.json();
        if (data?.customers) setCustomerSuggestions(data.customers);
      } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [customerSearch]);

  const selectCustomer = (cust) => {
    setCustomerName(cust.name || '');
    setCustomerPhone(cust.phone || '');
    setCustomerEmail(cust.email || '');
    setCustomerAddress(cust.address || '');
    setCustomerCity(cust.city || '');
    setShowCustDropdown(false);
    setCustomerSearch('');
    if (cust.phone) {
      getCustomerPreviousBalanceAction(cust.phone).then((res) => {
        if (res?.previousBalance !== undefined) setPreviousBalance(res.previousBalance);
      });
    }
  };

  const handlePhoneBlur = async () => {
    if (customerPhone && !isEdit) {
      const res = await getCustomerPreviousBalanceAction(customerPhone);
      if (res?.previousBalance !== undefined) {
        setPreviousBalance(res.previousBalance);
        if (res.previousBalance > 0) {
          toast.info(`Auto-filled PKR ${res.previousBalance.toLocaleString('en-PK')} previous balance.`);
        }
      }
    }
  };

  // Save brand-new customer from mini-modal
  const saveNewCustomer = async (e) => {
    e.preventDefault();
    if (!newCustForm.name.trim()) { toast.error('Customer name is required'); return; }
    setIsSavingNewCust(true);
    try {
      const res = await fetch('/api/admin/manual-customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustForm),
      });
      const data = await res.json();
      if (data.success) {
        // Apply to invoice form
        setCustomerName(newCustForm.name);
        setCustomerPhone(newCustForm.phone);
        setCustomerEmail(newCustForm.email);
        setCustomerAddress(newCustForm.address);
        setCustomerCity(newCustForm.city);
        toast.success('New customer saved!');
        setShowNewCustModal(false);
        setNewCustForm({ name: '', phone: '', email: '', address: '', city: '' });
        setShowCustDropdown(false);
      } else {
        toast.error(data.error || 'Could not save customer');
      }
    } catch {
      toast.error('Network error saving customer');
    } finally {
      setIsSavingNewCust(false);
    }
  };

  // Item helpers
  const selectProduct = (rowIndex, prod) => {
    const imgs = prod.Images || prod.images;
    let imgUrl = '';
    if (imgs && imgs.length) {
      const first = imgs[0];
      imgUrl = typeof first === 'string' ? first : (first?.url || first?.src || '');
    }
    const updated = [...items];
    updated[rowIndex] = {
      ...updated[rowIndex],
      productId: prod._id || prod.id || '',
      name: prod.Name || prod.title || prod.name || '',
      description: '',
      price: prod.Price ?? prod.price ?? 0,
      image: imgUrl || prod.image || '',
    };
    setItems(updated);
  };

  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([...items, { productId: '', name: '', description: '', image: '', quantity: 1, price: 0 }]);
  };

  const removeItemRow = (index) => {
    if (items.length <= 1) { toast.error('Invoice must have at least 1 item.'); return; }
    setItems(items.filter((_, i) => i !== index));
  };

  const handleQuickProductSuccess = (newProd) => {
    if (activeRowForQuickProduct !== null && items[activeRowForQuickProduct]) {
      selectProduct(activeRowForQuickProduct, newProd);
    } else {
      setItems([...items, {
        productId: newProd.productId || '',
        name: newProd.name || '',
        description: newProd.description || '',
        price: newProd.price || 0,
        image: newProd.image || '',
        quantity: 1,
      }]);
    }
  };

  // Totals — flat PKR discount
  const subtotal = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.price) || 0), 0);
  const discAmt = Math.max(0, Number(discountAmount) || 0);
  const totalAmount = Math.max(0, subtotal - discAmt + (Number(shippingAmount) || 0) + (Number(previousBalance) || 0));

  // Submit
  const handleSubmit = async (targetStatus) => {
    if (!customerName.trim()) { toast.error('Please enter customer name.'); return; }
    if (!items.length || items.every((i) => !i.name.trim())) {
      toast.error('Please add at least one valid line item.'); return;
    }
    try {
      setIsSubmitting(true);
      const payload = {
        invoiceNumber, customerName, customerPhone, customerEmail,
        customerAddress, customerCity, location, invoiceDate,
        salesperson, items: items.filter((i) => i.name.trim()),
        discountAmount: Number(discountAmount) || 0,
        discountPercentage: 0,
        shippingAmount: showShipping ? (Number(shippingAmount) || 0) : 0,
        previousBalance: showPrevBalance ? (Number(previousBalance) || 0) : 0,
        customerNotes, termsAndConditions, status: targetStatus,
        createLinkedOrder,
      };

      if (isEdit && initialInvoice?._id) {
        await updateInvoiceAction(initialInvoice._id, payload);
        toast.success(`Invoice ${invoiceNumber} updated!`);
        if (isPanelMode && onPanelSuccess) onPanelSuccess();
        else router.push(`/admin/invoices/${initialInvoice._id}`);
      } else {
        const res = await createInvoiceAction(payload);
        if (res?.success) {
          toast.success(`Invoice ${res.invoiceNumber} created!`);
          if (isPanelMode && onPanelSuccess) onPanelSuccess(res);
          else router.push(`/admin/invoices/${res.invoiceId}`);
        }
      }
    } catch (error) {
      toast.error(error.message || 'Failed to save invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isPanelMode && onPanelClose) onPanelClose();
    else router.back();
  };

  // ── Form content (shared between panel + standalone) ─────────────────────
  const formContent = (
    <>
      <div className="flex flex-col h-full">

      {/* ── Panel Header ── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200 bg-white shrink-0">
        <div className="flex items-center gap-2.5">
          <FileText className="w-5 h-5 text-emerald-600" />
          <div>
            <h2 className="text-sm font-bold text-zinc-900">
              {isEdit ? 'Edit Invoice' : 'New Invoice'}
            </h2>
            {invoiceNumber && (
              <p className="text-[10px] text-zinc-400 font-medium">{invoiceNumber}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        {/* Section 1: Customer */}
        <div className="grid grid-cols-2 gap-3">
          <div ref={custWrapperRef} className="relative col-span-2 sm:col-span-1">
            <label className="text-[10px] font-bold uppercase text-rose-600 tracking-wide block mb-1">
              Customer Name *
            </label>
            <div className="relative">
              <input
                type="text"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  setCustomerSearch(e.target.value);
                  setShowCustDropdown(true);
                }}
                onFocus={() => setShowCustDropdown(true)}
                placeholder="Type or select customer..."
                className="w-full h-9 pl-3 pr-8 rounded-lg border border-zinc-300 text-xs font-semibold outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-zinc-400 pointer-events-none" />
            </div>
            {showCustDropdown && customerSearch.trim() && (
              <div className="absolute z-[200] left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl max-h-52 overflow-y-auto divide-y divide-zinc-100">
                {/* Matching existing customers */}
                {customerSuggestions.map((c) => (
                  <button
                    key={c._id}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); selectCustomer(c); }}
                    className="w-full text-left px-3 py-2 hover:bg-emerald-50 text-xs transition-colors"
                  >
                    <div className="font-semibold text-zinc-900">{c.name}</div>
                    <div className="text-zinc-400 text-[10px]">{c.phone}{c.city ? ` • ${c.city}` : ''}</div>
                  </button>
                ))}
                {/* Always show Add New Customer at bottom */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setNewCustForm({ name: customerSearch.trim(), phone: '', email: '', address: '', city: '' });
                    setShowNewCustModal(true);
                    setShowCustDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2.5 text-xs font-bold text-blue-600 flex items-center gap-2 hover:bg-blue-50 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  Add “{customerSearch.trim()}” as new customer
                </button>
              </div>
            )}
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="text-[10px] font-bold uppercase text-zinc-500 tracking-wide block mb-1">Phone</label>
            <input
              type="text"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              onBlur={handlePhoneBlur}
              placeholder="03001234567"
              className="w-full h-9 px-3 rounded-lg border border-zinc-300 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Section 2: Invoice meta — Terms + Due Date removed */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-200">
          <div>
            <label className="text-[10px] font-bold uppercase text-rose-600 tracking-wide block mb-1">Invoice # *</label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="w-full h-8 px-2.5 rounded-lg border border-zinc-300 text-xs font-bold outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-rose-600 tracking-wide block mb-1">Date *</label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-full h-8 px-2 rounded-lg border border-zinc-300 text-xs outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Section 3: Location + Salesperson */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase text-zinc-500 tracking-wide block mb-1">Location</label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full h-8 px-2.5 rounded-lg border border-zinc-300 text-xs outline-none focus:border-emerald-500 bg-white"
            >
              <option value="Unique Items Collection">Unique Items Collection (Saddar)</option>
              <option value="Online Warehouse">Online Warehouse</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-zinc-500 tracking-wide block mb-1">Salesperson</label>
            <input
              type="text"
              value={salesperson}
              onChange={(e) => setSalesperson(e.target.value)}
              placeholder="Optional"
              className="w-full h-8 px-2.5 rounded-lg border border-zinc-300 text-xs outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Section 4: Items Table — Zoho-style */}
        <div>
          {/* Table container */}
          <div className="border border-zinc-200 rounded-xl overflow-visible bg-white">
            {/* Column header */}
            <div className="grid text-[10px] font-bold uppercase tracking-widest text-zinc-400 bg-zinc-50 border-b border-zinc-200 rounded-t-xl"
              style={{ gridTemplateColumns: '1fr 100px 110px 100px 36px' }}>
              <div className="px-4 py-2.5">Item Details</div>
              <div className="px-3 py-2.5 text-right">Quantity</div>
              <div className="px-3 py-2.5 text-right">Rate</div>
              <div className="px-3 py-2.5 text-right">Amount</div>
              <div></div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-zinc-100">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="grid hover:bg-blue-50/30 transition-colors"
                  style={{ gridTemplateColumns: '1fr 100px 110px 100px 36px' }}
                >
                  {/* ── ITEM DETAILS ── */}
                  <div className="px-4 py-3 flex items-start gap-3 min-w-0">
                    {/* Product thumbnail or placeholder */}
                    {item.image ? (
                      <img
                        src={item.image}
                        alt=""
                        className="w-10 h-10 rounded-lg object-contain border border-zinc-200 bg-white shrink-0 mt-0.5"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 shrink-0 mt-0.5 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-zinc-300" />
                      </div>
                    )}
                    {/* Name search + description */}
                    <div className="flex-1 min-w-0">
                      <ProductSearchCell
                        item={item}
                        idx={idx}
                        onSelect={selectProduct}
                        onUpdate={updateItem}
                        onOpenQuickAdd={(i) => {
                          setActiveRowForQuickProduct(i);
                          setIsQuickProductModalOpen(true);
                        }}
                      />
                    </div>
                  </div>

                  {/* ── QUANTITY ── */}
                  <div className="px-3 py-3 flex items-start pt-3.5">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full h-8 px-2 rounded-lg border border-zinc-200 text-sm text-right font-semibold text-zinc-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-300 transition-colors bg-white"
                    />
                  </div>

                  {/* ── RATE ── */}
                  <div className="px-3 py-3 flex items-start pt-3.5">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={item.price}
                      onChange={(e) => updateItem(idx, 'price', Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full h-8 px-2 rounded-lg border border-zinc-200 text-sm text-right font-semibold text-zinc-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-300 transition-colors bg-white"
                    />
                  </div>

                  {/* ── AMOUNT ── */}
                  <div className="px-3 py-3 flex items-start pt-4 justify-end">
                    <span className="text-sm font-bold text-zinc-900 tabular-nums">
                      {((Number(item.quantity) || 0) * (Number(item.price) || 0)).toLocaleString('en-PK')}
                    </span>
                  </div>

                  {/* ── DELETE ── */}
                  <div className="flex items-start pt-3.5 pr-1">
                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      className="p-1.5 rounded-lg text-zinc-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Row — Zoho-style blue pill */}
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={addItemRow}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 active:bg-blue-700 px-4 py-2 rounded-full shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add New Row
            </button>
            <button
              type="button"
              onClick={() => { setActiveRowForQuickProduct(null); setIsQuickProductModalOpen(true); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 px-4 py-2 rounded-full transition-colors"
            >
              <PackagePlus className="w-3.5 h-3.5" /> Add Unlisted Product
            </button>
          </div>
        </div>


        {/* Section 5: Notes + Totals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-zinc-200">
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-500 tracking-wide block mb-1">Customer Notes</label>
              <textarea
                rows={3}
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-xs outline-none focus:border-emerald-500 resize-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-500 tracking-wide block mb-1">Terms & Conditions</label>
              <textarea
                rows={2}
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-xs outline-none focus:border-emerald-500 resize-none"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2.5 text-xs">
            {/* Sub Total */}
            <div className="flex justify-between text-zinc-600">
              <span>Sub Total</span>
              <span className="font-semibold text-zinc-900">PKR {subtotal.toLocaleString('en-PK')}</span>
            </div>

            {/* Discount — flat PKR */}
            <div className="flex justify-between items-center text-zinc-600">
              <span>Discount (PKR)</span>
              <input
                type="number" min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-24 h-7 px-2 text-right rounded-lg border border-zinc-200 text-xs outline-none focus:border-emerald-500"
              />
            </div>

            {/* Delivery Charges — collapsible */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showShipping}
                  onChange={(e) => { setShowShipping(e.target.checked); if (!e.target.checked) setShippingAmount(0); }}
                  className="w-3.5 h-3.5 rounded accent-emerald-600 cursor-pointer"
                />
                <span className={`font-medium transition-colors ${showShipping ? 'text-zinc-700' : 'text-zinc-400'}`}>
                  Delivery Charges
                </span>
              </label>
              {showShipping && (
                <div className="flex justify-between items-center pl-5">
                  <span className="text-zinc-500">Amount (PKR)</span>
                  <input
                    type="number" min="0"
                    value={shippingAmount}
                    onChange={(e) => setShippingAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-24 h-7 px-2 text-right rounded-lg border border-zinc-200 text-xs outline-none focus:border-emerald-500"
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* Previous Balance — collapsible */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showPrevBalance}
                  onChange={(e) => { setShowPrevBalance(e.target.checked); if (!e.target.checked) setPreviousBalance(0); }}
                  className="w-3.5 h-3.5 rounded accent-emerald-600 cursor-pointer"
                />
                <span className={`font-medium transition-colors ${showPrevBalance ? 'text-zinc-700' : 'text-zinc-400'}`}>
                  Previous Balance
                </span>
              </label>
              {showPrevBalance && (
                <div className="flex justify-between items-center pl-5">
                  <span className="text-zinc-500">Amount (PKR)</span>
                  <input
                    type="number" min="0"
                    value={previousBalance}
                    onChange={(e) => setPreviousBalance(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-24 h-7 px-2 text-right rounded-lg border border-zinc-200 text-xs outline-none focus:border-emerald-500"
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* Total */}
            <div className="pt-2 border-t border-zinc-200 flex justify-between items-center">
              <span className="font-bold text-zinc-900 text-sm">Total</span>
              <span className="font-bold text-emerald-700 text-base">
                PKR {totalAmount.toLocaleString('en-PK')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky footer actions ── */}
      <div className="shrink-0 border-t border-zinc-200 bg-white px-5 py-3 space-y-3">
        {/* Linked Order checkbox */}
        {!isEdit && (
          <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
            <input
              type="checkbox"
              checked={createLinkedOrder}
              onChange={(e) => setCreateLinkedOrder(e.target.checked)}
              className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
            />
            <span className="text-xs font-medium text-zinc-700">
              Also create a linked Order
            </span>
            <span className="text-[10px] text-zinc-400">(default: on)</span>
          </label>
        )}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit('DRAFT')}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Draft
          </button>
        </div>
      </div>
    </div>

    {/* ── New Customer mini-modal ── */}
    {showNewCustModal && (
      <>
        <div
          className="fixed inset-0 z-[110] bg-black/40"
          onClick={() => setShowNewCustModal(false)}
        />
        <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[111] max-w-md mx-auto bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Add New Customer</h3>
              <p className="text-[10px] text-zinc-400 mt-0.5">Saved to your customer list automatically</p>
            </div>
            <button type="button" onClick={() => setShowNewCustModal(false)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={saveNewCustomer} className="px-5 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] font-bold uppercase text-rose-600 tracking-wide block mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={newCustForm.name}
                  onChange={(e) => setNewCustForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Customer name"
                  className="w-full h-9 px-3 rounded-lg border border-zinc-300 text-xs font-semibold outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-400"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-500 tracking-wide block mb-1">Phone</label>
                <input
                  type="text"
                  value={newCustForm.phone}
                  onChange={(e) => setNewCustForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="03001234567"
                  className="w-full h-9 px-3 rounded-lg border border-zinc-200 text-xs outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-500 tracking-wide block mb-1">
                  City
                </label>
                <CitySelectDropdown
                  value={newCustForm.city}
                  onChange={(city) => setNewCustForm((f) => ({ ...f, city }))}
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-bold uppercase text-zinc-500 tracking-wide block mb-1">Address</label>
                <input
                  type="text"
                  value={newCustForm.address}
                  onChange={(e) => setNewCustForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Street address (optional)"
                  className="w-full h-9 px-3 rounded-lg border border-zinc-200 text-xs outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowNewCustModal(false)}
                className="px-4 py-2 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingNewCust}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors disabled:opacity-60"
              >
                {isSavingNewCust ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Save Customer
              </button>
            </div>
          </form>
        </div>
      </>
    )}
  </>
  );

  // ── Panel mode (slide-in from right) ────────────────────────────────────
  if (isPanelMode) {
    return (
      <>
        <div
          className="fixed inset-0 bg-black/30 z-[100] animate-in fade-in duration-200"
          onClick={handleClose}
        />
        <div className="fixed inset-y-0 right-0 z-[101] w-full max-w-3xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          {formContent}
        </div>
        <QuickAddProductModal
          isOpen={isQuickProductModalOpen}
          onClose={() => setIsQuickProductModalOpen(false)}
          onSuccess={handleQuickProductSuccess}
        />
      </>
    );
  }

  // ── Standalone page mode (edit / direct URL) ─────────────────────────────
  return (
    <div className="p-4 max-w-4xl mx-auto admin-page-stack">
      <div
        className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden"
        style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column' }}
      >
        {formContent}
      </div>
      <QuickAddProductModal
        isOpen={isQuickProductModalOpen}
        onClose={() => setIsQuickProductModalOpen(false)}
        onSuccess={handleQuickProductSuccess}
      />
    </div>
  );
}
