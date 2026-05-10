import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://qvgscualhjlbkmqkshmb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_w9SloHM8F0EaF2UXXxxH9Q_34Nhs9AA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
