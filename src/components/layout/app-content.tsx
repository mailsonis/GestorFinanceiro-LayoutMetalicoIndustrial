
"use client";

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from "@/context/AuthContext";
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

export function AppContent({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <FabWrapper />
    </>
  );
}
