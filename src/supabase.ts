import { createClient } from '@supabase/supabase-js';

const CONFIG = {
    SUPABASE_URL: "https://kblrdjxvsagdfjstchwp.supabase.co",
    SUPABASE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtibHJkanh2c2FnZGZqc3RjaHdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODI1OTAsImV4cCI6MjA4OTc1ODU5MH0.SA7S3BmghnpLb2lXgpfU1aZ--1nFUAWEx6Tyr2iOGm4"
};

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || CONFIG.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || CONFIG.SUPABASE_KEY;

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
