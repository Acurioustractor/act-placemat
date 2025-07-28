import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Use dummy values if not configured - the local blog system works without Supabase
const defaultUrl = 'https://placeholder.supabase.co'
const defaultKey = 'placeholder-key'

const finalUrl = (supabaseUrl && supabaseUrl !== 'your_supabase_project_url') ? supabaseUrl : defaultUrl
const finalKey = (supabaseAnonKey && supabaseAnonKey !== 'your_anon_key_here') ? supabaseAnonKey : defaultKey

export const supabase = createClient(finalUrl, finalKey)

// Type definitions for blog posts
export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  featured_image_url?: string
  blog_category: string
  tags: string[]
  status: string
  published_at: string
  featured: boolean
  author_name: string
  author_role: string
  view_count: number
  reading_time_minutes: number
  created_at: string
  updated_at: string
}