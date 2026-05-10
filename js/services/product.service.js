import { supabase } from '../lib/supabase-client.js';

export async function getVisibleProducts(category = null) {
  let query = supabase
    .from('products')
    .select('id, name, slug, description, price_from, category, cover_image_url')
    .eq('visible', true)
    .order('created_at', { ascending: false });
  if (category) query = query.eq('category', category);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getProductCategories() {
  const { data, error } = await supabase
    .from('products')
    .select('category')
    .eq('visible', true)
    .not('category', 'is', null);
  if (error) throw error;
  const unique = [...new Set(data.map((r) => r.category).filter(Boolean))].sort();
  return unique;
}

export async function getProductBySlug(slug) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('visible', true)
    .single();
  if (error) throw error;
  return data;
}

export async function getAllProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createProduct(payload) {
  const { data, error } = await supabase
    .from('products')
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProduct(id, payload) {
  const { data, error } = await supabase
    .from('products')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProduct(id) {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

export async function toggleProductVisibility(id, currentState) {
  const { data, error } = await supabase
    .from('products')
    .update({ visible: !currentState, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
