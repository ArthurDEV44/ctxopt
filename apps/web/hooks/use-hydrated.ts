import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

/**
 * Hook to detect client-side hydration without triggering re-render cascades.
 * Returns `true` once the component is mounted on the client, `false` during SSR.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
