import { loadWebEnv } from '@adottaungatto/config';
import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import type { ReactNode } from 'react';
import { MobileBottomNav } from '../components/mobile-bottom-nav';
import { SiteFooter } from '../components/site-footer';
import { SiteHeader } from '../components/site-header';
import { ThemeProvider } from '../components/theme-provider';
import { WebQueryClientProvider } from './query-client-provider';
import { WebVitalsReporter } from './web-vitals-reporter';
import './globals.css';

const env = loadWebEnv();
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
});
const poppins = Poppins({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
});

export const metadata: Metadata = {
  title: {
    default: env.NEXT_PUBLIC_APP_NAME,
    template: `%s | ${env.NEXT_PUBLIC_APP_NAME}`,
  },
  description: "Annunci gatti in adozione, stallo e supporto con un'esperienza premium.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className={`${inter.variable} ${poppins.variable}`}>
        <ThemeProvider>
          <WebQueryClientProvider>
            <div className="relative min-h-screen overflow-x-clip">
              <SiteHeader />
              <div className="pb-24 pt-6 md:pb-8">{children}</div>
              <SiteFooter />
              <MobileBottomNav />
            </div>
            <WebVitalsReporter />
          </WebQueryClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
