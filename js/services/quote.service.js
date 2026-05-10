import { supabase } from '../lib/supabase-client.js';

// Fetch all pitch deck PDFs available for admin to map to questionnaire outcomes.
export async function getPitchDecks() {
  const { data, error } = await supabase
    .from('pitch_decks')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data;
}

// Resolve a set of questionnaire answers to the correct pitch deck.
export async function resolvePitchDeck(answers) {
  // answers is an object like { service_type: 'events', scale: 'large', ... }
  // The admin maps outcomes via the pitch_deck_rules table.
  // We fetch all rules and find the best match (most matching conditions).
  const { data: rules, error } = await supabase
    .from('pitch_deck_rules')
    .select('*, pitch_decks(*)');
  if (error) throw error;

  let bestMatch = null;
  let bestScore = -1;

  for (const rule of rules) {
    const conditions = rule.conditions ?? {};
    let score = 0;
    let mismatch = false;

    for (const [key, value] of Object.entries(conditions)) {
      if (answers[key] === undefined) continue;
      if (answers[key] === value) {
        score++;
      } else {
        mismatch = true;
        break;
      }
    }

    if (!mismatch && score > bestScore) {
      bestScore = score;
      bestMatch = rule.pitch_decks;
    }
  }

  return bestMatch;
}

// Save the visitor inquiry to the database.
export async function saveInquiry(payload) {
  const { data, error } = await supabase
    .from('quote_inquiries')
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Admin: fetch all inquiries.
export async function getAllInquiries() {
  const { data, error } = await supabase
    .from('quote_inquiries')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
