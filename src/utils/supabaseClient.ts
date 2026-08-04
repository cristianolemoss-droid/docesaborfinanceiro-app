import { createClient } from '@supabase/supabase-js';

// Supabase client for STORAGE (images) only.
// The app remains local-first (IndexedDB) for all structured data.
// Supabase is used optionally to upload images to a storage bucket and
// return public URLs. If no credentials are configured, functions
// will gracefully report that storage is unavailable and callers
// should fallback to local base64 storage.

const STORAGE_BUCKET = 'product-images'; // adjust to your bucket name in Supabase

export const getSupabaseCredentials = () => {
  if (typeof window === 'undefined') return { url: '', anonKey: '' };
  const url = (localStorage.getItem('VITE_SUPABASE_URL') || '').trim();
  const anonKey = (localStorage.getItem('VITE_SUPABASE_ANON_KEY') || '').trim();
  return { url, anonKey };
};

export const saveSupabaseCredentials = (url: string, anonKey: string) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('VITE_SUPABASE_URL', url.trim());
    localStorage.setItem('VITE_SUPABASE_ANON_KEY', anonKey.trim());
  } catch (e) {
    console.warn('[supabaseClient] Could not save credentials to localStorage', e);
  }
};

const creds = getSupabaseCredentials();

export const isSupabaseConfigured = (): boolean => {
  return !!(creds.url && creds.anonKey);
};

export const getSupabaseConfig = () => ({ url: creds.url || '', anonKey: creds.anonKey || '' });

export const supabase = (isSupabaseConfigured() && typeof window !== 'undefined')
  ? createClient(creds.url, creds.anonKey)
  : null;

export const getStorageBucketName = () => STORAGE_BUCKET;
