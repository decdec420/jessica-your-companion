import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://jkvhazpvcvqhrlvfwuoy.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprdmhhenB2Y3ZxaHJsdmZ3dW95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxNDY1ODEsImV4cCI6MjA1OTcyMjU4MX0.yWaLxgb8qgIz0TLNLz7bUvCgQzQdGUqYKvNbQWHJnpk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
