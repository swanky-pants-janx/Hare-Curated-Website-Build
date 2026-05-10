import { supabase } from '../lib/supabase-client.js';

// ── Quote Settings ────────────────────────────────────────────────────────────

export async function getQuoteSettings() {
  const { data, error } = await supabase
    .from('quote_settings')
    .select('*')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertQuoteSettings(payload) {
  // We always maintain exactly one settings row (id = 1).
  const { data, error } = await supabase
    .from('quote_settings')
    .upsert({ id: 1, ...payload }, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Pitch Decks ───────────────────────────────────────────────────────────────

export async function getPitchDecks() {
  const { data, error } = await supabase
    .from('pitch_decks')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data;
}

// ── Rule Matching ─────────────────────────────────────────────────────────────
//
// answers = { event_type: 'personal', guests: 80, budget: 25000 }
//
// Rule conditions format (stored as JSONB in pitch_deck_rules.conditions):
//   {
//     "event_type": "personal",          // exact match
//     "guests":  { "min": 0,   "max": 100   },  // range inclusive
//     "budget":  { "min": 0,   "max": 30000 }   // range inclusive
//   }
//
// All specified conditions must match. The rule with the most matching
// conditions wins (most specific match).

export async function resolvePitchDeck(answers) {
  const { data: rules, error } = await supabase
    .from('pitch_deck_rules')
    .select('*, pitch_decks(*)');
  if (error) throw error;

  let bestMatch = null;
  let bestScore = -1;

  for (const rule of rules) {
    const cond = rule.conditions ?? {};
    let score = 0;
    let mismatch = false;

    for (const [key, expected] of Object.entries(cond)) {
      const actual = answers[key];
      if (actual === undefined || actual === null) continue;

      if (typeof expected === 'object' && expected !== null) {
        // Range check
        const inRange =
          (expected.min === undefined || actual >= expected.min) &&
          (expected.max === undefined || actual <= expected.max);
        if (!inRange) { mismatch = true; break; }
        score++;
      } else {
        // Exact match
        if (String(actual) !== String(expected)) { mismatch = true; break; }
        score += 2; // exact matches score higher than range matches
      }
    }

    if (!mismatch && score > bestScore) {
      bestScore = score;
      bestMatch = rule.pitch_decks;
    }
  }

  return bestMatch;
}

// ── Inquiries ─────────────────────────────────────────────────────────────────

export async function saveInquiry(payload) {
  const { data, error } = await supabase
    .from('quote_inquiries')
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getAllInquiries() {
  const { data, error } = await supabase
    .from('quote_inquiries')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
