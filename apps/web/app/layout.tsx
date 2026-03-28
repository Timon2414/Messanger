import './globals.css';
import type { Metadata } from 'next';
import { SWRegister } from '../components/sw-register';

export const metadata: Metadata = {
  title: 'Dasheu Chat',
  description: 'Self-hosted messenger',
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <SWRegister />
        {children}
      </body>
    </html>
  );
}
