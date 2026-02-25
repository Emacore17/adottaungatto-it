import { loadWebEnv } from '@adottaungatto/config';
import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import { WebQueryClientProvider } from './query-client-provider';
import { WebVitalsReporter } from './web-vitals-reporter';
import './globals.css';

const env = loadWebEnv();
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-web',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: `${env.NEXT_PUBLIC_APP_NAME} | Web`,
  description: 'Piattaforma web pubblica per adottaungatto-it',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="it">
      <body className={plusJakarta.variable}>
        <WebQueryClientProvider>
          {children}
          <WebVitalsReporter />
        </WebQueryClientProvider>
      </body>
    </html>
  );
}
