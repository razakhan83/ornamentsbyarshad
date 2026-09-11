'use client';

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2, Search, Clock, Tag, X } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useProductsNavigationFeedback } from "@/components/ProductsNavigationFeedback";
import { cn } from "@/lib/utils";

const categoryPillClassName =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-none border transition-[color,background-color,border-color,box-shadow,transform] outline-none active:scale-[0.97] h-9 px-3.5 text-xs md:h-10 md:px-5 md:text-xs uppercase tracking-[0.16em] font-semibold";

function getCategoryPillClassName(isActive) {
  if (isActive) {
      return cn(
      categoryPillClassName,
      "border-[#121212] bg-[#121212] text-white shadow-none"
    );
  }

  return cn(
    categoryPillClassName,
    "border-[#E8E5DF] bg-white text-[#121212] hover:border-[#121212]/60"
  );
}

function buildTitle(activeCategory, categories, searchTerm) {
  if (activeCategory === "new-arrivals") return "New Arrivals";
  if (activeCategory && activeCategory !== "all") {
    return categories.find((category) => category.id === activeCategory || category.slug === activeCategory || category._id === activeCategory)?.label || "Fine Jewelry";
  }
  if (searchTerm) return "Search Results";
  return "All Creations";
}

function buildCategoryHref(categoryId, searchTerm, sort) {
  const params = new URLSearchParams();
  if (searchTerm) {
    params.set("search", searchTerm);
  }
  if (sort && sort !== "newest") {
    params.set("sort", sort);
  }
  if (categoryId !== "all") {
    params.set("category", categoryId);
  }
  const queryString = params.toString();
  return queryString ? `/products?${queryString}` : "/products";
}

