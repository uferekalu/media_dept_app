'use client';

import { Provider } from 'react-redux';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { store } from '@/lib/redux/store';
import { AppHeader } from '@/components/app-header';
import { AppNav } from '@/components/app-nav';
import { MobileNavDrawer } from '@/components/mobile-nav-drawer';
import { AuthHydrator } from '@/components/auth-hydrator';

// Central place to wrap the app in client-side providers: theming, Redux store,
// toast notifications, and anything else added later. No route-enforcement guard yet
// (every screen still works without a session) — that's the final PR of Phase 7, once
// the backend's @Roles() guards land too, mirroring protocol_dept_app's own staging.
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <Provider store={store}>
        <AuthHydrator />
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
