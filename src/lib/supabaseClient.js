import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// Aceptar nombre estándar (ANON) y el typo antiguo (ANNON) para no romper .env existentes
const supabaseAnonKey =
	import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANNON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error(
		'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY (clave pública anon) en .env',
	)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
