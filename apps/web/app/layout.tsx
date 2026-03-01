import { loadWebEnv } from '@adottaungatto/config';
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Poppins } from 'next/font/google';
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
const poppins = Poppins({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
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
  description:
    'Annunci di gatti in adozione, stallo e segnalazione in tutta Italia con ricerca per citta, razza, prezzo e localita.',
  keywords: [
    'adozione gatti',
    'annunci gatti',
    'gattini in adozione',
    'adozione gatti italia',
    'stallo gatti',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className={`${inter.variable} ${poppins.variable} ${jetBrainsMono.variable}`}>
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
