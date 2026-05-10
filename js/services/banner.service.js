import { supabase } from '../lib/supabase-client.js';

export async function getActiveBanners() {
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}

export async function getAllBanners() {
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createBanner(payload) {
  const { data, error } = await supabase
    .from('banners')
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBanner(id, payload) {
  const { data, error } = await supabase
    .from('banners')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBanner(id) {
  const { error } = await supabase.from('banners').delete().eq('id', id);
  if (error) throw error;
}

export async function toggleBannerActive(id, currentState) {
  const { data, error } = await supabase
    .from('banners')
    .update({ active: !currentState, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
