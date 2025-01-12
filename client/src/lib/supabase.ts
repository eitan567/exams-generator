import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://msoqrefrotmaaocezgcn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zb3FyZWZyb3RtYWFvY2V6Z2NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY2NjAzOTYsImV4cCI6MjA1MjIzNjM5Nn0.d3e5A8WeFjsoW7DKkplmymiu67XAtcZMu78dSOPlxmI';

export const supabase = createClient(supabaseUrl, supabaseKey);
