import { createClient } from '@supabase/supabase-js';

// Supabase client initialized with user-provided credentials.
const supabaseUrl = 'https://ajmbuebevhkaxrhkvuwp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqbWJ1ZWJldmhrYXhyaGt2dXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNjg0ODEsImV4cCI6MjA3Nzg0NDQ4MX0.q7VAEZNPg354VaUKPSyCPjvlDxGWqxhrn8TLejBASuM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);