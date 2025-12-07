
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { AuthProvider } from "@/context/AuthContext";
import { AppContent } from '@/components/layout/app-content';

export const metadata: Metadata = {
  title: 'Gestor Financeiro',
  description: 'Gestor financeiro pessoal para ajudar você a controlar suas receitas e despesas.',
  manifest: '/manifest.json',
  applicationName: 'Gestor Financeiro',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Gestor Financeiro',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'msapplication-TileColor': '#1E2028',
    'msapplication-tap-highlight': 'no',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap" rel="stylesheet" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon-180x180.png" />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <AppContent>
              {children}
            </AppContent>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
