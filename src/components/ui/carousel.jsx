// @ts-nocheck
'use client';

import * as React from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Ssr from 'embla-carousel-ssr';

import { cn } from '@/lib/utils';

/** @typedef {import('embla-carousel').EmblaCarouselType} CarouselApi */
/** @typedef {import('embla-carousel').EmblaOptionsType} CarouselOptions */
/** @typedef {import('embla-carousel').EmblaPluginType} CarouselPlugin */

const CarouselContext = React.createContext(null);

function withoutLegacySsrOption(opts) {
  if (!opts || typeof opts !== 'object') {
    return { emblaOptions: {}, ssrPluginOptions: null };
  }

  const { ssr, breakpoints, ...rest } = opts;
  const ssrPluginOptions = {};

  if (Array.isArray(ssr) && ssr.length > 0) {
    ssrPluginOptions.slideSizes = ssr;
  }

  if (breakpoints && typeof breakpoints === 'object') {
    const emblaBreakpoints = {};
    const ssrBreakpoints = {};

    for (const [query, breakpointOptions] of Object.entries(breakpoints)) {
      if (!breakpointOptions || typeof breakpointOptions !== 'object') {
        continue;
      }

      const { ssr: breakpointSsr, ...breakpointRest } = breakpointOptions;
      if (Object.keys(breakpointRest).length > 0) {
        emblaBreakpoints[query] = breakpointRest;
      }
      if (Array.isArray(breakpointSsr) && breakpointSsr.length > 0) {
        ssrBreakpoints[query] = { slideSizes: breakpointSsr };
      }
    }

    if (Object.keys(emblaBreakpoints).length > 0) {
      rest.breakpoints = emblaBreakpoints;
    }

    if (Object.keys(ssrBreakpoints).length > 0) {
      ssrPluginOptions.breakpoints = ssrBreakpoints;
    }
  }

  return {
    emblaOptions: rest,
    ssrPluginOptions: Array.isArray(ssrPluginOptions.slideSizes)
      ? ssrPluginOptions
      : null,
  };
}

function getCarouselSsrStyles(serverApi, contentId) {
  try {
    return (
      serverApi?.plugins?.().ssr?.getStyles(`#${contentId}`, '[data-embla-slide]') ||
      ''
    );
  } catch {
    return '';
  }
}

function useCarousel() {
  const context = React.useContext(CarouselContext);

  if (!context) {
    throw new Error('useCarousel must be used within a <Carousel />');
  }

  return context;
}

function Carousel({
  orientation = 'horizontal',
  opts,
  setApi,
  plugins,
  ssr,
  className,
  children,
  ...props
}) {
  const reactId = React.useId();
  const carouselId = React.useMemo(
    () => `embla-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`,
    [reactId]
  );
  const contentId = `${carouselId}-container`;
  const { emblaOptions, ssrPluginOptions: legacySsrPluginOptions } = React.useMemo(
    () => withoutLegacySsrOption(opts),
    [opts]
  );
  const ssrPluginOptions = ssr || legacySsrPluginOptions;
  const emblaPlugins = React.useMemo(() => {
    const nextPlugins = Array.isArray(plugins) ? [...plugins] : [];
    const hasSsrPlugin = nextPlugins.some((plugin) => plugin?.name === 'ssr');

    if (!hasSsrPlugin && ssrPluginOptions) {
      nextPlugins.push(Ssr(ssrPluginOptions));
    }

    return nextPlugins;
  }, [plugins, ssrPluginOptions]);
  const [carouselRef, api, serverApi] = useEmblaCarousel(
    {
      axis: orientation === 'horizontal' ? 'x' : 'y',
      ...emblaOptions,
    },
    emblaPlugins
  );
  const ssrStyles = !api ? getCarouselSsrStyles(serverApi, contentId) : '';

  React.useEffect(() => {
    if (!api) {
      return;
    }

    if (setApi) {
      setApi(api);
    }

    return () => {
      if (setApi) {
        setApi(undefined);
      }
    };
  }, [api, setApi]);

  const value = React.useMemo(
    () => ({
      carouselRef,
      api,
      contentId,
      orientation,
      canGoToPrev: () => (typeof api?.canScrollPrev === 'function' ? api.canScrollPrev() : typeof api?.canGoToPrev === 'function' ? api.canGoToPrev() : false),
      canGoToNext: () => (typeof api?.canScrollNext === 'function' ? api.canScrollNext() : typeof api?.canGoToNext === 'function' ? api.canGoToNext() : false),
      goToPrev: (instant) => (typeof api?.scrollPrev === 'function' ? api.scrollPrev(instant) : api?.goToPrev?.(instant)),
      goToNext: (instant) => (typeof api?.scrollNext === 'function' ? api.scrollNext(instant) : api?.goToNext?.(instant)),
      goTo: (index, instant, direction) => (typeof api?.scrollTo === 'function' ? api.scrollTo(index, instant) : api?.goTo?.(index, instant, direction)),
      selectedSnap: () => (typeof api?.selectedScrollSnap === 'function' ? api.selectedScrollSnap() : typeof api?.selectedSnap === 'function' ? api.selectedSnap() : 0),
      scrollPrev: (instant) => (typeof api?.scrollPrev === 'function' ? api.scrollPrev(instant) : api?.goToPrev?.(instant)),
      scrollNext: (instant) => (typeof api?.scrollNext === 'function' ? api.scrollNext(instant) : api?.goToNext?.(instant)),
      scrollTo: (index, instant, direction) => (typeof api?.scrollTo === 'function' ? api.scrollTo(index, instant) : api?.goTo?.(index, instant, direction)),
      selectedScrollSnap: () => (typeof api?.selectedScrollSnap === 'function' ? api.selectedScrollSnap() : typeof api?.selectedSnap === 'function' ? api.selectedSnap() : 0),
    }),
    [api, carouselRef, contentId, orientation]
  );

  return (
    <CarouselContext.Provider value={value}>
      <div
        className={cn('relative', className)}
        role="region"
        aria-roledescription="carousel"
        {...props}
      >
        {ssrStyles ? <style>{ssrStyles}</style> : null}
        {children}
      </div>
    </CarouselContext.Provider>
  );
}

function CarouselContent({ className, viewportClassName, ...props }) {
  const { carouselRef, contentId, orientation } = useCarousel();

  return (
    <div ref={carouselRef} className={cn('overflow-hidden', viewportClassName)}>
      <div
        id={contentId}
        className={cn(
          'flex touch-pan-y',
          orientation === 'horizontal' ? '-ml-4' : '-mt-4 flex-col',
          className
        )}
        {...props}
      />
    </div>
  );
}

function CarouselItem({ className, ...props }) {
  const { orientation } = useCarousel();

  return (
    <div
      data-embla-slide
      role="group"
      aria-roledescription="slide"
      className={cn(
        'min-w-0 shrink-0 grow-0 basis-full',
        orientation === 'horizontal' ? 'pl-4' : 'pt-4',
        className
      )}
      {...props}
    />
  );
}

export { Carousel, CarouselContent, CarouselItem, useCarousel };
