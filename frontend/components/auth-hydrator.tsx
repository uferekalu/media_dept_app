'use client';

import { useEffect } from 'react';
import { useAppDispatch } from '@/lib/redux/hooks';
import { AUTH_TOKEN_STORAGE_KEY, setToken } from '@/lib/redux/slices/authSlice';

// Reads the persisted JWT from localStorage on mount and puts it into Redux — the
// read side of what the login page's onSubmit writes. Renders nothing; lives in
// app/providers.tsx above the header so the session is hydrated before anything else
// asks "who's logged in" (see lib/hooks/use-current-user.ts). No redirect/route
// enforcement here — every screen still works without a session, same as before this
// PR; that's the final PR of Phase 7, once guards land on the backend too.
export function AuthHydrator() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const stored = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (stored) dispatch(setToken(stored));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
