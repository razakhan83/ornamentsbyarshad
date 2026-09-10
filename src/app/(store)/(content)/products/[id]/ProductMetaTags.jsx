'use client';

import { useServerInsertedHTML } from 'next/navigation';

export default function ProductMetaTags({
  price,
  currency,
  availability,
  ratingValue,
  ratingCount,
}) {
  useServerInsertedHTML(() => (
    <>
      <meta property="product:price:amount" content={String(price)} />
      <meta property="product:price:currency" content={currency} />
      <meta property="product:availability" content={availability} />
      <meta property="og:price:amount" content={String(price)} />
      <meta property="og:price:currency" content={currency} />
      {ratingCount > 0 ? (
        <>
          <meta property="product:rating:value" content={ratingValue} />
          <meta property="product:rating:count" content={String(ratingCount)} />
        </>
      ) : null}
    </>
  ));

  return null;
}
