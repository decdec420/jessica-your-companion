// Quick test to check if migration tables exist
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dniqybavmhcwxqozmguz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuaXF5YmF2bWhjd3hxb3ptZ3V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3Mjk3NTEsImV4cCI6MjA3NTMwNTc1MX0.w2yIZPCjk2IBR7iYSlYVaoTOWKf5kGErA9jGnyRzdCM'
);

console.log('🔍 Checking if migration tables exist...\n');

async function checkTables() {
  const tables = ['neuronaut_posts', 'post_likes', 'post_replies', 'user_presence', 'project_files'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ ${table}: NOT FOUND (${error.message})`);
      } else {
        console.log(`✅ ${table}: EXISTS`);
      }
    } catch (e) {
      console.log(`❌ ${table}: ERROR - ${e.message}`);
    }
  }
  
  console.log('\n🎯 Summary:');
  console.log('If you see ❌ errors above, you need to run the migration.');
  console.log('If you see ✅ for all tables, the migration is already applied!');
  console.log('\nTo run migration: Open https://supabase.com/dashboard/project/dniqybavmhcwxqozmguz/editor');
}

checkTables();
