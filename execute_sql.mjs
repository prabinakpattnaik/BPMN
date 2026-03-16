import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://omehqnioxdvffxfseedk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tZWhxbmlveGR2ZmZ4ZnNlZWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1Nzg1MDIsImV4cCI6MjA4NTE1NDUwMn0.k2cEbEQKSXqw_qjPw77oYvN-9BdZBEFMT8fWvIoJLgQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.rpc('execute_sql', { sql: `
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_hierarchy_level_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_hierarchy_level_check CHECK (hierarchy_level BETWEEN 0 AND 4);
    
    ALTER TABLE public.workflows DROP CONSTRAINT IF EXISTS workflows_hierarchy_level_check;
    ALTER TABLE public.workflows ADD CONSTRAINT workflows_hierarchy_level_check CHECK (hierarchy_level BETWEEN 0 AND 4);
  `});
  console.log(error || 'Success');
}

check();
