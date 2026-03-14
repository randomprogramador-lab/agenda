import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANNON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANNON_KEY en .env')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
