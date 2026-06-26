import { createClient } from '@supabase/supabase-js';

const DEFAULT_URL = 'https://xagcalqteqxgpbcatpai.supabase.co';
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhZ2NhbHF0ZXF4Z3BiY2F0cGFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1ODMzODUsImV4cCI6MjA5NzE1OTM4NX0.tw_YPRZCAeUXL-vUMJZB8q3us_h8D27h938IY3mmTdg';

const isValidUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  const cleaned = url.trim();
  return cleaned.startsWith('http') && cleaned.includes('supabase.co');
};

const isValidKey = (key: string | null | undefined): boolean => {
  if (!key) return false;
  const cleaned = key.trim();
  return cleaned.length > 50 && cleaned.includes('.');
};

// Helper to get active keys (localStorage > env > default)
export const getSupabaseCredentials = () => {
  if (typeof window === 'undefined') {
    return { url: DEFAULT_URL, anonKey: DEFAULT_ANON_KEY };
  }
  const localUrl = localStorage.getItem('VITE_SUPABASE_URL') || '';
  const localKey = localStorage.getItem('VITE_SUPABASE_ANON_KEY') || '';

  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const url = isValidUrl(localUrl) ? localUrl.trim() : (isValidUrl(envUrl) ? envUrl.trim() : DEFAULT_URL);
  const anonKey = isValidKey(localKey) ? localKey.trim() : (isValidKey(envKey) ? envKey.trim() : DEFAULT_ANON_KEY);

  return { url, anonKey };
};

// Save credentials manually to persist across app closings
export const saveSupabaseCredentials = (url: string, anonKey: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('VITE_SUPABASE_URL', url.trim());
    localStorage.setItem('VITE_SUPABASE_ANON_KEY', anonKey.trim());
  }
};

export const isSupabaseConfigured = (): boolean => {
  const { url, anonKey } = getSupabaseCredentials();
  return isValidUrl(url) && isValidKey(anonKey);
};

// Ensure defaults are populated in localStorage for UI feedback visibility
if (typeof window !== 'undefined') {
  const currentUrl = localStorage.getItem('VITE_SUPABASE_URL');
  const currentKey = localStorage.getItem('VITE_SUPABASE_ANON_KEY');
  if (!isValidUrl(currentUrl)) {
    localStorage.setItem('VITE_SUPABASE_URL', DEFAULT_URL);
  }
  if (!isValidKey(currentKey)) {
    localStorage.setItem('VITE_SUPABASE_ANON_KEY', DEFAULT_ANON_KEY);
  }
}

const credentials = getSupabaseCredentials();

// Create client instance. Since defaults are always valid, it will never be null.
export const supabase = createClient(credentials.url, credentials.anonKey);

// Get credentials for debugging / instructional settings
export const getSupabaseConfig = () => {
  const { url, anonKey } = getSupabaseCredentials();
  return {
    url: url || '',
    anonKey: anonKey ? `${anonKey.substring(0, 15)}...` : '',
  };
};

