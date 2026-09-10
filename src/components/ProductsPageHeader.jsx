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
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border transition-[color,background-color,border-color,box-shadow,transform] outline-none active:scale-[0.97] h-8 px-3 text-xs md:h-[40px] md:px-5 md:text-sm font-semibold";

function getCategoryPillClassName(isActive) {
  if (isActive) {
      return cn(
      categoryPillClassName,
      "border-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary/92"
    );
  }

  return cn(
    categoryPillClassName,
    "border-border/70 bg-card text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] hover:border-border hover:bg-muted/70"
  );
}

function buildTitle(activeCategory, categories, searchTerm) {
  if (activeCategory === "new-arrivals") return "New Arrivals";
  if (activeCategory && activeCategory !== "all") {
    return categories.find((category) => category.id === activeCategory || category.slug === activeCategory || category._id === activeCategory)?.label || "Products";
  }
  if (searchTerm) return "Search Results";
  return "All Products";
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
    <div>
      <div
        className={cn(
          "products-page-bar fixed inset-x-0 top-[96px] z-30 border-b border-border/50 bg-background/86 backdrop-blur-xl transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] will-change-transform md:hidden",
          isProductsBarHidden ? "-translate-y-[96px]" : "translate-y-0"
        )}
      >
        <div className="relative mx-auto w-full max-w-[1600px] px-4 sm:px-6 md:px-8 lg:px-10 xl:px-14">
          <div className="pointer-events-none absolute inset-y-0 left-4 z-10 hidden items-center md:flex">
            <button
              type="button"
              aria-label="Scroll categories left"
              onClick={() => scrollCategories("left")}
              disabled={!canScrollPrev}
              className="pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-background/92 text-muted-foreground transition-[color,background-color,border-color,opacity] hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-0"
            >
              <ChevronLeft className="size-3.5" />
            </button>
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-4 z-10 hidden items-center md:flex">
            <button
              type="button"
              aria-label="Scroll categories right"
              onClick={() => scrollCategories("right")}
              disabled={!canScrollNext}
              className="pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-background/92 text-muted-foreground transition-[color,background-color,border-color,opacity] hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-0"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
          <div
            ref={categoryNavRef}
            className="relative flex gap-1.5 overflow-x-auto py-3 hide-scrollbar md:px-8"
          >
            {categoryButtons.map((category) => {
              const Icon = category.icon;
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
                    getCategoryPillClassName(isActive),
                    "shrink-0 select-none",
                    !isActive && "active:border-border active:bg-muted/80"
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : null}
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="h-[70px] md:hidden" aria-hidden="true" />

      <div className="mx-auto w-full max-w-[1600px] mb-2 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-14 pt-3 md:pt-1">
        <Breadcrumb className="products-page-meta mb-2">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="products-page-heading text-[1.8rem] font-bold tracking-tight text-foreground [text-wrap:balance] md:text-3xl">
          {pageTitle}
        </h1>

        {searchTerm ? (
          <div className="mt-3 inline-flex items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-1.5 text-xs sm:text-sm text-foreground">
            <span>
              Search active: <strong className="font-bold text-primary">&ldquo;{searchTerm}&rdquo;</strong>
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
              className="inline-flex items-center gap-1 rounded-md bg-muted hover:bg-muted/80 px-2 py-0.5 text-xs font-semibold text-foreground transition-colors cursor-pointer"
              title="Clear search"
            >
              <span>Clear</span>
              <X className="size-3.5" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
