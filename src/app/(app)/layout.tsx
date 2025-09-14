
"use client"; // Required for useEffect and useRouter

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';


export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-6">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }
  
  if (!user) {
    // This state should ideally be brief due to the redirect,
    // but it's a fallback.
    return null; 
  }

  return (
    <div className={cn("flex flex-col min-h-screen")}>
      <main className="flex-grow px-4 md:px-6 pt-4 pb-6">
        {children}
      </main>
      <footer className="text-center text-xs text-muted-foreground py-4 md:py-2 print:hidden">
        {currentYear && `© ${currentYear} Idealizado Por Mailson R.G. Desenvolvido Com IA`}
      </footer>
    </div>
  );
}
