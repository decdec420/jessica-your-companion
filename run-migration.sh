#!/bin/bash

# Run Database Migration for Neuronaut World Features
# This script applies the migration to add real data support

echo "🚀 Running Neuronaut World Database Migration..."
echo ""

# Get the database URL from Supabase dashboard
echo "📋 Steps to run this migration:"
echo ""
echo "1. Go to https://supabase.com/dashboard/project/dniqybavmhcwxqozmguz/settings/database"
echo "2. Copy your Connection String (URI format)"
echo "3. Run the migration using psql or Supabase Dashboard SQL Editor"
echo ""
echo "Option A - Using Supabase Dashboard (Recommended):"
echo "  1. Go to https://supabase.com/dashboard/project/dniqybavmhcwxqozmguz/editor/sql"
echo "  2. Click 'New query'"
echo "  3. Copy the contents of: supabase/migrations/20251113000000_neuronaut_world_schema.sql"
echo "  4. Paste and run the query"
echo ""
echo "Option B - Using psql command line:"
echo "  psql 'YOUR_DATABASE_URL' -f supabase/migrations/20251113000000_neuronaut_world_schema.sql"
echo ""
echo "📄 Migration file location:"
echo "  $(pwd)/supabase/migrations/20251113000000_neuronaut_world_schema.sql"
echo ""
echo "✨ After running the migration, you'll have:"
echo "  - neuronaut_posts table for community posts"
echo "  - post_likes and post_replies tables"
echo "  - user_presence table for online status"
echo "  - project_files table for file storage"
echo "  - Real-time subscriptions enabled"
echo "  - Storage bucket for project files"
echo ""
