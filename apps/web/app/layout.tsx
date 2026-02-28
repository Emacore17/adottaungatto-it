import { loadWebEnv } from '@adottaungatto/config';
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { AppShell } from '../components/app-shell';
import { ThemeProvider } from '../components/theme-provider';
import './globals.css';
import { WebQueryClientProvider } from './query-client-provider';
import { WebVitalsReporter } from './web-vitals-reporter';

const env = loadWebEnv();
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});
const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: env.NEXT_PUBLIC_APP_NAME,
    template: `%s | ${env.NEXT_PUBLIC_APP_NAME}`,
  },
  description: 'Scaffold web minimale con Next.js, UI condivisa e integrazioni backend preservate.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetBrainsMono.variable}`}>
        <ThemeProvider>
          <WebQueryClientProvider>
            <AppShell>{children}</AppShell>
            <WebVitalsReporter />
          </WebQueryClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
