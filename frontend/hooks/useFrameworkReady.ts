import { useEffect } from 'react';

export function useFrameworkReady() {
  useEffect(() => {
    const frameworkGlobal = globalThis as typeof globalThis & {
      frameworkReady?: () => void;
    };

    frameworkGlobal.frameworkReady?.();
  }, []);
}
