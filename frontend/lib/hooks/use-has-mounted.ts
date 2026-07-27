import { useEffect, useState } from 'react';

// Avoids an SSR/client hydration mismatch for anything that must read
// browser-only state (theme, localStorage) before rendering its real output.
export function useHasMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
