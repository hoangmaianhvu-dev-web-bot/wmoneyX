import { createClient } from '@supabase/supabase-js';

const CONFIG = {
    SUPABASE_URL: "https://kblrdjxvsagdfjstchwp.supabase.co",
    SUPABASE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtibHJkanh2c2FnZGZqc3RjaHdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODI1OTAsImV4cCI6MjA4OTc1ODU5MH0.SA7S3BmghnpLb2lXgpfU1aZ--1nFUAWEx6Tyr2iOGm4"
};

// Helper to get env variables
const getEnv = (key: string) => {
  if (typeof process !== 'undefined' && process.env) {
    if (process.env[key]) return process.env[key];
    if (process.env[`VITE_${key}`]) return process.env[`VITE_${key}`];
  }
  
  // Try to access import.meta.env safely
  const meta = (import.meta as any);
  if (meta && meta.env) {
    if (meta.env[key]) return meta.env[key];
    if (meta.env[`VITE_${key}`]) return meta.env[`VITE_${key}`];
  }
  return null;
};

let supabaseUrl = getEnv('SUPABASE_URL') || CONFIG.SUPABASE_URL;
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY') || CONFIG.SUPABASE_KEY;

if (supabaseUrl && !supabaseUrl.startsWith('http')) {
  supabaseUrl = `https://${supabaseUrl}`;
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing.');
}

export const supabase = createClient(
  supabaseUrl || 'https://missing-url.supabase.co', 
  supabaseAnonKey || 'missing-key'
);
