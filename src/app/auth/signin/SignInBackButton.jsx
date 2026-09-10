'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Suspense } from 'react';

function SignInBackButtonContent({ className, iconClassName = 'size-4', text = 'Back' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl');

  const handleClick = (e) => {
    e.preventDefault();
    if (callbackUrl) {
      router.push(callbackUrl);
    } else {
      router.back();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className || "group inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"}
    >
      <ArrowLeft className={iconClassName} />
      {text ? <span>{text}</span> : null}
    </button>
  );
}

export default function SignInBackButton(props) {
  return (
    <Suspense fallback={
      <Link href="/" className={props.className || "group inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"}>
        <ArrowLeft className={props.iconClassName || "size-4"} />
        {props.text ? <span>{props.text}</span> : null}
      </Link>
    }>
      <SignInBackButtonContent {...props} />
    </Suspense>
  );
}
