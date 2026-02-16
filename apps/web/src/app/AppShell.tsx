'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { useAppStore } from '@/stores/app.store';

const authPages = ['/login', '/register', '/onboarding'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated } = useAppStore();
  const isAuthPage = authPages.includes(pathname);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const showChrome = mounted && isAuthenticated && !isAuthPage;

  return (
    <>
      {showChrome && <Navbar />}
      <div className="flex">
        {showChrome && <Sidebar />}
        <main className={`flex-1 min-h-screen ${showChrome ? 'pt-14 lg:pl-56 pb-20 lg:pb-4' : ''}`}>
          <div className="max-w-[1440px] mx-auto p-4">
            {children}
          </div>
        </main>
      </div>
      {showChrome && <BottomNav />}
    </>
  );
}
