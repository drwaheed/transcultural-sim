/* Cloud configuration (Supabase). Leave SUPABASE_URL empty to run fully offline/local (current behaviour).
   Fill in your project's URL and **anon (public) key** — never put the service_role key here. */
window.TCS_CLOUD_CONFIG = {
  SUPABASE_URL: 'https://ukzkcakoyhbjjuwerbwa.supabase.co',            // e.g. 'https://abcdefghijkl.supabase.co'
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVremtjYWtveWhiamp1d2VyYndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0MjY5ODMsImV4cCI6MjEwODAwMjk4M30.TQw6ybVfKBsWrS7raF0czS-3tUR_DlM5Hi9-kDFlGro',       // Project Settings → API → anon public key
  EMAIL_DOMAIN: 'nur416.local',// usernames map to synthetic emails: s01 → s01@nur416.local
  REQUIRE_LOGIN: true,         // when configured, the app requires sign-in
  SYNC_INTERVAL_SEC: 20,       // background push/pull interval
  MIN_PASSWORD: 10
};
if(window.TCS_CLOUD_TEST) Object.assign(window.TCS_CLOUD_CONFIG, window.TCS_CLOUD_TEST); // test hook only
