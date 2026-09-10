import '@/styles/design-system.css';
import '@/styles/mobile-app.css';
import '@/styles/admin.css';
import '@/styles/animations.css';
import FloatingFeedbackMenu from '@/components/customer/FloatingFeedbackMenu';
import GlobalFlyingCart from '@/components/customer/GlobalFlyingCart';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#FAF8F5',
};

export const metadata = {
  title: 'M&M Artsy — Handmade & Custom Creations',
  description: 'Order handcrafted bouquets, crochet, resin and custom gifts from M&M Artsy. Made just for you.',
  keywords: ['m&m artsy', 'handmade', 'custom bouquet', 'crochet', 'resin', 'artisan gifts'],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/images/m&m_favicon.png', type: 'image/png' },
    ],
    shortcut: '/images/m&m_favicon.png',
    apple: '/images/m&m_favicon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'M&M Artsy',
  },
  openGraph: {
    title: 'M&M Artsy — Handmade & Custom Creations',
    description: 'Order handcrafted bouquets, crochet, resin and custom gifts from M&M Artsy.',
    type: 'website',
    images: ['/images/m&m_favicon.png'],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="icon" type="image/png" href="/images/m&m_favicon.png" />
        <link rel="shortcut icon" href="/images/m&m_favicon.png" />
        <link rel="apple-touch-icon" href="/images/m&m_favicon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Alex+Brush&family=Montserrat:wght@400;500;600;700;800&family=Outfit:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        {children}
        <FloatingFeedbackMenu />
        <GlobalFlyingCart />
      </body>
    </html>
  );
}
