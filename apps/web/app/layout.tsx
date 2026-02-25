import { loadWebEnv } from '@adottaungatto/config';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

const env = loadWebEnv();

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
      <body>{children}</body>
    </html>
  );
}