export default function ProductsPageHeader({
  categories,
  activeCategory = "all",
  searchTerm = "",
  sort = "newest",
}) {
  const router = useRouter();
  const categoryNavRef = useRef(null);
  const { setCategoryPending } = useProductsNavigationFeedback();
  const [isPending, startTransition] = useTransition();
  const [pendingCategoryId, setPendingCategoryId] = useState(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [isProductsBarHidden, setIsProductsBarHidden] = useState(false);
  const isProductsBarHiddenRef = useRef(false);
  const lastScrollYRef = useRef(0);
  const scrollAnchorYRef = useRef(0);
  const categoryButtons = [
    { id: "all", label: "All Items", icon: Search },
    ...categories
      .filter(c => c.id !== 'special-offers' && c.id !== 'new-arrivals' && c.slug !== 'special-offers' && c.slug !== 'new-arrivals' && c.id !== 'featured' && c.id !== 'best-sellers')
      .map(c => ({ ...c, icon: Tag })),
  ];
  const effectiveActiveCategory = pendingCategoryId ?? activeCategory;
  const pageTitle = buildTitle(activeCategory, categories, searchTerm);

  useEffect(() => {
    const nav = categoryNavRef.current;
    if (!nav) return;

    let rAF = null;

    const updateScrollState = () => {
      if (rAF !== null) return;

      rAF = window.requestAnimationFrame(() => {
        rAF = null;
        if (!categoryNavRef.current) return;
        const el = categoryNavRef.current;
        const maxScrollLeft = el.scrollWidth - el.clientWidth;
        const nextCanPrev = el.scrollLeft > 4;
        const nextCanNext = maxScrollLeft - el.scrollLeft > 4;

        setCanScrollPrev((prev) => (prev !== nextCanPrev ? nextCanPrev : prev));
        setCanScrollNext((prev) => (prev !== nextCanNext ? nextCanNext : prev));
      });
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(updateScrollState);
    } else {
      setTimeout(updateScrollState, 150);
    }

    nav.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState, { passive: true });

    return () => {
      nav.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      if (rAF !== null) window.cancelAnimationFrame(rAF);
    };
  }, [categoryButtons.length]);

  useEffect(() => {
    const nav = categoryNavRef.current;
    if (!nav) return;

    const activePill = nav.querySelector("[data-active='true']");
    if (!activePill) return;

    nav.scrollTo({
      left: activePill.offsetLeft - nav.clientWidth / 2 + activePill.clientWidth / 2,
      behavior: "smooth",
    });
  }, [activeCategory]);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;
    scrollAnchorYRef.current = window.scrollY;

    let frameId = null;

    const updateBarVisibility = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollYRef.current;

      if (Math.abs(delta) < 3) {
        lastScrollYRef.current = currentScrollY;
        frameId = null;
        return;
      }

      const distanceFromAnchor = currentScrollY - scrollAnchorYRef.current;

      if (currentScrollY <= 16) {
        if (isProductsBarHiddenRef.current) {
          isProductsBarHiddenRef.current = false;
          setIsProductsBarHidden(false);
        }
        scrollAnchorYRef.current = currentScrollY;
      } else {
        if (!isProductsBarHiddenRef.current && distanceFromAnchor > 56 && delta > 0 && currentScrollY > 80) {
          isProductsBarHiddenRef.current = true;
          setIsProductsBarHidden(true);
          scrollAnchorYRef.current = currentScrollY;
        } else if (isProductsBarHiddenRef.current && distanceFromAnchor < -12 && delta < 0) {
          isProductsBarHiddenRef.current = false;
          setIsProductsBarHidden(false);
          scrollAnchorYRef.current = currentScrollY;
        } else if (Math.sign(delta) !== Math.sign(distanceFromAnchor) && Math.abs(distanceFromAnchor) > 6) {
          scrollAnchorYRef.current = lastScrollYRef.current;
        }
      }

      lastScrollYRef.current = currentScrollY;
      frameId = null;
    };

    const handleScroll = () => {
      if (frameId === null) {
        frameId = window.requestAnimationFrame(updateBarVisibility);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);

      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  useEffect(() => {
    if (!isPending) {
      const frameId = window.requestAnimationFrame(() => {
        setPendingCategoryId(null);
        setCategoryPending(null, false);
      });
      return () => window.cancelAnimationFrame(frameId);
    }
  }, [isPending, setCategoryPending]);

  function centerCategoryPill(target) {
    const nav = categoryNavRef.current;
    if (!nav || !(target instanceof HTMLElement)) return;

    nav.scrollTo({
      left: target.offsetLeft - nav.clientWidth / 2 + target.clientWidth / 2,
      behavior: "smooth",
    });
  }

  function handleCategoryClick(categoryId, href, event) {
    const target = event.currentTarget;
    centerCategoryPill(target);
    setPendingCategoryId(categoryId);
    setCategoryPending(categoryId, true);

    startTransition(() => {
      router.push(href, { scroll: false });
    });
  }

  function scrollCategories(direction) {
    const nav = categoryNavRef.current;
    if (!nav) return;

    nav.scrollBy({
      left: direction === "left" ? -240 : 240,
      behavior: "smooth",
    });
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 md:px-8 lg:px-10 xl:px-14 pt-3 sm:pt-4 md:pt-6">
      {/* Breadcrumbs - Minimal Clean Luxury */}
      <Breadcrumb className="products-page-meta mb-1.5 text-[10.5px] uppercase tracking-[0.2em] text-[#737373] select-none">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/" className="hover:text-[#121212] transition-colors">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-[#121212] font-medium">{pageTitle}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-3">
        <h1 className="products-page-heading font-serif text-2xl sm:text-3xl lg:text-4xl font-normal tracking-wide text-[#121212] uppercase [text-wrap:balance]">
          {pageTitle}
        </h1>

        {searchTerm ? (
          <div className="inline-flex items-center gap-2 border border-[#E8E5DF] bg-white px-3 py-1 text-xs text-[#121212]">
            <span>
              Search: <strong className="font-semibold text-[#A67C52]">&ldquo;{searchTerm}&rdquo;</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams();
                if (activeCategory && activeCategory !== "all") {
                  params.set("category", activeCategory);
                }
                if (sort && sort !== "newest") {
                  params.set("sort", sort);
                }
                const qs = params.toString();
                router.push(qs ? `/products?${qs}` : "/products");
              }}
              className="inline-flex items-center gap-1 bg-[#FAF9F6] hover:bg-neutral-200 px-1.5 py-0.5 text-[10px] uppercase font-semibold text-[#121212] transition-colors cursor-pointer select-none"
              title="Clear search"
            >
              <span>Clear</span>
              <X className="size-3" />
            </button>
          </div>
        ) : null}
      </div>

      {/* Mobile Horizontal Category Pills Bar - In-flow and cleanly spaced */}
      <div className="md:hidden relative border-y border-[#E8E5DF]/70 bg-[#FAF9F6] -mx-4 px-4 py-2 my-2">
        <div
          ref={categoryNavRef}
          className="flex gap-1.5 overflow-x-auto hide-scrollbar py-0.5"
        >
          {categoryButtons.map((category) => {
            const isActive = effectiveActiveCategory === category.id;
            const isLoading = isPending && pendingCategoryId === category.id;
            const href = buildCategoryHref(category.id, searchTerm, sort);
            return (
              <button
                key={category.id}
                type="button"
                data-active={isActive}
                aria-pressed={isActive}
                disabled={isLoading}
                onClick={(event) => handleCategoryClick(category.id, href, event)}
                className={cn(
                  "inline-flex items-center justify-center whitespace-nowrap rounded-none border transition-all outline-none active:scale-[0.97] h-8 px-3 text-[11px] uppercase tracking-[0.16em] font-medium shrink-0 select-none",
                  isActive
                    ? "border-[#121212] bg-[#121212] text-white"
                    : "border-[#E8E5DF] bg-white text-[#121212]/80 hover:border-[#121212]/50"
                )}
              >
                {isLoading ? (
                  <Loader2 className="size-3.5 animate-spin mr-1.5" aria-hidden="true" />
                ) : null}
                {category.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
