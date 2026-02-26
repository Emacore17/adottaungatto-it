import { loadAdminEnv } from '@adottaungatto/config';
import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import type { ReactNode } from 'react';
import { ThemeProvider } from '../components/theme-provider';
import { AdminQueryClientProvider } from './query-client-provider';
import { AdminWebVitalsReporter } from './web-vitals-reporter';
import './globals.css';

const env = loadAdminEnv();
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-admin-sans',
  weight: ['400', '500', '600', '700'],
});
const poppins = Poppins({
  subsets: ['latin'],
  variable: '--font-admin-display',
  weight: ['500', '600', '700'],
});

export const metadata: Metadata = {
  title: {
    default: `${env.NEXT_PUBLIC_APP_NAME} Admin`,
    template: `%s | ${env.NEXT_PUBLIC_APP_NAME} Admin`,
  },
  description: 'Pannello admin e moderazione di adottaungatto-it',
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
          <AdminQueryClientProvider>
            {children}
            <AdminWebVitalsReporter />
          </AdminQueryClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
