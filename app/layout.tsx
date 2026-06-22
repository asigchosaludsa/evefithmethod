import type { Metadata, Viewport } from 'next';
import { Archivo, Inter } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  display: 'swap',
  weight: ['500', '600', '700', '800'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'EveFit Method',
    template: '%s · EveFit Method',
  },
  description:
    'Plataforma de coaching fitness y nutricional. Tu coach, tu método, tu progreso — sabe qué hacer hoy.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_MARKETING_URL ?? 'https://evefitmethod.com'),
};

export const viewport: Viewport = {
  themeColor: '#0e1015',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${archivo.variable} ${inter.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
