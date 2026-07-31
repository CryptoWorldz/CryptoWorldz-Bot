// modules/supabase.js
// Lightweight wrapper scaffold for supabase client initialization.
// This file purposely avoids initializing the client at scaffold time to prevent exposing secrets.

function createSupabaseClient(/* { url, anonKey } */) {
  // Return a stubbed interface for scaffold. Real init will use @supabase/supabase-js in later commits.
  return {
    from: () => ({ select: async () => [] }),
    // add methods as needed
  };
}

module.exports = { createSupabaseClient };
