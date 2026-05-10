import { supabase } from '../lib/supabase-client.js';

// Public: fetch all published posts (newest first).
export async function getPublishedBlogs() {
  const { data, error } = await supabase
    .from('blogs')
    .select('id, title, slug, excerpt, cover_image_url, published_at')
    .eq('published', true)
    .order('published_at', { ascending: false });
  if (error) throw error;
  return data;
}

// Public: fetch a single published post by slug.
export async function getBlogBySlug(slug) {
  const { data, error } = await supabase
    .from('blogs')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single();
  if (error) throw error;
  return data;
}

// Admin: fetch all posts including drafts.
export async function getAllBlogs() {
  const { data, error } = await supabase
    .from('blogs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createBlog(payload) {
  const { data, error } = await supabase
    .from('blogs')
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBlog(id, payload) {
  const { data, error } = await supabase
    .from('blogs')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBlog(id) {
  const { error } = await supabase.from('blogs').delete().eq('id', id);
  if (error) throw error;
}

export async function toggleBlogPublished(id, currentState) {
  const published = !currentState;
  const payload = {
    published,
    published_at: published ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('blogs')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
