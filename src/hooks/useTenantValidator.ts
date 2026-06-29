import { useEffect } from 'react';
import { getActiveTenantId } from '../utils/supabaseDb';

/**
 * Hook to validate if the active tenant ID in localStorage
 * corresponds to the data currently loaded in state.
 */
export const useTenantValidator = (
  currentLoadedId: string | null,
  onMismatch: () => void
) => {
  useEffect(() => {
    const activeTenant = getActiveTenantId();
    if (currentLoadedId !== null && activeTenant !== currentLoadedId) {
      console.warn(`Tenant mismatch detected! Expected: ${activeTenant}, Got: ${currentLoadedId}. Triggering re-fetch.`);
      onMismatch();
    }
  }); // Run on every render
};
