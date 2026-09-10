import { Suspense } from "react";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { getMetadataBase, getSiteUrl } from "@/lib/siteUrl";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE_DEFAULT } from "@/lib/siteSeo";
import AuthProvider from "@/components/AuthProvider";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import VisitorTracker from "@/components/VisitorTracker";

const fontSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const fontSerif = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const socialPreviewAlt = 'Ornaments by Arshad - Timeless Luxury & Handcrafted Elegance';

export const metadata = {
  metadataBase: getMetadataBase(),
  applicationName: SITE_NAME,
  title: {
    default: SITE_TITLE_DEFAULT,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'Ornaments by Arshad',
    'Luxury Jewelry Pakistan',
    'Diamond Rings',
    'Gold Necklaces 22K',
    'Bridal Jewelry Sets',
    'Handcrafted Bangles',
    'Fine Jewelry Store',
    'Gold Earrings',
    'Custom Jewelry',
  ],
  authors: [{ name: 'Ornaments by Arshad', url: getSiteUrl() }],
  creator: 'Ornaments by Arshad',
  publisher: 'Ornaments by Arshad',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/favicon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/favicon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: SITE_TITLE_DEFAULT,
    description: SITE_DESCRIPTION,
    type: 'website',
    url: getSiteUrl(),
    siteName: 'Ornaments by Arshad',
    locale: 'en_PK',
    images: [
      {
        url: `${getSiteUrl()}/opengraph-image.png`,
        secureUrl: `${getSiteUrl()}/opengraph-image.png`,
        width: 1200,
        height: 630,
        type: 'image/png',
        alt: socialPreviewAlt,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE_DEFAULT,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: `${getSiteUrl()}/opengraph-image.png`,
        width: 1200,
        height: 630,
        alt: socialPreviewAlt,
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#a67c52',
};

export default function RootLayout({ children }) {
  const siteUrl = getSiteUrl();
  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'JewelryStore',
        '@id': `${siteUrl}/#organization`,
        name: SITE_NAME,
        url: siteUrl,
        logo: `${siteUrl}/favicon-192.png`,
        description: SITE_DESCRIPTION,
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'PK',
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: siteUrl,
        name: 'Ornaments by Arshad',
        publisher: {
          '@id': `${siteUrl}/#organization`,
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: `${siteUrl}/products?search={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  return (
    <html lang="en" className="bg-background" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${fontSans.variable} ${fontSerif.variable} font-sans bg-background text-foreground antialiased`} suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <AuthProvider>
          {children}
          <VisitorTracker />
          <Toaster position="bottom-center" richColors />
          <ServiceWorkerRegister />
        </AuthProvider>
      </body>
    </html>
  );
}
