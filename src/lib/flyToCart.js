/**
 * Lightweight, GPU-accelerated Fly-to-Cart animation
 * Uses pure Web Animations API (WAAPI) with zero external dependencies.
 */

export function flyToCart({ sourceEl, imageSrc = '' } = {}) {
  if (typeof window === 'undefined' || !sourceEl) return;

  // Immediately notify navbar to reveal if hidden on scroll
  window.dispatchEvent(new CustomEvent('reveal-navbar'));

  // Respect accessibility preference
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.dispatchEvent(new CustomEvent('cart-item-landed'));
    return;
  }

  const targetEl =
    document.querySelector('#nav-cart-button') ||
    document.querySelector('[data-cart-target]') ||
    document.querySelector('.nav-cart-button');

  const sourceRect = sourceEl.getBoundingClientRect();

  // If source is not visible on screen, fallback immediately
  if (sourceRect.width === 0 && sourceRect.height === 0) {
    window.dispatchEvent(new CustomEvent('cart-item-landed'));
    return;
  }

  // Create flying clone element
  const flyer = document.createElement('div');
  const size = 64; // Clearly visible 64px badge

  // Calculate start center
  const startX = sourceRect.left + sourceRect.width / 2 - size / 2;
  const startY = sourceRect.top + sourceRect.height / 2 - size / 2;

  // Calculate target position (even if navbar is currently animating into view)
  let targetX;
  let targetY;

  if (targetEl) {
    const targetRect = targetEl.getBoundingClientRect();
    targetX = targetRect.left + targetRect.width / 2 - size / 2;
    // If navbar was hidden (top < 0), land at top header position (~20px from top)
    targetY = Math.max(targetRect.top + targetRect.height / 2 - size / 2, 16);
  } else {
    // Default fallback to top-right corner of viewport
    targetX = window.innerWidth - 56 - size / 2;
    targetY = 24;
  }

  // Parabolic lift calculation
  const midX = (startX + targetX) / 2;
  const horizontalDistance = Math.abs(startX - targetX);
  const liftHeight = Math.min(Math.max(horizontalDistance * 0.35, 60), 160);
  const midY = Math.min(startY, targetY) - liftHeight;

  flyer.style.position = 'fixed';
  flyer.style.top = '0px';
  flyer.style.left = '0px';
  flyer.style.width = `${size}px`;
  flyer.style.height = `${size}px`;
  flyer.style.borderRadius = '16px';
  flyer.style.overflow = 'hidden';
  flyer.style.pointerEvents = 'none';
  flyer.style.zIndex = '999999';
  flyer.style.backgroundColor = '#ffffff';
  flyer.style.border = '2px solid #ffffff';
  flyer.style.boxShadow = '0 12px 32px -4px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(0, 0, 0, 0.08)';
  flyer.style.willChange = 'transform, opacity';

  if (imageSrc) {
    const img = document.createElement('img');
    img.src = imageSrc;
    img.alt = '';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    flyer.appendChild(img);
  } else {
    // Clean shopping bag fallback icon
    flyer.innerHTML = `
      <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#015347;color:#fff;">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
          <path d="M3 6h18"></path>
          <path d="M16 10a4 4 0 0 1-8 0"></path>
        </svg>
      </div>
    `;
  }

  document.body.appendChild(flyer);

  // Smooth, clearly visible 950ms flight duration
  const duration = 950;

  const animation = flyer.animate(
    [
      {
        transform: `translate3d(${startX}px, ${startY}px, 0) scale(1) rotate(0deg)`,
        opacity: 1,
      },
      {
        transform: `translate3d(${startX + (midX - startX) * 0.3}px, ${startY - 45}px, 0) scale(1.12) rotate(-5deg)`,
        opacity: 1,
        offset: 0.2,
      },
      {
        transform: `translate3d(${midX}px, ${midY}px, 0) scale(0.85) rotate(3deg)`,
        opacity: 0.96,
        offset: 0.55,
      },
      {
        transform: `translate3d(${targetX + (midX - targetX) * 0.1}px, ${targetY + 12}px, 0) scale(0.42) rotate(-2deg)`,
        opacity: 0.8,
        offset: 0.85,
      },
      {
        transform: `translate3d(${targetX}px, ${targetY}px, 0) scale(0.12) rotate(8deg)`,
        opacity: 0,
        offset: 1,
      },
    ],
    {
      duration,
      easing: 'cubic-bezier(0.25, 0.9, 0.3, 1)',
      fill: 'forwards',
    }
  );

  animation.onfinish = () => {
    try {
      if (flyer.parentNode) {
        flyer.parentNode.removeChild(flyer);
      }
    } catch {
      // Ignored
    }
    window.dispatchEvent(new CustomEvent('cart-item-landed'));
  };

  animation.oncancel = () => {
    try {
      if (flyer.parentNode) {
        flyer.parentNode.removeChild(flyer);
      }
    } catch {
      // Ignored
    }
  };
}
