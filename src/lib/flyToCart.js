/**
 * Cart notification and bounce trigger
 * Triggers navbar reveal and cart badge bounce animation when adding an item.
 */

export function flyToCart() {
  if (typeof window === 'undefined') return;

  // Immediately notify navbar to reveal if hidden on scroll
  window.dispatchEvent(new CustomEvent('reveal-navbar'));

  // Trigger cart bounce animation
  window.dispatchEvent(new CustomEvent('cart-item-landed'));
}
