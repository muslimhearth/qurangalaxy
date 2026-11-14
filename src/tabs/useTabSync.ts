import { useEffect } from 'react';
import { connectTabs } from './connect';

/**
 * Keeps the tabs and the shared store in sync while mounted. Call it before `useHashSync`,
 * so a restored tab is in the store first and a deep link then replaces its root.
 */
export function useTabSync() {
  useEffect(() => connectTabs(), []);
}
