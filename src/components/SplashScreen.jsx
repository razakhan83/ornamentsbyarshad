'use client';

import { useEffect } from 'react';

export default function SplashScreen({ onComplete }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            if (onComplete) onComplete();
        }, 2000);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-primary animate-fadeIn">
            <div className="flex flex-col items-center gap-4 animate-fadeInUp">
                <h1 className="text-center font-serif text-3xl font-bold tracking-[0.2em] text-primary-foreground md:text-4xl uppercase">
                    ORNAMENTS <span className="text-[#A67C52]">BY ARSHAD</span>
                    <span className="mt-2 block font-sans text-xs font-medium tracking-[0.3em] text-primary-foreground/70 md:text-sm">
                        FINE JEWELRY & HAUTE JOAILLERIE
                    </span>
                </h1>
            </div>

            <div className="absolute bottom-20 flex animate-fadeIn items-center gap-3 text-sm font-semibold uppercase tracking-widest text-primary-foreground/70" style={{ animationDelay: '0.8s' }}>
                <div className="h-2 w-2 rounded-sm bg-accent animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="h-2 w-2 rounded-sm bg-accent animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="h-2 w-2 rounded-sm bg-accent animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
        </div>
    );
}
