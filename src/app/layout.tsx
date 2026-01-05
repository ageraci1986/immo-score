import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/components/providers/query-provider';
import { ToasterProvider } from '@/components/providers/toaster-provider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Immo-Score - Analyse Immobilière Intelligente',
  description:
    'Automatisez l\'évaluation de biens immobiliers avec l\'IA - Analyse de photos, calculs de rentabilité, scoring intelligent',
  keywords: ['immobilier', 'investissement', 'IA', 'rentabilité', 'analyse'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): JSX.Element {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <QueryProvider>
          {children}
          <ToasterProvider />
        </QueryProvider>
      </body>
    </html>
  );
}
