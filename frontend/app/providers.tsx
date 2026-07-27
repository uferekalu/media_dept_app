'use client';

import { Provider } from 'react-redux';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { store } from '@/lib/redux/store';
import { AppHeader } from '@/components/app-header';
import { AppNav } from '@/components/app-nav';
import { MobileNavDrawer } from '@/components/mobile-nav-drawer';

// Central place to wrap the app in client-side providers: theming, Redux store,
// toast notifications, and anything else added later. No AuthGuard yet — Phase 7
// adds one, mirroring protocol_dept_app's own Phase 5 (nav/header shipped unguarded
// first, guards retrofitted once login existed).
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <Provider store={store}>
        <AppHeader />
        <AppNav />
        <MobileNavDrawer />
        {/* Reserves exactly the collapsed MobileNavDrawer's width below `sm`, so it
            always sits side-by-side with content, never covering it. */}
        <div className="pl-14 sm:pl-0">{children}</div>
        <Toaster richColors position="top-right" />
      </Provider>
    </ThemeProvider>
  );
}
