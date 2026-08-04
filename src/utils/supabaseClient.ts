import { createClient } from '@supabase/supabase-js';

// Supabase integration disabled by default to make the app 100% local-first.
// This file intentionally returns "not configured" so the UI flows that
// depend on Supabase won't attempt network access when no credits are available.

export const getSupabaseCredentials = () => {
  return { url: '', anonKey: '' };
};

export const saveSupabaseCredentials = (url: string, anonKey: string) => {
  // no-op in local-first mode
  if (typeof window !== 'undefined') {
    // still allow user to save keys if they wish in the future
    try {
      localStorage.setItem('VITE_SUPABASE_URL', url.trim());
      localStorage.setItem('VITE_SUPABASE_ANON_KEY', anonKey.trim());
    } catch (e) {
      // ignore
    }
  }
};

export const isSupabaseConfigured = (): boolean => {
  return false; // force local-first default
};

// Do not create a live Supabase client when running local-first.
// Export a null placeholder so existing imports don't break.
export const supabase: any = null;

export const getSupabaseConfig = () => ({ url: '', anonKey: '' });
