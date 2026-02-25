import { loadAdminEnv } from '@adottaungatto/config';
import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import type { ReactNode } from 'react';
import { AdminQueryClientProvider } from './query-client-provider';
import { AdminWebVitalsReporter } from './web-vitals-reporter';
import './globals.css';

const env = loadAdminEnv();
const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-admin',
  weight: ['500', '600', '700'],
});

export const metadata: Metadata = {
  title: `${env.NEXT_PUBLIC_APP_NAME} | Admin`,
  description: 'Pannello admin e moderazione di adottaungatto-it',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="it">
      <body className={manrope.variable}>
        <AdminQueryClientProvider>
          {children}
          <AdminWebVitalsReporter />
        </AdminQueryClientProvider>
      </body>
    </html>
  );
}
