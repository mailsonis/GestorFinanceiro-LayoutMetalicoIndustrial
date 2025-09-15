
"use client"

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AddTransactionButton } from '@/components/layout/add-transaction-button';

function FabWrapper() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showFab = mounted && !loading && user && !['/login', '/register'].includes(pathname) && pathname.startsWith('/');

  if (!showFab) {
    return null;
  }

  return <AddTransactionButton />;
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* We can still have a static title in the head */}
        <title>Gestor Financeiro</title>
        <meta name="description" content="Gestor financeiro pessoal para ajudar você a controlar suas receitas e despesas." />
        <link rel="manifest" href="/manifest.json" />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap" rel="stylesheet" />
        
        {/* PWA Meta Tags */}
        <meta name="application-name" content="Gestor Financeiro" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Gestor Financeiro" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#1E2028" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#1E2028" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon-180x180.png" /> 
        {/* Ensure you have an icon at public/icons/apple-touch-icon-180x180.png */}
      </head>
      <body className="font-body antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider> 
            {children}
            <Toaster />
            <FabWrapper />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
