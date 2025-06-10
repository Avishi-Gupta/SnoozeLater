import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gfcnhjvmizcoxxreyife.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmY25oanZtaXpjb3h4cmV5aWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2MjYzODIsImV4cCI6MjA2NDIwMjM4Mn0.uaezuSpGlf6HRzfZqEp9gvh0cdAbs70B5SyTJZeTSI4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
