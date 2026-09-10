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
                <i className="fa-solid fa-store mb-2 text-6xl text-accent drop-shadow-xl"></i>
                <h1 className="text-center text-4xl font-extrabold tracking-widest text-primary-foreground md:text-5xl">
                    CHINA <span className="text-accent">UNIQUE</span>
                    <span className="mt-2 block text-2xl font-medium tracking-normal text-primary-foreground/70 md:text-3xl">
                        ITEMS
                    </span>
                </h1>
            </div>

            <div className="absolute bottom-20 flex animate-fadeIn items-center gap-3 text-sm font-semibold uppercase tracking-widest text-primary-foreground/70" style={{ animationDelay: '0.8s' }}>
                <div className="h-2 w-2 rounded-xl bg-accent animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="h-2 w-2 rounded-xl bg-accent animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="h-2 w-2 rounded-xl bg-accent animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
        </div>
    );
}
