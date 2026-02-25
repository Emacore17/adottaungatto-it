import { loadAdminEnv } from '@adottaungatto/config';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

const env = loadAdminEnv();

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
      <body>{children}</body>
    </html>
  );
}
