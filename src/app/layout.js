import '@/styles/design-system.css';
import '@/styles/mobile-app.css';
import '@/styles/admin.css';
import '@/styles/animations.css';
import GlobalFlyingCart from '@/components/customer/GlobalFlyingCart';
import GlobalLoadingScreen from '@/components/common/GlobalLoadingScreen';
import GameFloatingBadge from '@/components/customer/GameFloatingBadge';
import GlobalToast from '@/components/common/GlobalToast';
import QuickOptionModal from '@/components/customer/QuickOptionModal';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#FAF8F5',
};

export const metadata = {
  title: {
    default: "M&M's Artsy | Handcrafted Flowers & Custom Gifts",
    template: "%s | M&M's Artsy",
  },
  description: 'Turning sweet thoughts into timeless gifts. Order handcrafted bouquets and handmade artisan products from M&M\'s Artsy.',
  keywords: ['m&m artsy', 'handmade', 'custom bouquet', 'handmade products', 'floral arrangement', 'artisan gifts', 'everlasting bouquets'],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/images/m&m_favicon.png?v=2', type: 'image/png' },
      { url: '/favicon.ico?v=2', sizes: 'any' },
      { url: '/icon.png?v=2', type: 'image/png' },
    ],
    shortcut: '/favicon.ico?v=2',
    apple: [
      { url: '/apple-touch-icon.png?v=2', sizes: '180x180', type: 'image/png' },
      { url: '/images/m&m_favicon.png?v=2' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: "M&M's Artsy",
  },
  openGraph: {
    title: "M&M's Artsy | Handcrafted Flowers & Custom Gifts",
    description: 'Turning sweet thoughts into timeless gifts. Order handcrafted bouquets and handmade artisan products from M&M\'s Artsy.',
    type: 'website',
    images: ['/images/m&m_favicon.png?v=2'],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" href="/images/m&m_favicon.png?v=2" />
        <link rel="icon" href="/favicon.ico?v=2" sizes="any" />
        <link rel="shortcut icon" href="/images/m&m_favicon.png?v=2" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2" />
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
      <body suppressHydrationWarning>
        <GlobalLoadingScreen />
        {children}
        <GameFloatingBadge />
        <GlobalFlyingCart />
        <GlobalToast />
        <QuickOptionModal />
      </body>
    </html>
  );
}
