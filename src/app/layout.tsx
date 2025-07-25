import type { Metadata } from 'next';
import './globals.css'; // Your global CSS file
import { Toaster } from "@/components/ui/toaster";
import { AppProvider } from '@/context/AppContext';

// Import your fonts using next/font.
// For PT Sans, you'll need to import it specifically.
// You already have Inter, so let's add PT Sans correctly.
import { Inter, PT_Sans } from 'next/font/google'; // Import PTSans
import { Providers } from '../app/providers'; // Adjusted path if needed

import Preloader from '@/components/layout/preloader';
import AppContent from '@/components/layout/AppContent';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' }); // Assign to CSS variable
const ptSans = PT_Sans({ // Configure PT Sans
  weight: ['400', '700'], // Specify weights you use
  subsets: ['latin'],
  display: 'swap', // 'swap' for better performance
  variable: '--font-pt-sans', // Assign to CSS variable
});

export const metadata: Metadata = {
  title: 'Trust Wallet Loan Connect',
  description: 'Decentralized Loans Powered by Trust',
  icons: { // Use metadata.icons for favicons/app icons
    icon: 'https://trustwallet.com/assets/images/media/assets/TWT.png',
    shortcut: 'https://trustwallet.com/assets/images/media/assets/TWT.png', // Or a different icon for shortcuts
  },
  // You can add more metadata here for SEO, social sharing etc.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
          <link rel="icon" href="https://trustwallet.com/assets/images/media/assets/TWT.png" sizes="any" />
        </head>
        <body className="font-body antialiased">
        <Providers>
          <AppProvider>
            <Preloader />
            <AppContent>
              {children}
            </AppContent>
            <Toaster />
          </AppProvider>
        </Providers>
        </body>
      
    </html>
  );
}
